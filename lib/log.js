var chalk = require('chalk');

module.exports = function() {
  console.log.apply(console, [chalk.green('>>')].concat([].slice.call(arguments)));
};
