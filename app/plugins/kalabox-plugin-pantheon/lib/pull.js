'use strict';

// Intrinsic modules.
var url = require('url');
var fs = require('fs');
var path = require('path');

// NPM modules
var Promise = require('bluebird');
var _ = require('lodash');

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
          // @todo: check for code dir before we decide to pull or clone
          return git.cmd(['clone', repo, './'], []);
        });
    };

    /*
     * Pull down our sites database
     */
    var pullDB = function(site, env) {
      // Get the cid of this apps database
      // @todo: this looks gross
      var dbID = _.result(_.find(app.components, function(cmp) {
        console.log(cmp);
        return cmp.name === 'db';
      }), 'containerId');

      // Set this later to store the location to the DB file
      var dbFile = null;

      // @todo: put this in dot notation
      var defaults = {
        PublishAllPorts: true,
        Binds: [app.rootBind + ':/src:rw']
      };
      // Start up the DB
      return engine.start(dbID, defaults)
      // Grab the DB
        .then(function() {
          return terminus.getDB(site, env);
        })
        .then(function(data) {
          var downloadSplit = data.split('Downloaded');
          dbFile = downloadSplit[1].trim();
          // Perform a container run.
          // gunzip < database.sql.gz | mysql -uUSER -pPASSWORD DATABASENAME
          var payload = [
            'gunzip',
            '-df',
            dbFile,
            '&&',
            'mysql',
            '-u',
            'pantheon',
            'pantheon',
            '<',
             dbFile.replace('.gz', '')
          ];
          return engine.query(dbID, payload);
        })
        .then(function() {
          // @todo: would be great to get terminus to be able to
          // overwrite files so we dont have to do this
          return terminus.removeDB(dbFile);
        })
        .then(function() {
          //return Promise.delay(1000 * 600);
        })
        // Stop the DB
        .then(function() {
          return engine.stop(dbID);
        });
    };

    /*
     * Pull down our sites database
     */
    var pullFiles = function(site, env) {

    };

    // Events
    // Install the terminus container for our things and also
    // pull down a site or create a new site
    events.on('post-install', function(app, done) {
      // Make sure we install the terminus container for this app
      var opts = {
        name: 'terminus',
        srcRoot: path.resolve(__dirname, '..', '..', '..'),
      };
      // Our pantheon config for later on
      var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];

      // Install the terminus container and then do install things
      return engine.build(opts)
        .then(function() {
          return terminus.getSiteAliases();
        })
        .then(function() {
          return pullCode(pantheonConf.site, pantheonConf.env);
        })
        .then(function() {
          return pullDB(pantheonConf.site, pantheonConf.env);
        })
        .nodeify(done);
    });

  });
};