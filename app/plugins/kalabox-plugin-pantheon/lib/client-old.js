#!/usr/bin/env node

'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
Promise.longStackTraces();
var util = require('util');

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
  // @todo: generate uuid for name
  var createOpts = this.kbox.util.docker.CreateOpts('kalabox_terminus')
    .json();
  /* jshint ignore:start */
  //jscs:disable
  createOpts.Entrypoint = ["/bin/sh", "-c"];
  /* jshint ignore:end */

  // Build start options.
  var startOpts = this.kbox.util.docker.StartOpts()
    .bind('/terminus:/src/config/terminus')
    .json();

  var query = self.__buildQuery(cmd, args, options);
  return this.kbox.engine.use(this.image, createOpts, startOpts, function(container) {
    return self.kbox.engine.queryData(container.id, query);
  });

};

/*
 * Get full list of all metrics records.
 */
Client.prototype.getProducts = function() {

  return this.__request(['products'], ['list'], ['--json']);

};

/*
 * Get full list of all metrics records.
 */
Client.prototype.whoami = function() {

  return this.__request(['auth', 'whoami'], [], ['--json']);

};

/*
 * Get full list of all metrics records.
 */
Client.prototype.logout = function() {

  return this.__request(['auth', 'logout'], [], []);

};


/*
 * Get full list of all metrics records.
 */
Client.prototype.login = function(email, password) {

  return this.__request(['auth', 'login'], [email], ['--password=' + password, '--json']);

};

/*
 * Get full list of all metrics records.
 */
Client.prototype.getSites = function() {

  return this.__request(['sites', 'list'], [], ['--json']);

};

// Return constructor as the module object.
module.exports = Client;
