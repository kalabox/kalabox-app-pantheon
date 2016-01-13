'use strict';

module.exports = function(kbox, app) {

  // NPM modules
  var _ = require('lodash');

  // Grab the terminus client
  var Terminus = require('./terminus.js');
  var terminus = new Terminus(kbox, app);

  // Grab some kalabox modules
  var engine = kbox.engine;
  var Promise = kbox.Promise;

  /*
   * Push up our sites code
   */
  var pushCode = function(site, env, message) {

    // the pantheon site UUID
    var connectionModeStart;

    // Check to see what our connection mode is
    return terminus.getConnectionMode(site, env)

    // Set the connection mode to git if needed
    // and then try again
    .then(function(connectionMode) {

      // Set so we can use later
      connectionModeStart = connectionMode;

      // If we are in SFTP mode set back to git
      if (connectionModeStart !== 'git') {

        return terminus.hasChanges(site, env)
        .then(function(hasChanges) {
          // If we have uncommmited changes throw error
          if (hasChanges) {
            var msg = [
              'Kalabox has detected you have uncommitted changes.',
              'Please commit those changes and try kbox push again'
            ];
            throw new Error(msg.join(' '));
          }
          else {
            return terminus.setConnectionMode(site, env, 'git');
          }
        });
      }
    })

    // Wake the site
    .then(function() {
      return terminus.wakeSite(site, env);
    })

    // Push up our code
    .then(function() {

      // Grab the git client
      var git = require('./cmd.js')(kbox, app).git;

      // Add in all our changes
      return git(['add', '--all'], [])

      // Commit our changes
      .then(function() {
        return git(['commit', '--allow-empty', '-m', message], []);
      })

      // Push our changes
      .then(function() {
        var branch = (env === 'dev') ? 'master' : env;
        return git(['push', 'origin', branch], []);
      });

    })

    // Set our connection mode back to what we started with
    .then(function() {
      return terminus.setConnectionMode(site, env, connectionModeStart);
    });

  };

  /*
   * Push your local DB up to pantheon
   */
  var pushDB = function(site, env) {
    // Get the cid of this apps database
    // @todo: this looks gross
    var dbID = _.result(_.find(app.components, function(cmp) {
      return cmp.name === 'db';
    }), 'containerId');
    var wasRunning = null;
    var defaults = {
      PublishAllPorts: true,
      Binds: [app.rootBind + ':/src:rw']
    };

    // Check if DB container is running
    return engine.isRunning(dbID)

    // If DB is not running start it up
    .then(function(status) {
      wasRunning = status;
      if (!wasRunning) {
        return engine.start(dbID, defaults)
        // Wait a bit to get the DB going before we do the next thing
        // @todo: Have a way to check that the DB container is
        // actually ready?
        .delay(5000);
      }
    })

    // Dump our database
    .then(function() {
      return engine.queryData(dbID, ['dump-mysql']);
    })

    // Get the site ID
    .then(function() {
      return terminus.getUUID(site);
    })

    // Grab binding info
    .then(function(uuid) {
      return terminus.getBindings(uuid);
    })

    // Extra DB connection info from bindings
    .then(function(binds) {
      var box = _.find(binds, function(bind) {
        return (bind.database === 'pantheon' && bind.environment === env);
      });
      var connectionInfo = {
        password: box.password,
        host: ['dbserver', env, box.site, 'drush', 'in'].join('.'),
        port: box.port.toString()
      };
      return Promise.resolve(connectionInfo);
    })

    // Push our DB up to pantheon
    .then(function(connectionInfo) {
      // Perform a container run.
      var dbFile = '/src/config/terminus/pantheon.sql';
      var payload = [
        'import-mysql',
        connectionInfo.host,
        connectionInfo.password,
        connectionInfo.port,
        dbFile
      ];
      return engine.queryData(dbID, payload);
    })

    // Ensure DB is returned to state we found it in
    .then(function() {
      if (!wasRunning) {
        return engine.stop(dbID);
      }
    });

  };

  /*
   * Pull down our sites database
   */
  var pushFiles = function(site, env) {

    // Grab the rsync client
    var rsync = require('./cmd.js')(kbox, app).rsync;

    // Get panthoen site UUID
    return terminus.getUUID(site)

    // Push up our files
    .then(function(uuid) {
      var siteid = uuid;
      // @todo: lots of cleanup here
      var envSite = [env, siteid].join('.');
      var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
      var fileMount = '/media/* --temp-dir=/tmp/';
      var connect = '-rlvz --size-only --ipv4 --progress -e \'ssh -p 2222\'';
      var opts = [connect, terminus.getExcludes()].join(' ');

      return rsync.cmd([opts, fileMount, fileBox], true);
    });
  };

  return {
    pushCode: pushCode,
    pushDB: pushDB,
    pushFiles: pushFiles
  };

};
