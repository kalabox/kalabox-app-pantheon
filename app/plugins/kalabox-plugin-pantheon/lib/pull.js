'use strict';

module.exports = function(kbox, app) {

  // Node modules.
  var url = require('url');
  var fs = require('fs');
  var path = require('path');

  // NPM modules
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
  var firstTime = function() {
    // @todo: this only works if you have started your app first
    var gitFile = path.join(app.config.syncthing.codeRoot, '.git');
    return !fs.existsSync(gitFile);
  };

  /*
   * Pull down our sites code
   */
  var pullCode = function(site, env) {

    // Determine correct operation
    var type = (firstTime()) ? 'clone' : 'pull';

    // Grab pantheon aliases
    return terminus.getSiteAliases()

    // Grab the sites UUID from teh machinename
    .then(function() {
      return terminus.getUUID(site);
    })

    // Wake the site up
    .tap(function(/*uuid*/) {
      return terminus.wakeSite(site, env);
    })

    // Generate our code repo URL
    // NOTE: even multidev requires we use 'dev' instead of env
    .then(function(uuid) {

      // Grab the git client
      var git = require('./cmd.js')(kbox, app).git;

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

      // Do this if we are gitting for the first time
      if (type === 'clone') {

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
        });
      }

      // If we already have da git then just pull down the correct branch
      else {
        var branch = (env === 'dev') ? 'master' : env;
        return git(['pull', 'origin', branch]);
      }

    });
  };

  /*
   * Pull down our sites database
   */
  var pullDB = function(site, env, newBackup) {
    // Get the cid of this apps database
    // @todo: this looks gross
    var dbID = _.result(_.find(app.components, function(cmp) {
      return cmp.name === 'db';
    }), 'containerId');

    // Set some default things
    var wasRunning = null;
    var defaults = {
      PublishAllPorts: true,
      Binds: [app.rootBind + ':/src:rw']
    };

    // Check if the DB container is already running
    return engine.isRunning(dbID)

    // If not running START IT UP
    .then(function(status) {
      wasRunning = status;
      if (!wasRunning) {
        return engine.start(dbID, defaults);
      }
    })

    // GEt the UUID for this site
    .then(function() {
      return terminus.getUUID(site);
    })

    // Check if site has a backup
    .then(function(uuid) {
      return terminus.hasBackup(uuid, env, 'database');
    })

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
    .then(function(importFile) {
      // Perform a container run.
      var payload = ['import-mysql', 'localhost', null, '3306', importFile];
      return engine.queryData(dbID, payload);
    })

    // Stop the DB container if that is how we found it initially
    .then(function() {
      if (!wasRunning) {
        return engine.stop(dbID);
      }
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

    // Generate our code repo URL and CUT THAT MEAT!
    // errr PULL THAT CODE!
    .then(function(uuid) {
      // This can have a newline in it that F's everything
      var siteid = uuid;

      // @todo: lots of cleanup here
      // Hack together an rsync command
      var envSite = [env, siteid].join('.');
      var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
      var fileMount = '/media';
      var connect = '-rlvz --size-only --ipv4 --progress -e \'ssh -p 2222\'';
      var opts = [connect, terminus.getExcludes()].join(' ');

      // Rysnc our files
      return rsync([opts, fileBox, fileMount], true);

    });
  };

  /*
   * Pull files via an archive
   */
  var pullFilesArchive = function(site, env, newBackup) {

    // Get our UUID
    return terminus.getUUID(site)

    // Check if site has a backup
    .then(function(uuid) {
      return terminus.hasBackup(uuid, env, 'files');
    })

    // If no backup or for backup then MAKE THAT SHIT
    .then(function(hasBackup) {
      if (!hasBackup || newBackup) {
        // @todo: it might make more sense to default to
        // rsync here?
        return terminus.createBackup(site, env, 'files');
      }
    })

    // Download the backup
    .then(function() {
      return terminus.downloadBackup(site, env, 'files');
    })

    // Extract the backup and remove
    .then(function(importFile) {

      // Image name
      var image = 'kalabox/debian:stable';

      // Build create options
      var createOpts = {};

      // Build start options
      var startOpts = kbox.util.docker.StartOpts()
        .bind(app.rootBind, '/src')
        .volumeFrom(app.dataContainerName)
        .json();

      // CMD to extract our archive file to /media
      var extractCmd = [
        'tar',
        '-zxvf',
        importFile,
        '--strip-components=1',
        '--overwrite',
        '--directory=/media'
      ];

      // Cmd to remove the archive
      var rmCmd = ['rm', '-f', importFile];

      // Extract the archive
      return kbox.engine.run(image, extractCmd, createOpts, startOpts)

      // Remove the archive
      .then(function() {
        return kbox.engine.run(image, rmCmd, createOpts, startOpts);
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
