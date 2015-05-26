#!/usr/bin/env node

var program = require('commander');
var request = require('request');

/*
 * tn = tournament
 *    0: regular games
 *    1: tournament games
 *    2: ladder games
 * wl = winloss
 *    0: win
 *    1: loss
 *    2: draw
 * st = start (e.g. page)
 */
var baseUrl = 'http://www.itsyourturn.com/pp?complgame&userid=%s&gametype=1&tn=%s&wl=%s';

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
  var cookie = response.headers['set-cookie'][0];
  var userid = cookie.match(/USERID=(\d+)O/)[1];
});
