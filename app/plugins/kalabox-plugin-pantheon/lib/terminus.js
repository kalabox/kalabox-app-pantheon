'use strict';

// Intrinsic modules.
var util = require('util');
var path = require('path');

// Npm modulez
var _ = require('lodash');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

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
  /* jshint ignore:start */
  //jscs:disable
  createOpts.Entrypoint = ["/bin/sh", "-c"];
  /* jshint ignore:end */

  // Get start options
  var startOpts = self.__getStartOpts();

  // Start a terminus container and run a terminus command against it
  var query = self.__buildQuery(cmd, args, options);

  // Grab a session to set up our auth
  var session = this.pantheon.getSession();

  // Prompt the user to reauth if the session is invalid
  // @todo: the mostly repeated conditional here is gross lets improve it
  if (session === undefined) {

    // Reuath attempt
    return this.pantheon.reAuthSession()

    // Set our session to be the new session
    .then(function(reAuthSession) {

      return self.kbox.engine.use('terminus', createOpts, startOpts, function(container) {
        return self.kbox.engine.queryData(container.id, query);
      });

    });

  }

  else {

    return self.kbox.engine.use('terminus', createOpts, startOpts, function(container) {
      return self.kbox.engine.queryData(container.id, query);
    });

  }

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

  // Grab a session to set up our auth
  var session = this.pantheon.getSession();

  // Prompt the user to reauth if the session is invalid
  // @todo: the mostly repeated conditional here is gross lets improve it
  if (session === undefined) {

    // Reuath attempt
    return this.pantheon.reAuthSession()

    // Set our session to be the new session
    .then(function(reAuthSession) {

      //@todo: validate session again?
      // Perform a container run.
      return engine.run(image, cmd, createOpts, startOpts)

      // Return.
      .nodeify(done);

    });

  }

  else {

    // Perform a container run.
    return engine.run(image, cmd, createOpts, startOpts)

    // Return.
    .nodeify(done);

  }


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
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Terminus.prototype.getConnectionMode = function(site, env) {

  return this.__request(
    ['kterminus'],
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
    ['kterminus'],
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
    ['--json', '--site=' + site, '--field=id']
  )

  .then(function(uuid) {
    self.uuid = uuid;
    return self.kbox.Promise.resolve(self.uuid);
  });

};

/*
 * Get site aliases
 *
 * terminus sites aliases --json
 */
Terminus.prototype.getSiteAliases = function() {

  return this.__request(['kterminus'], ['sites', 'aliases'], ['--json']);

};

/*
 * Get latest DB backup and save it in /other
 *
 * terminus site backups get
 * --element=database --site=<site> --env=<env> --to-directory=$HOME/Desktop/ --latest
 */
Terminus.prototype.downloadDBBackup = function(site, env) {

  return this.__request(
    ['kterminus'],
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
    ['kterminus'],
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

  var self = this;

  return this.pantheon.getBackups(uuid, env)

  .then(function(backups) {
    var keyString = _.keys(backups).join('');
    return self.kbox.Promise.resolve(_.includes(keyString, 'backup_database'));
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

// Return constructor as the module object.
module.exports = Terminus;
