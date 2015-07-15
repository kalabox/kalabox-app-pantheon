#!/usr/bin/env node

'use strict';

// Intrinsic modules.
var crypto = require('crypto');
var util = require('util');
var path = require('path');

// Npm modulez
var _ = require('lodash');
var Promise = require('bluebird');
Promise.longStackTraces();

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

/*
 * Constructor.
 */
function Terminus(kbox, app) {

  this.app = app;
  this.kbox = kbox;

}

/*
 * WE DEFINITELY NEED TO EITHER RETRIEVE AND VALIDATE A SESSION BEFORE WE
 * ACTALLY DO STUFF OR LOGIN
 *
 * @todo @todo @todo @todo @todo @todo @todo @todo @todo @todo @todo @todo
 */

/*
 * Return the metric record's ID, or create one if it doesn't have one.
 */
Terminus.prototype.__buildQuery = function(cmd, args, options) {

  return cmd.concat(args).concat(options);

};

/*
 * Send and handle a REST request.
 */
Terminus.prototype.__request = function(cmd, args, options) {

  // Save for later.
  var self = this;

  var globalConfig = this.kbox.core.deps.get('globalConfig');
  // @todo: get this to actually be UUID
  var id = crypto.randomBytes(4).toString('hex');
  // Build create options.
  // @todo: use random id for the name so we can launch many
  var createOpts = this.kbox.util.docker.CreateOpts('kalabox_terminus')
    .workingDir('/' + globalConfig.codeDir)
    .volumeFrom(this.app.dataContainerName)
    .json();
  /* jshint ignore:start */
  //jscs:disable
  createOpts.Entrypoint = ["/bin/sh", "-c"];
  /* jshint ignore:end */

  // Get provider.
  return this.kbox.engine.provider()
  .then(function(provider) {

    // Build start options
    var homeBind = self.app.config.homeBind;
    var startOpts = self.kbox.util.docker.StartOpts()
      .bind(path.join(homeBind, '.terminus'), '/root/.terminus')
      .bind(homeBind, '/ssh')
      .bind(self.app.rootBind, '/src')
      .json();

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

  var engine = this.kbox.engine;
  var Promise = this.kbox.Promise;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

  // Run the terminus command in the correct directory in the container if the
  // user is somewhere inside the code directory on the host side.
  // @todo: consider if this is better in the actual engine.run command
  // vs here.

  // Get current working directory.
  var cwd = process.cwd();

  // Get code root.
  var codeRoot = this.app.config.codeRoot;

  // Get the branch of current working directory.
  // Run the terminus command in the correct directory in the container if the
  // user is somewhere inside the code directory on the host side.
  // @todo: consider if this is better in the actual engine.run command
  // vs here.
  var workingDirExtra = '';
  if (_.startsWith(cwd, codeRoot)) {
    workingDirExtra = cwd.replace(codeRoot, '');
  }
  var codeDir = globalConfig.codeDir;
  var workingDir = '/' + codeDir + workingDirExtra;

  // Image name.
  var image = 'terminus';

  // Build create options.
  var createOpts = this.kbox.util.docker.CreateOpts()
    .workingDir(workingDir)
    .volumeFrom(this.app.dataContainerName)
    .json();

  // Build start options.
  var startOpts = this.kbox.util.docker.StartOpts()
    .bind(this.app.config.homeBind, '/ssh')
    .bind(path.join(this.app.config.homeBind, '.terminus'), '/root/.terminus')
    .bind(this.app.rootBind, '/src')
    .json();

  // Perform a container run.
  return engine.run(image, cmd, createOpts, startOpts)
  // Return.
  .nodeify(done);

};

/*
 * Get connection mode
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Terminus.prototype.getConnectionMode = function(site, env) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(
    ['terminus'],
    ['site', 'connection-mode'],
    ['--json', '--site=' + site, '--env=' + env]
  );

};

/*
 * Set connection mode
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV" --set=git
 */
Terminus.prototype.setConnectionMode = function(site, env) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(
    ['terminus'],
    ['site', 'connection-mode'],
    ['--json', '--site=' + site, '--env=' + env, '--set=git']
  );

};

/*
 * Get site uuid
 * terminus site info --site="$PANTHEON_SITE" --field=id
 */
Terminus.prototype.getUUID = function(site) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(
    ['terminus'],
    ['site', 'info'],
    ['--json', '--site=' + site, '--field=id']
  );

};

/*
 * Get site aliases
 * terminus sites aliases
 */
Terminus.prototype.getSiteAliases = function() {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(['terminus'], ['sites', 'aliases'], ['--json']);

};

/*
 * Get latest DB backup and save it in /other
 * terminus site backup get --element=database --site=<site>
 * --env=<env> --to-directory=$HOME/Desktop/ --latest
 */
Terminus.prototype.getDB = function(site, env) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  // @todo: we need to generate a random
  return this.__request(
    ['terminus'],
    ['site', 'backup', 'get'],
    [
      '--json',
      '--element=database',
      '--site=' + site,
      '--env=' + env,
      '--to-directory=/src/config/terminus',
      '--latest'
    ]);
};


// Return constructor as the module object.
module.exports = Terminus;
