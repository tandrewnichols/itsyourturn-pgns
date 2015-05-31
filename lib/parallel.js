var cheerio = require('cheerio');
var request = require('request');

exports.profile = function(userid, proftype) {
  return function(next) {
    request.get('http://itsyourturn.com/iyt.dll?userprofile?userid=' + userid + '&proftype=' + proftype, function(err, response, body) {
      next(err, cheerio.load(body));
    });
  };
};
