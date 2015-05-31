var request = require('request');

exports.login = function(user, pass, cb) {
  request.post('http://itsyourturn.com/iyt.dll/loginverify', {
    form: {
      login: user,
      passwd: pass,
      enter: 'Log in',
      url: 'status?'
    }
  }, cb);
};
