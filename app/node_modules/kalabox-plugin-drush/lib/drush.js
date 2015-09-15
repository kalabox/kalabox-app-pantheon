#!/usr/bin/env node

'use strict';

var path = require('path');
var _ = require('lodash');

/*
 * Constructor.
 */
function Drush(kbox, app, image, plugin) {

  // We might want to use a different image to run drush commands
  // a la terminus but set drush as the default is no arg
  if (image === undefined) {
    image = 'drush';
  }
  if (plugin === undefined) {
    plugin = 'kalabox-plugin-drush';
  }

  /// Set our things
  // The plugin calling the client
  this.plugin = plugin;
  this.image = image;
  this.app = app;
  this.kbox = kbox;

}

/**
 * Gets plugin conf from the appconfig or from CLI arg
 **/
Drush.prototype.getOpts = function(options) {
  // Override kalabox.json options with command line args
  var defaults = this.app.config.pluginConf[this.plugin];
  _.each(Object.keys(defaults), function(key) {
    if (_.has(options, key) && options[key]) {
      defaults[key] = options[key];
    }
  });
  return defaults;
};

/**
 * Runs a git command on the app data container
 **/
Drush.prototype.cmd = function(payload, options, done) {

  var engine = this.kbox.engine;
  var Promise = this.kbox.Promise;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

  // Run the drush command in the correct directory in the container if the
  // user is somewhere inside the code directory on the host side.
  // @todo: consider if this is better in the actual engine.run command
  // vs here.

  // Get current working directory.
  var cwd = process.cwd();

  // Get code root.
  var codeRoot = this.app.config.codeRoot;

  // Get the branch of current working directory.
  // Run the drush command in the correct directory in the container if the
  // user is somewhere inside the code directory on the host side.
  // @todo: consider if this is better in the actual engine.run command
  // vs here.
  var workingDirExtra = '';
  if (_.startsWith(cwd, codeRoot)) {
    workingDirExtra = cwd.replace(codeRoot, '');
  }
  var codeDir = globalConfig.codeDir;
  var workingDir = '/' + codeDir + workingDirExtra;

  // Get drush version.
  var opts = this.getOpts(options);
  var drushVersion = (opts['drush-version'] === 'backdrush') ?
    'backdrush' :
    'drush' + opts['drush-version'];

  // Image name.
  var image = this.image;

  // Build create options.
  var idObj = this.kbox.util.docker.containerName.createTemp();
  var id = this.kbox.util.docker.containerName.format(idObj);
  var createOpts = this.kbox.util.docker.CreateOpts(id)
    .workingDir(workingDir)
    .env('DRUSH_VERSION', drushVersion)
    .volumeFrom(this.app.dataContainerName)
    .json();

  // force drush entrypoint; needed if we use a different image then
  // then core drush image
  /* jshint ignore:start */
  //jscs:disable
  createOpts.Entrypoint = ["/usr/local/bin/kdrush"];
  /* jshint ignore:end */

  // Build start options.
  var startOpts = this.kbox.util.docker.StartOpts()
    .bind(this.app.config.homeBind, '/ssh')
    .bind(this.app.rootBind, '/src')
    .json();

  // Perform a container run.
  return engine.run(image, payload, createOpts, startOpts)
  // Return.
  .nodeify(done);

};

// Return constructor as the module object.
module.exports = Drush;
