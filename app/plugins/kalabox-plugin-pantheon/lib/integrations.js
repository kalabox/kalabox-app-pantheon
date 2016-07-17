'use strict';

module.exports = function(kbox, app) {

  // Set the integrations pull method.
  kbox.integrations.get('pantheon').setMethod('pull', function(opts) {

    // Save for later
    var self = this;

    // Default option handling.
    opts = opts || {};
    opts.files = opts.files || 'none';
    opts.database = opts.database || 'none';

    // Pull.
    return kbox.Promise.try(function() {

      // Get our pull stuff
      var puller = require('./pull.js')(kbox, app);

      // Pull the site
      // @todo @alec: do we need to add self.update into pull.js now to get gui updates?
      return puller.pull(app.config.pluginconfig.pantheon, opts)
      .then(function() {
        self.update('Done pulling.');
      });
    });

  });

  // Set the integrations push method.
  kbox.integrations.get('pantheon').setMethod('push', function(opts) {

    // Save reference for later.
    var self = this;

    // Default options.
    opts = opts || {};
    opts.message = opts.message || 'No commit message given.';
    opts.database = opts.database || 'none';
    opts.files = opts.files || 'none';

    // Push
    return kbox.Promise.try(function() {

      // Get our push mod
      var pusher = require('./push.js')(kbox, app);

      // Push the site
      // @todo @alec: do we need to add self.update into pull.js now to get gui updates?
      return pusher.push(app.config.pluginconfig.pantheon, opts)
      .then(function() {
        self.update('Done pushing.');
      });
    });
  });

};
