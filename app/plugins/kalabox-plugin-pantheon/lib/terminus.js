'use strict';

// Intrinsic modules.
var util = require('util');
var path = require('path');

// Npm modulez
var _ = require('lodash');
var Promise = require('bluebird');
Promise.longStackTraces();

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

// Terminus node clients
// for some things it is better to use the node client because we dont have
// to worry about an error we need to handle killing the whole damn thing
var Client = require('./client.js');
var pantheon = new Client();

/*
 * Constructor.
 */
function Terminus(kbox, app) {

  // Kbox things
  this.app = app;
  this.kbox = kbox;

  // @todo: more caching?
  this.uuid = undefined;

}

/*
 * WE DEFINITELY NEED TO EITHER RETRIEVE OR VALIDATE A SESSION BEFORE WE
 * ACTALLY DO STUFF OR LOGIN
 *
 * @todo @todo @todo @todo @todo @todo @todo @todo @todo @todo @todo @todo
 */

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
    .bind(homeBind, '/terminus')
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
 * Send a request to a terminus container
 */
Terminus.prototype.__request = function(cmd, args, options) {

  // Save for later.
  var self = this;

  // Grab the global config
  var globalConfig = this.kbox.core.deps.get('globalConfig');

  // Get create options.
  var createOpts = this.__getCreateOpts();

  // We need a special entry for this request
  /* jshint ignore:start */
  //jscs:disable
  createOpts.Entrypoint = ["/bin/sh", "-c"];
  /* jshint ignore:end */

  // Get provider.
  return this.kbox.engine.provider()
  .then(function(provider) {

    // Get start options
    var startOpts = self.__getStartOpts();

    // Start a terminus container and run a terminus command against it
    var query = self.__buildQuery(cmd, args, options);
    return self.kbox.engine.use('terminus', createOpts, startOpts, function(container) {
      return self.kbox.engine.queryData(container.id, query);
    });
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
 */
Terminus.prototype.cmd = function(cmd, opts, done) {

  // Get engine, promise and global config
  var engine = this.kbox.engine;
  var Promise = this.kbox.Promise;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

  // Get create options.
  var createOpts = this.__getCreateOpts();

  // Run the terminus command in the correct directory in the container if the
  // user is somewhere inside the code directory on the host side.
  // @todo: consider if this is better in the actual engine.run command
  // vs here.

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
  var image = 'terminus';

  // Perform a container run.
  return engine.run(image, cmd, createOpts, startOpts)
  // Return.
  .nodeify(done);

};

/*
 * Wake the site
 *
 * terminus site wake --site="$PANTHEON_SITE" --env="$PANTHEON_ENV"
 */
Terminus.prototype.wakeSite = function(site, env) {

  return this.__request(
    ['terminus'],
    ['site', 'wake'],
    ['--site=' + site, '--env=' + env]
  );

};

/*
 * Get connection mode
 *
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Terminus.prototype.getConnectionMode = function(site, env) {

  return this.__request(
    ['terminus'],
    ['site', 'connection-mode'],
    ['--json', '--site=' + site, '--env=' + env]
  );

};

/*
 * Set connection mode
 *
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV" --set=git
 */
Terminus.prototype.setConnectionMode = function(site, env) {

  return this.__request(
    ['terminus'],
    ['site', 'connection-mode'],
    ['--json', '--site=' + site, '--env=' + env, '--set=git']
  );

};

/*
 * Get site uuid
 *
 * terminus site info --site="$PANTHEON_SITE" --field=id
 */
Terminus.prototype.getUUID = function(site) {

  // We run this a lot so lets cache per run and do a lookup before we
  // make a request
  if (this.uuid !== undefined) {
    return Promise.resolve(this.uuid);
  }

  // More of this sort of thing
  var self = this;

  // Make a request
  return this.__request(
    ['terminus'],
    ['site', 'info'],
    ['--json', '--site=' + site, '--field=id']
  )
  .then(function(uuid) {
    self.uuid = uuid;
    return Promise.resolve(self.uuid);
  });

};

/*
 * Get site aliases
 *
 * terminus sites aliases --json
 */
Terminus.prototype.getSiteAliases = function() {

  return this.__request(['terminus'], ['sites', 'aliases'], ['--json']);

};

/*
 * Get latest DB backup and save it in /other
 *
 * terminus site backups get
 * --element=database --site=<site> --env=<env> --to-directory=$HOME/Desktop/ --latest
 */
Terminus.prototype.downloadDBBackup = function(site, env) {

  return this.__request(
    ['terminus'],
    ['site', 'backups', 'get'],
    [
      '--json',
      '--element=database',
      '--site=' + site,
      '--env=' + env,
      '--to-directory=/src/config/terminus',
      '--latest'
    ]);
};

/*
 * Get latest DB backup and save it in /other
 *
 * terminus site backup create
 * --element=database --site=<site> --env=<env>
 */
Terminus.prototype.createDBBackup = function(site, env) {

  return this.__request(
    ['terminus'],
    ['site', 'backups', 'create'],
    [
      '--json',
      '--element=database',
      '--site=' + site,
      '--env=' + env
    ]);
};

/*
 * Checks to see if there is a DB backup available
 */
Terminus.prototype.hasDBBackup = function(uuid, env) {

  return pantheon.getBackups(uuid, env)
    .then(function(backups) {
      var keyString = _.keys(backups).join('');
      console.log(keyString);
      return Promise.resolve(_.includes(keyString, 'backup_database'));
    });
};

/*
 * Get binding info for a site UUID
 *
 * https://dashboard.getpantheon.com/api/sites/UUID/bindings
 */
Terminus.prototype.getBindings = function(uuid) {

  return pantheon.getBindings(uuid);
};

// Return constructor as the module object.
module.exports = Terminus;
