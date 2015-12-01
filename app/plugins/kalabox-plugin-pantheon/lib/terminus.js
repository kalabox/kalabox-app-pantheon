'use strict';

// Intrinsic modules.
var path = require('path');
var fs = require('fs');

// Npm modulez
var _ = require('lodash');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';
var TERMINUS = 'terminus:t0.9.3';

/*
 * Constructor.
 */
function Terminus(kbox, app) {

  // Terminus node clients
  // for some things it is better to use the node client because we dont have
  // to worry about an error we need to handle killing the whole damn thing
  var Client = require('./client.js');
  this.pantheon = new Client(kbox, app);

  // Kbox things
  this.app = app;
  this.kbox = kbox;

  // @todo: more caching?
  this.uuid = undefined;

}

/*
 * Builds a query for use in a terminus container
 */
Terminus.prototype.__buildQuery = function(cmd, args, options) {

  return cmd.concat(args).concat(options);

};

/*
 * Returns default terminus container start options
 */
Terminus.prototype.__getStartOpts = function() {

  // Grab the path of the home dir inside the VM
  var homeBind = this.app.config.homeBind;
  return this.kbox.util.docker.StartOpts()
    .bind(homeBind, '/ssh')
    .bind(this.app.rootBind, '/src')
    .json();

};

/*
 * Returns default terminus container create options
 */
Terminus.prototype.__getCreateOpts = function() {

  // Grab some deps
  var idObj = this.kbox.util.docker.containerName.createTemp();
  var id = this.kbox.util.docker.containerName.format(idObj);
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

  // Build create options
  return this.kbox.util.docker.CreateOpts(id)
    .workingDir('/' + globalConfig.codeDir)
    .volumeFrom(this.app.dataContainerName)
    .json();

};

/*
 * Send a request to a terminus container.
 */
Terminus.prototype.__request = function(cmd, args, options) {

  // Save for later.
  var self = this;

  // Get create options.
  var createOpts = self.__getCreateOpts();

  // We need a special entry for this request
  createOpts.Entrypoint = ['/bin/sh', '-c'];

  // Get start options
  var startOpts = self.__getStartOpts();

  // Start a terminus container and run a terminus command against it
  var query = self.__buildQuery(cmd, args, options);

  // Prompt the user to reauth if the session is invalid
  return this.pantheon.reAuthSession()

  // Set our session to be the new session
  .then(function() {

    // Util function just for CS stuff
    var queryFunc = function(container) {
      return self.kbox.engine.queryData(container.id, query);
    };

    return self.kbox.engine.use(TERMINUS, createOpts, startOpts, queryFunc);

  });

};

/*
 * TERMINUS COMMANDS
 */

/**
 * Gets plugin conf from the appconfig or from CLI arg
 **/
Terminus.prototype.getOpts = function(options) {

  // Grab our options from config
  var defaults = this.app.config.pluginConf[PLUGIN_NAME];

  // Override any config coming in on the CLI
  _.each(Object.keys(defaults), function(key) {
    if (_.has(options, key) && options[key]) {
      defaults[key] = options[key];
    }
  });

  return defaults;
};

/*
 * Run an interactive terminus command
 * @todo: do we want to auth at all here?
 */
Terminus.prototype.cmd = function(cmd, opts, done) {

  // Get engine and global config
  var engine = this.kbox.engine;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

  // Get create options.
  var createOpts = this.__getCreateOpts();

  // Get current working directory.
  var cwd = process.cwd();

  // Get code root.
  var codeRoot = this.app.config.codeRoot;

  // Build correct WD
  var workingDirExtra = '';
  if (_.startsWith(cwd, codeRoot)) {
    workingDirExtra = cwd.replace(codeRoot, '');
  }
  var codeDir = globalConfig.codeDir;
  var workingDir = '/' + codeDir + workingDirExtra;

  // Override working directory
  createOpts.WorkingDir = workingDir;

  // Get start options.
  var startOpts = this.__getStartOpts();

  // Image name.
  var image = TERMINUS;

  // Prompt the user to reauth if the session is invalid
  return this.pantheon.reAuthSession()

  // Set our session to be the new session
  .then(function() {

    // Perform a container run.
    return engine.run(image, cmd, createOpts, startOpts)

    // Return.
    .nodeify(done);

  });

};

/*
 * Wake the site
 *
 * terminus site wake --site="$PANTHEON_SITE" --env="$PANTHEON_ENV"
 */
Terminus.prototype.wakeSite = function(site, env) {

  return this.__request(
    ['kterminus'],
    ['site', 'wake'],
    ['--site=' + site, '--env=' + env]
  );

};

/*
 * Get connection mode
 *
 * terminus site environment-info --field=connection_mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Terminus.prototype.getConnectionMode = function(site, env) {

  // Grab the data
  return this.__request(
    ['kterminus'],
    ['site', 'environment-info', '--field=connection_mode'],
    ['--format=json', '--site=' + site, '--env=' + env]
  )

  // Return a parsed json object
  .then(function(connectionMode) {
    return JSON.parse(connectionMode);
  });

};

/*
 * Check for uncommitted changes
 *
 * terminus site code diffstat --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Terminus.prototype.hasChanges = function(site, env) {

  // Grab the data
  return this.__request(
    ['kterminus'],
    ['site', 'code', 'diffstat'],
    ['--format=json', '--site=' + site, '--env=' + env]
  )

  // Return whether we have changes or not
  .then(function(data) {

    // Split into an array of messages
    var messages = data.split('\n');
    // Last message is empty
    messages.pop();
    var last = _.last(messages);

    // Parse the last message
    var response = JSON.parse(_.trim(last));
    return response.message !== 'No changes on server.';

  });

};

/*
 * Set connection mode
 *
 * terminus site set-connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV" --mode=git
 */
Terminus.prototype.setConnectionMode = function(site, env, mode) {

  return this.__request(
    ['kterminus'],
    ['site', 'set-connection-mode'],
    ['--format=json', '--site=' + site, '--env=' + env, '--mode=' + mode]
  );

};

/*
 * Get site uuid
 *
 * terminus site info --site="$PANTHEON_SITE" --field=id
 */
Terminus.prototype.getUUID = function(site) {

  // More of this sort of thing
  var self = this;

  // We run this a lot so lets cache per run and do a lookup before we
  // make a request
  if (self.uuid !== undefined) {
    return self.kbox.Promise.resolve(self.uuid);
  }

  // Make a request
  return self.__request(
    ['kterminus'],
    ['site', 'info'],
    ['--format=json', '--site=' + site, '--field=id']
  )

  .then(function(uuid) {
    self.uuid = JSON.parse(uuid);
    return self.kbox.Promise.resolve(self.uuid);
  });

};

/*
 * Get site aliases
 *
 * terminus sites aliases --format=json
 */
Terminus.prototype.getSiteAliases = function() {

  return this.__request(['kterminus'], ['sites', 'aliases'], ['--format=json']);

};

/*
 * Get latest backup of given site, env and type and save it
 *
 * terminus site backups get
 * --element=<type> --site=<site> --env=<env> --to=$HOME/Desktop/ --latest
 */
Terminus.prototype.downloadBackup = function(site, env, type) {

  // need this for all the other things
  var self = this;

  // Download the backup and return its location
  // retry if needed
  return this.kbox.Promise.retry(function() {
    return self.__request(
      ['kterminus'],
      ['site', 'backups', 'get'],
      [
        '--site=' + site,
        '--env=' + env,
        '--element=' + type,
        '--to=/src/config/terminus/',
        '--latest',
        '--format=json'
      ]
    )

    // Catch the error and see if we need to remove an old failed backup
    // first and then retry
    .catch(function(err) {
      // Extract messages from error and array them
      var msgs  = err.message.substring(err.message.indexOf('{')).split('\n');
      var exists = _.find(msgs, function(msg) {
        var obj = JSON.parse(_.trim(msg));
        return _.includes(obj.message, 'already exists');
      });

      // If target file already exists then extract its name, delete and retry
      if (exists !== undefined) {
        // Extract the path
        var getRight = JSON.parse(exists).message.split('(');
        var getLeft = getRight[1].split(')');
        var containerPath = getLeft[0];

        // Get path on host filesystem
        var filename = path.basename(containerPath);
        var filePath = path.join(self.app.root, 'config', 'terminus', filename);

        // Remove the offending file
        fs.unlinkSync(filePath);
      }

      // And finally throw the error
      throw new Error(err);
    })

    // Parse the data to get the filename
    .then(function(data) {
      var dataz = _.dropRight(data.split('\n'), 1);
      var response = JSON.parse(_.last(dataz));
      return _.trim(_.last(response.message.split('Downloaded ')));
    });
  });

};

/*
 * Create a backup of given site, env and type
 *
 * terminus site backup create
 * --element=database --site=<site> --env=<env>
 */
Terminus.prototype.createBackup = function(site, env, type) {

  // @todo: validate type?

  return this.__request(
    ['kterminus'],
    ['site', 'backups', 'create'],
    [
      '--format=json',
      '--element=' + type,
      '--site=' + site,
      '--env=' + env
    ]);
};

/*
 * Checks to see if there is a backup of given type available for site and env
 */
Terminus.prototype.hasBackup = function(uuid, env, type) {

  var self = this;

  return this.pantheon.getBackups(uuid, env)

  .then(function(backups) {
    var keys = _.keys(backups).join('');
    var manual = 'backup_' + type;
    var auto = 'automated_' + type;
    var hasBackup = _.includes(keys, manual) || _.includes(keys, auto);
    return self.kbox.Promise.resolve(hasBackup);
  });

};

/*
 * Get binding info for a site UUID
 *
 * https://dashboard.getpantheon.com/api/sites/UUID/bindings
 */
Terminus.prototype.getBindings = function(uuid) {

  return this.pantheon.getBindings(uuid);

};

/*
 * This one is a little weird since its not really a terminus call
 * but its something we should keep outside of push/pull for reusability
 * @todo: maybe this goes into a util mod at some point?
 * @todo: eventually we might want to do this by framework?
 *
 * https://dashboard.getpantheon.com/api/sites/UUID/bindings
 */
Terminus.prototype.getExcludes = function() {

  /*
   * Basic map function to translate a directory into
   * a rsync exclusion string
   */
  var exclude = function(dir) {
    return ['--exclude', '\'' + dir + '\''].join(' ');
  };

  // Generic list of dirs to exclude
  var dirs = [
    'js',
    'css',
    'ctools',
    'imagecache',
    'xmlsitemap',
    'backup_migrate',
    'php/twig/*',
    'styles/*',
    'less'
  ];

  // Return exclude string
  return _.map(dirs, exclude).join(' ');

};

// Return constructor as the module object.
module.exports = Terminus;
