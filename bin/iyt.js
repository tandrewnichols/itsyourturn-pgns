#!/usr/bin/env node

var program = require('commander');
var request = require('request');
var Combinatorics = require('js-combinatorics');
var async = require('async');
var util = require('util');

var baseUrl = 'http://www.itsyourturn.com/pp?complgame&userid=%s&gametype=%s&tn=%s&wl=%s';

// cartesianProduct(gameTyptes, tournament, winloss)
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
  var cookieVal = response.headers['set-cookie'][0];
  var userid = cookie.match(/USERID=(\d+)O/)[1];
  var jar = request.jar();
  async.reduce(product, [], function(memo, combo, next) {
    request.get(util.format(baseUrl, [userid].concat(combo))
  }, function(err, games) {

  });
});
