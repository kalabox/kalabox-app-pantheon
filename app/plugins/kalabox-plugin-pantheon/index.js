'use strict';

module.exports = function(kbox) {
  // Load the pull magic
  require('./lib/pull.js')(kbox);
  // Load the pantheon environment
  require('./lib/env.js')(kbox);
  // Load the drush/wp and terminus
  require('./lib/drush.js')(kbox);
  require('./lib/wp.js')(kbox);
  require('./lib/terminus.js')(kbox);
};
