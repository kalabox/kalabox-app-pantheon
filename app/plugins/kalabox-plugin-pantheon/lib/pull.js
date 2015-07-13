'use strict';

// Intrinsic modules.
var url = require('url');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

module.exports = function(kbox) {

  kbox.whenApp(function(app) {

    // Grab the clients
    var Client = require('./client.js');
    var terminus = new Client(kbox, app);
    var Git = require('../../../node_modules/kalabox-plugin-git/lib/git.js');
    var git = new Git(kbox, app);

    // Grab some kalabox modules
    var events = kbox.core.events;
    var engine = kbox.engine;

    /*
     * Pull down our sites code
     */
    var pullCode = function(site, env) {

      // the pantheon site UUID
      var siteid = null;
      var repo = null;

      // Check to see what our connection mode is
      return terminus.getConnectionMode(site, env)
        // Set the connection mode to git if needed
        // and then try again
        .then(function(connectionMode) {
          var modeSplit = connectionMode.split(':');
          var mode = modeSplit[1].trim().toLowerCase();
          if (mode !== 'git') {
            // @todo: actually test this part
            return terminus.setConnectionMode(site, env)
              .then(function(data) {
                // this is going to balk because same CID
                pullCode(site, env);
              });
          }
        })
        // Grab the sites UUID from teh machinename
        .then(function() {
          return terminus.getUUID(site)
            .then(function(uuid) {
              siteid = uuid.trim();
            });
        })
        // Generate our code repo URL and CUT THAT MEAT!
        // errr PULL THAT CODE!
        .then(function() {
          // @todo: better way to generate this?
          // @todo: is 'dev' the only thing that
          var build = {
            protocol: 'ssh',
            slashes: true,
            auth: ['codeserver', 'dev', siteid].join('.'),
            hostname: ['codeserver', 'dev', siteid, 'drush', 'in'].join('.'),
            port: 2222,
            pathname: ['~', 'repository.git'].join('/')
          };
          repo = url.format(build);
          return git.cmd(['clone', repo, './'], []);
        });
    };

    // Events
    // Install the terminus container for our things and also
    // pull down a site or create a new site
    events.on('post-start', function(app, done) {
      var opts = {
        name: 'terminus',
        srcRoot: path.resolve(__dirname, '..', '..', '..'),
      };
      return engine.build(opts)
        .then(function() {
          var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];
          return pullCode(pantheonConf.site, pantheonConf.env);
        })
        .nodeify(done);
    });

  });
};
