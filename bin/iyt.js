#!/usr/bin/env node

var program = require('commander');
var request = require('request');
var Combinatorics = require('js-combinatorics');
var async = require('async');
var util = require('util');
var cheerio = require('cheerio');
var _ = require('lodash');

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

program.version(require('../package').version)
  .option('-u, --username <user>', 'itsyourturn.com username')
  .option('-p, --password <pass>', 'itsyourturn.com password')
  .option('-d, --directory <dir>', 'Directory to save pgns in')
  .parse(process.argv);

request.post('http://itsyourturn.com/iyt.dll/loginverify', {
  form: {
    login: program.username,
    passwd: program.password,
    enter: 'Log in',
    url: 'status?'
  }
}, function(err, response, body) {
  if (err) {
    console.log(err);
    process.exit();
  }
  var cookie = response.headers['set-cookie'][0];
  var userid = cookie.match(/USERID=(\d+)O/)[1];
  var jar = request.jar();
  jar.setCookie(request.cookie(cookie.split(';')[0]), baseUrl);
  request = request.defaults({ jar: jar });
  async.parallel([
    function(next) {
      request.get('http://itsyourturn.com/iyt.dll?userprofile?userid=' + userid + '&proftype=0', function(err, response, body) {
        next(err, body);
      });
    },
    function(next) {
      request.get('http://itsyourturn.com/iyt.dll?userprofile?userid=' + userid + '&proftype=1', function(err, response, body) {
        next(err, body);
      });
    },
    function(next) {
      request.get('http://itsyourturn.com/iyt.dll?userprofile?userid=' + userid + '&proftype=2', function(err, response, body) {
        next(err, body);
      });
    }
  ], function(err, results) {
    if (err) {
      console.log(err);
      process.exit();
    }
    async.reduce(product, [], function(memo, combo, next) {
      request.get(baseUrl + util.format.apply(util, [gamePath, userid].concat(combo)), function(err, response, body) {
        if (err) {
          return next(err);
        }
        var $ = cheerio.load(body);
        var links = $('a[href^="/iyt.dll?a?s=7&g="]');
        var gameIds = _.map(links, function(el) {
          return el.attribs.href.split('&')[1].split('=')[1];
        });
        next(null, memo.concat(gameIds));
      });
    }, function(err, games) {
      console.log(games.length);
    });
  });
});
