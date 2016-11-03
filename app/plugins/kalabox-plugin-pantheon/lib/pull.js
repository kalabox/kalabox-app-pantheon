'use strict';

module.exports = function(kbox, app) {

  // Node modules.
  var fs = require('fs');
  var path = require('path');
  var util = require('util');

  // Npm modules
  var _ = require('lodash');

  // Grab the generic clients we need
  var Terminus = require('./terminus.js');
  var terminus = new Terminus(kbox, app);
  var commands = require('./cmd.js')(kbox, app);

  // kbox modules
  var log = kbox.core.log.make('PANTHEON PULL');

  /*
   * Check to see if this is the first time we are going to do a pull or not
   * @todo: this is pretty weak for now
   */
  var firstTime = _.once(function() {
    var gitFile = path.join(app.config.sharing.codeRoot, '.git');
    return !fs.existsSync(gitFile);
  });

  /*
   * Pull down the site's screenshot
   */
  var pullScreenshot = function(uuid, env) {

    app.status('Pulling screenshot.');

    // Some meta data about image source and dest
    var imageFilename = util.format('%s.jpg', uuid);
    var host = 'http://s3.amazonaws.com/pantheon-screenshots-v2';
    var envUrl = [host, env, imageFilename].join('/');
    var devUrl = [host, 'dev', imageFilename].join('/');
    var downloadFolder = app.config.appRoot;

    // Try to download the devUrl first and then replace with the envUrl
    // if it exists, this should cover the case where the end
    return kbox.util.download.downloadFiles([envUrl], downloadFolder)

    // Seems like there is a problem downloading the env screenshot
    .catch(function(err) {
      log.info(util.format('Failed to grab %s screenshot %j', env, err));
      log.info('Trying dev screenshot');
      return kbox.util.download.downloadFiles([devUrl], downloadFolder);
    })

    // Rename file to screenshot.png.
    .then(function() {
      var src = path.join(downloadFolder, imageFilename);
      var dest = path.join(downloadFolder, 'screenshot.png');
      return kbox.Promise.fromNode(function(cb) {
        fs.rename(src, dest, cb);
      })
      .then(function() {
        log.info(util.format('Downloaded %s to %s.', imageFilename, dest));
      });
    })

    // Seems like there is a problem downloading the dev screenshot
    .catch(function(err) {
      log.info(util.format('Failed to grab %s screenshot %j', 'dev', err));
    });

  };

  /*
   * Pull down our sites code
   */
  var pullCode = function(site, env) {

    app.status('Pulling code.');

    // Do this if we are gitting for the first time
    if (firstTime()) {

      // Get connection info for first clone
      return terminus.connectionInfo(site, env)

      // Generate our code repo URL
      // NOTE: even multidev requires we use 'dev' instead of env
      .then(function(bindings) {

        // Clone the repo
        return commands.git(['clone', bindings.git_url, './'])

        // Grab branches if we need more than master
        .then(function() {
          if (env !== 'dev') {
            return commands.git(['fetch', 'origin']);
          }
        })

        // Checkout correct branch if needed
        .then(function() {
          if (env !== 'dev') {
            return commands.git(['checkout', env]);
          }
        });

      });
    }

    // If we already have da git then just pull down the correct branch
    else {
      var branch = (env === 'dev') ? 'master' : env;
      return commands.git(['pull', '-Xtheirs', '--no-edit', 'origin', branch]);
    }

  };

  /*
   * Pull down our sites database
   */
  var pullDB = function(site, env) {

    app.status('Pulling database.');

    // Make sure remote db is up
    return terminus.wakeSite(site, env)

    // Import the backup
    .then(function() {
      return commands.importDB(site, env);
    });

  };

  /*
   * Pull files via RSYNC
   */
  var pullFilesRsync = function(uuid, env) {
    // Hack together an rsync command
    var envSite = [env, uuid].join('.');
    var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
    return commands.rsync(fileBox, '/media');
  };

  /*
   * Pull files via an archive
   */
  var pullFilesArchive = function(site, env, newBackup) {

    // Check if site has a backup
    return terminus.hasBackup(site, env, 'files')

    // If no backup or for backup then MAKE THAT SHIT
    .then(function(hasBackup) {
      if (!hasBackup || newBackup) {
        return terminus.createBackup(site, env, 'files');
      }
    })

    // Download the backup
    .then(function() {
      return terminus.downloadBackup(site, env, 'files');
    })

    // Extract the backup and remove
    .then(function(filesDump) {
      return commands.extract(filesDump, env);
    });
  };

  /*
   * Pull down our sites files
   *
   * If this is the first time we want to grab the files from an archive
   * since this will be way faster. subsequent pulls we will use rsync since
   * this will be way faster
   */
  var pullFiles = function(site, uuid, env, newBackup) {

    app.status('Pulling files.');

    if (firstTime()) {
      return pullFilesArchive(site, env, newBackup)
      .then(function() {
        return pullFilesRsync(uuid, env);
      });
    }
    else {
      return pullFilesRsync(uuid, env);
    }
  };

  /*
   * Do a cache/registry rebuild if needed
   */
  var rebuild = function() {

    // Switch based on framework
    // @todo: what does this look like on wordpress/backdrop
    switch (app.config.pluginconfig.pantheon.framework) {
      case 'drupal': return commands.drush(['rr']);
      case 'drupal8': return commands.drush(['cr']);
      //case 'wordpress': return wp(['']);
      //case 'backdrop': return drush(['cr'])
      default: return true;
    }

  };

  /*
   * Our primary pull method
   */
  var pull = function(conf, choices) {

    // Start by ensuring our SSH keys are good to go
    return commands.ensureSSHKeys()

    // Then pull a screenshot
    .then(function() {
      return pullScreenshot(conf.uuid, conf.env);
    })

    // Ensure our git perms are excellent
    .then(function() {
      return commands.ensureGitPerms();
    })

    // Then grab our Pantheon aliases
    .then(function() {
      return terminus.getSiteAliases();
    })

    // Then pull our code
    .then(function() {
      return pullCode(conf.site, conf.env);
    })

    // Then ensure our symlink
    .then(function() {
      return commands.ensureSymlink();
    })

    // Then pull our DB if selected
    .then(function() {
      if (choices.database && choices.database !== 'none') {
        return pullDB(conf.site, choices.database, choices.newbackup);
      }
    })

    // THen pull our files if selected
    .then(function() {
      if (choices.files && choices.files !== 'none') {
        var newBackup = choices.newbackup;
        return pullFiles(conf.site, conf.uuid, choices.files, newBackup);
      }
    })

    // Then rebuild caches and registries as appropriate
    .then(function() {
      return rebuild();
    });

  };

  return {
    pull: pull
  };

};
