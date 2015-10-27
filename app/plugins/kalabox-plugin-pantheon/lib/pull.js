'use strict';

module.exports = function(kbox, app) {

  // Grab some kalabox modules
  var events = kbox.core.events;
  var engine = kbox.engine;
  var Promise = kbox.Promise;
  Promise.longStackTraces();

  // Intrinsic modules.
  var url = require('url');
  var fs = require('fs');
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  // "Constants"
  var PLUGIN_NAME = 'kalabox-plugin-pantheon';

  // Grab the terminus client
  var Terminus = require('./terminus.js');
  var terminus = new Terminus(kbox, app);

  // Grab delegated helpers
  var pathToRoot = path.resolve(__dirname, '..', '..', '..');
  var pathToNode = path.join(pathToRoot, 'node_modules');
  var Git = require(pathToNode + '/kalabox-plugin-git/lib/git.js');
  var git = new Git(kbox, app);
  var Rsync = require(pathToNode + '/kalabox-plugin-rsync/lib/rsync.js');
  var rsync = new Rsync(kbox, app);

  /*
   * Pull down our sites code
   */
  var pullCode = function(site, env) {

    // Handle the use case where someone destroys/builds and then
    // wants to grab their site. Also coud help correct a botched
    // first create
    // @todo: this only works if you have started your app first
    var gitFile = path.join(app.config.codeRoot, '.git');
    var type = (fs.existsSync(gitFile)) ? 'pull' : 'clone';

    // the pantheon site UUID
    var siteid = null;
    var repo = null;

    // Grab the sites UUID from teh machinename
    return terminus.getUUID(site)

    // Wake the site up
    .then(function(uuid) {
      siteid = uuid;
      return terminus.wakeSite(site, env);
    })

    // Generate our code repo URL and CUT THAT MEAT!
    // errr PULL THAT CODE!
    .then(function() {
      var build = {
        protocol: 'ssh',
        slashes: true,
        auth: ['codeserver', env, siteid].join('.'),
        hostname: ['codeserver', 'dev', siteid, 'drush', 'in'].join('.'),
        port: 2222,
        pathname: ['~', 'repository.git'].join('/')
      };

      // Format our metadata into a url
      repo = url.format(build);

      // Do this if we are gitting for the first time
      if (type === 'clone') {

        // Clone the repo
        return git.cmd(['clone', repo, './'], [])

        // Grab branches if we need more than master
        .then(function() {
          if (env !== 'dev') {
            return git.cmd(['fetch', 'origin'], []);
          }
        })

        // Checkout correct branch if needed
        .then(function() {
          if (env !== 'dev') {
            return git.cmd(['checkout', env], []);
          }
        });
      }

      // If we already have da git then just pull down the correct branch
      else {
        var branch = (env === 'dev') ? 'master' : env;
        return git.cmd(['pull', 'origin', branch], []);
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
      return terminus.hasDBBackup(uuid, env);
    })

    // If no backup or for backup then MAKE THAT SHIT
    .then(function(hasBackup) {
      if (!hasBackup || newBackup) {
        return terminus.createDBBackup(site, env);
      }
    })

    // Download the backup
    .then(function() {
      return terminus.downloadDBBackup(site, env);
    })

    // Import the backup
    .then(function(data) {
      // @todo: waiting for resolution on
      // https://github.com/kalabox/kalabox/issues/539
      // For now we assume the download completed ok and we are looking
      // for a hardcoded location
      // Ultimately we want to parse data correctly to get the DB dump
      // location
      var dbFile = '/src/config/terminus/kalabox-import-db.sql.gz';
      // Perform a container run.
      var payload = ['import-mysql', 'localhost', null, '3306', dbFile];
      return engine.queryData(dbID, payload);
    })

    // Seems worthless?
    .then(function(data) {
      // @todo: use real logger
      console.log(data);
    })

    // Stop the DB container if that is how we found it initially
    .then(function() {
      if (!wasRunning) {
        return engine.stop(dbID);
      }
    });

  };

  /*
   * Pull down our sites database
   */
  var pullFiles = function(site, env) {

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
      return rsync.cmd([opts, fileBox, fileMount], true);

    });
  };

  return {
    pullCode: pullCode,
    pullDB: pullDB,
    pullFiles: pullFiles
  };

};
