'use strict';

module.exports = function(kbox, app) {

  // Grab the generic clients we need
  var Terminus = require('./terminus.js');
  var terminus = new Terminus(kbox, app);
  var commands = require('./cmd.js')(kbox, app);

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

      // Add in all our changes
      return commands.git(['add', '--all'])

      // Commit our changes
      .then(function() {
        return commands.git([
          'commit',
          '--allow-empty',
          '-m',
          '"' + message + '"'
        ]);
      })

      // Push our changes
      .then(function() {
        var branch = (env === 'dev') ? 'master' : env;
        return commands.git(['push', 'origin', branch]);
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

    // Make sure remote db is up
    return terminus.wakeSite(site, env)

    // Grab binding info
    .then(function() {
      return terminus.connectionInfo(site, env);
    })

    // Push our DB up to pantheon
    .then(function(bindings) {
      return commands.exportDB(bindings.mysql_command);
    });

  };

  /*
   * Pull down our sites database
   */
  var pushFiles = function(uuid, env) {

    app.status('Pushing files.');

    // Hack together an rsync command
    var envSite = [env, uuid].join('.');
    var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
    return commands.rsync('/media/', fileBox);

  };

  /*
   * Our primary push method
   */
  var push = function(conf, choices) {

    // Start by ensuring our SSH keys are good to go
    return commands.ensureSSHKeys()

    // Then push our code
    .then(function() {
      return pushCode(conf.site, conf.env, choices.message);
    })

    // Then push our DB if selected
    .then(function() {
      if (choices.database && choices.database !== 'none') {
        return pushDB(conf.site, choices.database);
      }
    })

    // THen push our files if selected
    .then(function() {
      if (choices.files && choices.files !== 'none') {
        return pushFiles(conf.uuid, choices.files);
      }
    });

  };

  return {
    push: push
  };

};
