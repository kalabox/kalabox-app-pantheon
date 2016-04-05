'use strict';

module.exports = function(kbox, app) {
  // Load the pantheon environment
  require('./lib/env.js')(kbox, app);
  // Load events
  require('./lib/events.js')(kbox, app);
  // Load the tasks
  require('./lib/tasks.js')(kbox, app);
  // Load the integrations
  require('./lib/integrations.js')(kbox, app);
};
