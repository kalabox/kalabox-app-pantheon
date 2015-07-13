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

/*
 * Constructor.
 */
function Client(kbox, app) {

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
Client.prototype.__buildQuery = function(image, cmd, args, options) {

  cmd.unshift(image);
  return cmd.concat(args).concat(options);

};

/*
 * Send and handle a REST request.
 */
Client.prototype.__request = function(image, cmd, args, options) {

  // Save for later.
  var self = this;

  var globalConfig = this.kbox.core.deps.get('globalConfig');
  var hashMe = crypto.createHash('sha1').digest('hex');
  // Build create options.
  var createOpts = this.kbox.util.docker.CreateOpts(hashMe)
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
    var home = this.kbox.core.deps.lookup('globalConfig').home;
    var startOpts = this.kbox.util.docker.StartOpts()
      .bind(path.join(home, '.terminus'), '/root/.terminus')
      .bind(this.app.config.homeBind, '/ssh')
      .bind(this.app.rootBind, '/src')
      .json();

    var query = self.__buildQuery(cmd, args, options);
    return this.kbox.engine.use(image, createOpts, startOpts, function(container) {
      return self.kbox.engine.queryData(container.id, query);
    });
  });
};

/*
 * TERMINUS COMMANDS
 */

/*
 * Get connection mode
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Client.prototype.getConnectionMode = function(site, env) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(
    'terminus',
    ['site'],
    ['connection-mode'],
    ['--json', '--site=' + site, '--env=' + env]
  );

};

/*
 * Set connection mode
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV" --set=git
 */
Client.prototype.setConnectionMode = function(site, env) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(
    'terminus',
    ['site'],
    ['connection-mode'],
    ['--json', '--site=' + site, '--env=' + env, '--set=git']
  );

};

/*
 * Get site uuid
 * terminus site info --site="$PANTHEON_SITE" --field=id
 */
Client.prototype.getUUID = function(site) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(
    'terminus',
    ['site'],
    ['info'],
    ['--json', '--site=' + site, '--field=id']
  );

};

/*
 * Get site aliases
 * terminus sites aliases
 */
Client.prototype.getSiteAliases = function() {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request('terminus', ['sites'], ['aliases'], ['--json']);

};

/*
 * GIT COMMANDS
 */

/*
 * Clone a repo
 * git clone "$REPO" ./
 */
Client.prototype.cloneCode = function(repo) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request('git', ['clone'], [repo, './'], []);

};

/*
 * Pull a repo
 * git pull origin $BRANCH
 */
Client.prototype.pullCode = function(remote, branch) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  if (remote === undefined) {
    remote = 'origin';
  }
  if (branch === undefined) {
    branch = 'master';
  }

  //
  return this.__request('git', ['pull'], [remote, branch], []);

};



// Return constructor as the module object.
module.exports = Client;
