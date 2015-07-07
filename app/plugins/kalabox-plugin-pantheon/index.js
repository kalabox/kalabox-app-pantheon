'use strict';

module.exports = function(kbox) {
  // Load additional support images
  require('./lib/images.js')(kbox);
  // Load the pantheon environment
  require('./lib/env.js')(kbox);
  // Load the drush/wp and terminus
  require('./lib/drush.js')(kbox);
  require('./lib/wp.js')(kbox);
  require('./lib/terminus.js')(kbox);
};
