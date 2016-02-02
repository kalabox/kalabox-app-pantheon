'use strict';

module.exports = function(kbox) {
  // Load the pantheon environment
  require('./lib/env.js')(kbox);
  // Load events
  require('./lib/events.js')(kbox);
  // Load the tasks
  require('./lib/tasks.js')(kbox);
  // Load the integrations
  require('./lib/integrations.js')(kbox);
};
