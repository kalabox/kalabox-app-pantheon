'use strict';

module.exports = function(kbox, app) {

  // Grab the terminus client
  var Terminus = require('./terminus.js');
  var terminus = new Terminus(kbox, app);

  // Grab some kalabox modules
  var engine = kbox.engine;

  /*
   * Push up our sites code
   */
  var pushCode = function(site, env, message) {

    app.status('Pushing code.');

    // Check to see what our connection mode is
    return terminus.getConnectionMode(site, env)

    // Set the connection mode to git if needed
    // and then try again
    .tap(function(connectionMode) {

      // If we are in SFTP mode check for changes
      if (connectionMode !== 'git') {

        return terminus.hasChanges(site, env)
        .then(function(hasChanges) {
          // If we have uncommmited changes throw error
          if (hasChanges) {
            var msg = [
              'Kalabox has detected you have uncommitted changes on Pantheon.',
              'Please login to your Pantheon dashboard commit those changes',
              'and then try kbox push again.'
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
    .tap(function() {
      return terminus.wakeSite(site, env);
    })

    // Push up our code
    .tap(function() {

      // Grab the git client
      var git = require('./cmd.js')(kbox, app).git;

      // Add in all our changes
      return git(['add', '--all'], [])

      // Commit our changes
      .then(function() {
        return git(['commit', '--allow-empty', '-m', '"' + message + '"'], []);
      })

      // Push our changes
      .then(function() {
        var branch = (env === 'dev') ? 'master' : env;
        return git(['push', 'origin', branch], []);
      });

    })

    // Set our connection mode back to what we started with
    .then(function(connectionMode) {
      return terminus.setConnectionMode(site, env, connectionMode);
    });

  };

  /*
   * Push your local DB up to pantheon
   */
  var pushDB = function(site, env) {

    app.status('Pushing database.');

    /*
     * Helper to get a DB run def template
     */
    var getDrushRun = function() {
      return {
        compose: app.composeCore,
        project: app.name,
        opts: {
          mode: kbox.core.deps.get('mode') === 'gui' ? 'collect' : 'attach',
          services: ['terminus'],
          app: app
        }
      };
    };

    // Make sure remote db is up
    return terminus.wakeSite(site, env)

    // Grab binding info
    .then(function() {
      return terminus.connectionInfo(site, env);
    })

    // Push our DB up to pantheon
    .then(function(bindings) {

      // Construct our import definition
      var exportRun = getDrushRun();
      var alias = '@kbox';
      exportRun.opts.entrypoint = ['bash', '-c'];
      // jshint camelcase:false
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      //
      exportRun.opts.cmd = [
        'drush',
        alias,
        'sql-dump',
        '|',
        bindings.mysql_command
      ];
      // jshint camelcase:true
      // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

      // Perform the run.
      return engine.run(exportRun);

    });

  };

  /*
   * Pull down our sites database
   */
  var pushFiles = function(uuid, env) {

    app.status('Pushing files.');

    // Grab the rsync client
    var rsync = require('./cmd.js')(kbox, app).rsync;

    // Hack together an rsync command
    var envSite = [env, uuid].join('.');
    var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
    return rsync('/media/', fileBox);

  };

  return {
    pushCode: pushCode,
    pushDB: pushDB,
    pushFiles: pushFiles
  };

};
