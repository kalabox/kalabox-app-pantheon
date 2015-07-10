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
function Client(image, kbox) {

  this.image = image;
  this.kbox = kbox;

}

/*
 * Return the metric record's ID, or create one if it doesn't have one.
 */
Client.prototype.__buildQuery = function(cmd, args, options) {

  cmd.unshift('terminus');
  return cmd.concat(args).concat(options);

};

/*
 * Send and handle a REST request.
 */
Client.prototype.__request = function(cmd, args, options) {

  // Save for later.
  var self = this;

  // Build create options.
  var hashMe = crypto.createHash('sha1').digest('hex');
  var createOpts = this.kbox.util.docker.CreateOpts(hashMe)
    .json();
  /* jshint ignore:start */
  //jscs:disable
  createOpts.Entrypoint = ["/bin/sh", "-c"];
  /* jshint ignore:end */

  // Get provider.
  return this.kbox.engine.provider()
  // Create app.
  .then(function(provider) {
    // Build start options
    var home = this.kbox.core.deps.lookup('globalConfig').home;
    var startOpts = this.kbox.util.docker.StartOpts()
      .bind(path.join(home, '.terminus'), '/root/.terminus')
      .json();

    var query = self.__buildQuery(cmd, args, options);
    return this.kbox.engine.use(this.image, createOpts, startOpts, function(container) {
      return self.kbox.engine.queryData(container.id, query);
    });
  });
};

/*
 * Get connection mode
 * terminus site connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Client.prototype.getConnectionMode = function(site, env) {

  // @todo: can we use something like optimist to do better
  // options parsing?
  return this.__request(
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
  return this.__request(
    ['sites'],
    ['aliases'],
    ['--json']
  );

};


// Return constructor as the module object.
module.exports = Client;
