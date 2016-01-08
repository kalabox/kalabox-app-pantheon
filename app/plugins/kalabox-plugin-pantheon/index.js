'use strict';

module.exports = function(kbox) {
  // Load the pull/push magic
  //require('./lib/pull.js')(kbox);
  //require('./lib/push.js')(kbox);
  // Load the pantheon environment
  require('./lib/env.js')(kbox);
  // Load the tasks
  //require('./lib/tasks.js')(kbox);
  // @todo: WP-cli plugin at some point so we can
  // load this in as a client
  //require('./lib/wp.js')(kbox);
};
