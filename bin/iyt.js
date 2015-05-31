#!/usr/bin/env node

var program = require('commander');
var request = require('request');
var Combinatorics = require('js-combinatorics');
var async = require('async');
var util = require('util');
var cheerio = require('cheerio');
var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var chalk = require('chalk');
var log = require('../lib/log');
var parseDir = require('../lib/directory');
var auth = require('../lib/auth');
var parallel = require('../lib/parallel');

var baseUrl = 'http://itsyourturn.com'
var gamePath = '/pp?complgame&userid=%s&gametype=%s&tn=%s&wl=%s';

// cartesianProduct(gameTypes, tournament, winloss)
/*
 * gameTypes
 *    1: Chess Level 1
 *    53: Intermediate Chess
 *    60: Chess Level 2
 *    67: Chess Level 3
 * tournament
 *    0: regular games
 *    1: tournament games
 *    2: ladder games
 * winloss
 *    0: win
 *    1: loss
 *    2: draw
 *
 * st = start (e.g. page)
 */
var product = Combinatorics.cartesianProduct([ '1', '60', '67', '53' ], [ '0', '1', '2' ], [ '0', '1', '2' ]).toArray();
var gameTypes = {
  '1': 'Chess',
  '60': 'Chess Level 2',
  '67': 'Chess Level 3',
  '53': 'Intermediate Chess'
};
var tournament = {
  '0': 'Regular',
  '1': 'Tournament',
  '2': 'Ladder'
};
var winloss = {
  '0': 'wins',
  '1': 'losses',
  '2': 'draws'
};

program.version(require('../package').version)
  .option('-u, --username <user>', 'itsyourturn.com username')
  .option('-p, --password <pass>', 'itsyourturn.com password')
  .option('-d, --directory <dir>', 'Directory to save pgns in')
  .parse(process.argv);

var dir = parseDir(program.directory);
console.log();
log('Using directory', chalk.cyan(dir), 'as destination');
log('Authenticating', program.username);

auth.login(program.username, program.password, function(err, response, body) {
  if (err) {
    console.log(err);
    process.exit();
  }
  var cookie = response.headers['set-cookie'][0];
  var userid = cookie.match(/USERID=(\d+)O/)[1];
  var jar = request.jar();
  jar.setCookie(request.cookie(cookie.split(';')[0]), baseUrl);
  request = request.defaults({ jar: jar });
  log('Finding games for user', chalk.yellow(userid));
  async.parallel([ parallel.profile(userid, 0), parallel.profile(userid, 1), parallel.profile(userid, 2)], function(err, results) {
    if (err) {
      console.log(err);
      process.exit();
    }

    var getCount = function(url) {
      // Try the regular game page
      var link = results[0]('a[href="' + url + '"]');
      // If didn't find a link matching the url, try the tournament page
      if (!link.length) {
        link = results[1]('a[href="' + url + '"]');
      }
      // If we still don't have a link, try the ladder page
      if (!link.length) {
        link = results[2]('a[href="' + url + '"]');
      }
      // We've tried them all. This means no games of this type have been played.
      if (!link.length) {
        return 0;
      }
      return Math.floor(Number(link.text()) / 100);
    };

    var buildFunc = function(url) {
      return function(next) {
        request.get(url, function(err, response, body) {
          if (err) {
            return next(err);
          }
          var $ = cheerio.load(body);
          var links = $('a[href^="/iyt.dll?a?s=7&g="]');
          var gameIds = _.map(links, function(el) {
            return el.attribs.href.split('&')[1].split('=')[1];
          });
          next(null, gameIds);
        });
      }
    };

    var funcs = _.reduce(product, function(memo, combo) {
      var url = util.format.apply(util, [gamePath, userid].concat(combo)); 
      var count = getCount(url);
      memo.push(buildFunc(baseUrl + url));
      if (count > 0) {
        _.each(_.range(count), function(num) {
          memo.push(buildFunc(baseUrl + url + '&s='  + (num * 100).toString()));
        });
      }
      return memo;
    }, []);
    async.parallel(funcs, function(err, games) {
      var buildPgnFunc = function(game) {
        return function(next) {
          request.get(baseUrl + '/iyt.dll?viewpgn?game=' + game, function(err, response, body) {
            next(err, { game: cheerio.load(body), id: game });
          });
        };
      };
      var pgnFuncs = _.reduce(_.flatten(games), function(memo, game) {
        memo.push(buildPgnFunc(game));
        return memo;
      }, []);
      async.parallel(pgnFuncs, function(err, results) {
        async.each(results, function(result, next) {
          var pgn = result.game('pre').text();
          if (pgn) {
            fs.outputFile(dir + '/iyt-' + result.id + '.pgn', pgn, next);
          } else {
            next(null);
          }
        }, function(err) {
          
        });
      });
    });
  });
});
