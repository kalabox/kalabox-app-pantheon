'use strict';

// Intrinsic modules.
var url = require('url');
var fs = require('fs');
var path = require('path');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

module.exports = function(kbox) {

  kbox.whenApp(function(app) {

    // Grab the clients
    var Client = require('./client.js');
    var terminus = new Client(kbox, app);

    // Grab some kalabox modules
    var events = kbox.core.events;
    var engine = kbox.engine;

    /*
     * Pull down our sites code
     */
    var pullCode = function(site, remote, env) {

      // the pantheon site UUID
      var siteid = null;
      // The code repository
      var repo = null;

      // Check to see what our connection mode is
      return terminus.getConnectionMode()
        // Set the connection mode to git if needed
        // and then try again
        .then(function(connectionMode) {
          // Parse connection mode
          //var connectionMode = something;
          if (connectionMode === 'Sftp') {
            return terminus.setConnectionMode()
              .then(function(data) {
                // parse data
                pullCode(site, env);
              });
          }
        })
        // Grab the sites UUID from teh machinename
        .then(function() {
          return terminus.getUUID(site)
            .then(function(uuid) {
              siteid = uuid;
            });
        })
        // Generate our code repo URL and CUT THAT MEAT!
        // errr PULL THAT CODE!
        .then(function() {
          // better way to generate this?
          var build = {
            protocol: 'ssh',
            auth: ['codeserver', 'dev', siteid].join('.'),
            host: ['codeserver', 'dev', siteid, 'drush', 'in'].join('.'),
            port: 2222,
            pathname: ['~', 'repository.git'].join('/')
          };
          repo = url.format(build);

          return terminus.codePull(repo)
            .then(function(data) {
              // data validation
            });
        });
    };

    // Events
    // Install the terminus container for our things and also
    // pull down a site or create a new site
    events.on('post-install', function(app, done) {
      var opts = {
        name: 'terminus',
        srcRoot: path.resolve(__dirname, '..', '..', '..'),
      };
      return engine.build(opts)
        .then(function() {

        })
        .nodeify(done);
    });

  });
};
