'use strict';

module.exports = function(kbox, app) {

  // Node modules.
  var fs = require('fs');
  var path = require('path');
  var util = require('util');

  // Npm modules
  var _ = require('lodash');

  // Grab some kalabox modules
  var engine = kbox.engine;

  // Grab the terminus client
  var Terminus = require('./terminus.js');
  var terminus = new Terminus(kbox, app);

  /*
   * Check to see if this is the first time we are going to do a pull or not
   * @todo: this is pretty weak for now
   */
  var firstTime = _.once(function() {
    var gitFile = path.join(app.config.sharing.codeRoot, '.git');
    return !fs.existsSync(gitFile);
  });

  /*
   * Pull down the site's screenshot for use in the gui.
   */
  var pullScreenshot = function(uuid, env) {

    app.status('Pulling screenshot.');

    // Get site aliases.
    return terminus.getSiteAliases()
    // Download screenshot.
    .then(function() {
      // Name of the image.
      var imageFilename = util.format('%s_%s.png', uuid, env);
      // Url of the image to download.
      var imageUrl = util.format(
        'http://s3.amazonaws.com/pantheon-screenshots/%s',
        imageFilename
      );
      // Folder to download image to.
      var downloadFolder = app.config.appRoot;
      // Download file.
      return kbox.util.download.downloadFiles([imageUrl], downloadFolder)
      // Rename file to scrrenshot.png.
      .then(function() {
        var src = path.join(downloadFolder, imageFilename);
        var dest = path.join(downloadFolder, 'screenshot.png');
        return kbox.Promise.fromNode(function(cb) {
          fs.rename(src, dest, cb);
        });
      });
    })
    // Ignore errors.
    .catch(function() {

    });

  };

  /*
   * Pull down our sites code
   */
  var pullCode = function(site, env) {

    app.status('Pulling code.');

    // Determine correct operation
    var type = (firstTime()) ? 'clone' : 'pull';

    // Grab the git client
    var git = require('./cmd.js')(kbox, app).git;
    var ensureSSHKeys = require('./cmd.js')(kbox, app).ensureSSHKeys;

    // Do this if we are gitting for the first time
    if (type === 'clone') {

      // Grab pantheon aliases
      return terminus.getSiteAliases()

      // Get connection info
      .then(function() {
        return terminus.connectionInfo(site, env);
      })

      // Generate our code repo URL
      // NOTE: even multidev requires we use 'dev' instead of env
      .then(function(bindings) {

        // jshint camelcase:false
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        // Get the repo from bindings
        var repo = bindings.git_url;
        // jshint camelcase:true
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

        return ensureSSHKeys()

        // Clone the repo
        .then(function() {
          return git(['clone', repo, './']);
        })

        // Grab branches if we need more than master
        .then(function() {
          if (env !== 'dev') {
            return git(['fetch', 'origin']);
          }
        })

        // Checkout correct branch if needed
        .then(function() {
          if (env !== 'dev') {
            return git(['checkout', env]);
          }
        })

        // Symlink our files directory to media
        .then(function() {

          /*
           * Helper to get a appserver run def template
           */
          var getAppRunner = function() {
            return {
              compose: app.composeCore,
              project: app.name,
              opts: {
                services: ['appserver'],
                app: app
              }
            };
          };

          // Construct our rm definition
          var rmRun = getAppRunner();
          rmRun.opts.entrypoint = 'rm';
          rmRun.opts.cmd = [
            '-rf',
            '/code/' + app.env.getEnv('KALABOX_APP_PANTHEON_FILEMOUNT')
          ];

          // Construct our link definition
          var linkRun = getAppRunner();
          linkRun.opts.entrypoint = 'ln';
          linkRun.opts.cmd = [
            '-nsf',
            '/media',
            '/code/' + app.env.getEnv('KALABOX_APP_PANTHEON_FILEMOUNT')
          ];

          // Do the Remove
          return engine.run(rmRun)
          // Do the link
          .then(function() {
            return engine.run(linkRun);
          });

        });
      });
    }

    // If we already have da git then just pull down the correct branch
    else {
      var branch = (env === 'dev') ? 'master' : env;
      return git(['pull', 'origin', branch]);
    }

  };

  /*
   * Pull down our sites database
   */
  var pullDB = function(site, env) {

    app.status('Pulling database.');

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

    // Import the backup
    .then(function() {

      // Construct our import definition
      var alias = ['@pantheon', site, env].join('.');
      var importRun = getDrushRun();
      importRun.opts.entrypoint = ['usermap'];
      importRun.opts.cmd = [
        'drush',
        alias,
        'sql-connect',
        '&&',
        'drush',
        alias,
        'sql-dump',
        '|',
        'mysql',
        '-u',
        '$DB_USER',
        '-p$DB_PASSWORD',
        '-h',
        '$DB_HOST',
        '$DB_NAME'
      ];

      // Perform the run.
      return engine.run(importRun);

    });

  };

  /*
   * Pull files via RSYNC
   */
  var pullFilesRsync = function(uuid, env) {

    // Grab the rsync client
    var rsync = require('./cmd.js')(kbox, app).rsync;

    // Hack together an rsync command
    var envSite = [env, uuid].join('.');
    var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
    return rsync(fileBox, '/media');

  };

  /*
   * Do a cache/registry rebuild if needed
   */
  var rebuild = function() {

    // Grab the drush client
    var drush = require('./cmd.js')(kbox, app).drush;

    // Switch based on framework
    // @todo: what does this look like on wordpress/backdrop
    switch (app.config.pluginconfig.pantheon.framework) {
      case 'drupal': return drush(['rr']);
      case 'drupal8': return drush(['cr']);
      //case 'wordpress': return wp(['']);
      //case 'backdrop': return drush(['cr'])
      default: return true;
    }

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

      /*
       * Helper to get a cli run def template
       */
      var getFilesRunner = function() {
        return {
          compose: app.composeCore,
          project: app.name,
          opts: {
            services: ['cli'],
            mode: kbox.core.deps.get('mode') === 'gui' ? 'collect' : 'attach',
            app: app
          }
        };
      };

      // Construct our extract definition
      var extractRun = getFilesRunner();
      extractRun.opts.entrypoint = 'usermap';
      extractRun.opts.cmd = [
        'tar',
        '-zxvf',
        filesDump,
        '-C',
        '/tmp',
        '&&',
        'mv',
        '/tmp/files_' + env + '/*',
        '/media'
      ];

      // Construct our remove definition
      var removeRun = getFilesRunner();
      removeRun.opts.entrypoint = 'rm';
      removeRun.opts.cmd = [
        '-f',
        filesDump
      ];

      // Extract and then remove the archive
      return kbox.engine.run(extractRun)
      .then(function() {
        return kbox.engine.run(removeRun);
      });

    });
  };

  /*
   * Pull down our sites database
   */
  var pullFiles = function(site, uuid, env, newBackup) {

    app.status('Pulling files.');

    // If this is the first time we want to grab the files from an archive
    // since this will be way faster. subsequent pulls we will use rsync since
    // this will be way faster
    if (firstTime()) {
      return pullFilesArchive(site, env, newBackup);
    }
    else {
      return pullFilesRsync(uuid, env);
    }
  };

  return {
    pullCode: pullCode,
    pullDB: pullDB,
    pullFiles: pullFiles,
    pullScreenshot: pullScreenshot,
    rebuild: rebuild
  };

};
