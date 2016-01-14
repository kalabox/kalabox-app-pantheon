'use strict';

module.exports = function(kbox, app) {

  // Node modules.
  var url = require('url');
  var fs = require('fs');
  var path = require('path');

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
    var gitFile = path.join(app.config.syncthing.codeRoot, '.git');
    return !fs.existsSync(gitFile);
  });

  /*
   * Pull down our sites code
   */
  var pullCode = function(site, env) {

    // Determine correct operation
    var type = (firstTime()) ? 'clone' : 'pull';

    // Grab the git client
    var git = require('./cmd.js')(kbox, app).git;

    // Do this if we are gitting for the first time
    if (type === 'clone') {

      // Grab pantheon aliases
      return terminus.getSiteAliases()

      // Grab the sites UUID from teh machinename
      .then(function() {
        return terminus.getUUID(site);
      })

      // Wake the site up
      // @todo: is this needed?
      .tap(function(/*uuid*/) {
        return terminus.wakeSite(site, env);
      })

      // Generate our code repo URL
      // NOTE: even multidev requires we use 'dev' instead of env
      .then(function(uuid) {

        // Build the repo
        var build = {
          protocol: 'ssh',
          slashes: true,
          auth: ['codeserver', 'dev', uuid].join('.'),
          hostname: ['codeserver', 'dev', uuid, 'drush', 'in'].join('.'),
          port: 2222,
          pathname: ['~', 'repository.git'].join('/')
        };

        // Format our metadata into a url
        var repo = url.format(build);

        // Clone the repo
        return git(['clone', repo, './'])

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
                services: ['appserver']
              }
            };
          };

          // Construct our extract definition
          var linkRun = getAppRunner();
          linkRun.opts.entrypoint = 'ln';
          linkRun.opts.cmd = [
            '-nsf',
            '/media',
            '/code/' + process.env.KALABOX_APP_PANTHEON_FILEMOUNT
          ];

          // Do the linking
          return engine.run(linkRun);

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
  var pullDB = function(site, env, newBackup) {

    /*
     * Helper to get a DB run def template
     */
    var getDbRun = function() {
      return {
        compose: app.composeCore,
        project: app.name,
        opts: {
          services: ['db'],
        }
      };
    };

    // Check if site has a backup
    return terminus.hasBackup(site, env, 'db')

    // If no backup or for backup then MAKE THAT SHIT
    .then(function(hasBackup) {
      if (!hasBackup || newBackup) {
        return terminus.createBackup(site, env, 'db');
      }
    })

    // Download our backup
    .then(function() {
      return terminus.downloadBackup(site, env, 'db');
    })

    // Import the backup
    .tap(function(sqlDump) {

      // Construct our import definition
      var importRun = getDbRun();
      importRun.opts.entrypoint = 'import-mysql';
      importRun.opts.cmd = sqlDump;

      // Perform the run.
      return engine.run(importRun);

    });

  };

  /*
   * Pull files via RSYNC
   */
  var pullFilesRsync = function(site, env) {

    // Grab the rsync client
    var rsync = require('./cmd.js')(kbox, app).rsync;

    // Get our UUID
    return terminus.getUUID(site)

    // Generate our rsync command
    .then(function(uuid) {

      // Hack together an rsync command
      var envSite = [env, uuid].join('.');
      var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
      var fileMount = '/media';
      var cmd = [
        '-rlvz',
        '--size-only',
        '--ipv4',
        '--progress',
        '-e',
        'ssh\ -p\ 2222\ -i\ /user/.ssh/pantheon.kalabox.id_rsa\ -o\ ' +
          'StrictHostKeyChecking=no'];
      cmd = cmd.concat(terminus.getExcludes());
      cmd.push(fileBox);
      cmd.push(fileMount);

      // Rysnc our files
      return rsync(cmd);

    });
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
            services: ['appserver'],
            stdio: 'inherit'
          }
        };
      };

      // Construct our extract definition
      var extractRun = getFilesRunner();
      extractRun.opts.entrypoint = 'tar';
      extractRun.opts.cmd = [
        '-zxvf',
        filesDump,
        '--strip-components=1',
        '--overwrite',
        '--directory=/media'
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
  var pullFiles = function(site, env, newBackup) {
    // If this is the first time we want to grab the files from an archive
    // since this will be way faster. subsequent pulls we will use rsync since
    // this will be way faster
    if (firstTime()) {
      return pullFilesArchive(site, env, newBackup);
    }
    else {
      return pullFilesRsync(site, env);
    }
  };

  return {
    pullCode: pullCode,
    pullDB: pullDB,
    pullFiles: pullFiles
  };

};
