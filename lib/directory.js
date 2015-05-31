var path = require('path');

module.exports = function(dir) {
  return dir.charAt(0) === '/' ? dir : path.resolve(__dirname, '../' + dir);
};
