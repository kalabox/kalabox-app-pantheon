#!/usr/bin/env node

'use strict';

var path = require('path');
var _ = require('lodash');
var PLUGIN_NAME = 'kalabox-plugin-git';

/*
 * Constructor.
 */
function Git(kbox, app) {

  this.app = app;
  this.kbox = kbox;

}

/**
 * Gets plugin conf from the appconfig or from CLI arg
 **/
Git.prototype.getOpts = function(options) {
  // Override kalabox.json options with command line args
  if (this.app.config.pluginConf[PLUGIN_NAME]) {
    var defaults = this.app.config.pluginConf[PLUGIN_NAME];
    _.each(Object.keys(defaults), function(key) {
      if (_.has(options, key) && options[key]) {
        defaults[key] = options[key];
      }
    });
  }

  return defaults || null;
};

/**
 * Runs a git command on the app data container
 **/
Git.prototype.cmd = function(payload, options, done) {

  var engine = this.kbox.engine;
  var Promise = this.kbox.Promise;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

  var opts = this.getOpts(options);

  // Only use git user/email if its been explictily set
  // This way we can allow other things to set this var if its not
  // present
  if (opts && opts['git-username']) {
    var gitUser = opts['git-username'];
  }
  if (opts && opts['git-email']) {
    var gitEmail = opts['git-email'];
  }

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

  // Image name.
  var image = 'git';

  // Build create options.
  var createOpts = this.kbox.util.docker.CreateOpts()
    .workingDir(workingDir)
    .volumeFrom(this.app.dataContainerName);

  // Add these if they are set
  if (gitUser) {
    createOpts.env('GITUSER', gitUser);
  }
  if (gitEmail) {
    createOpts.env('GITEMAIL', gitEmail);
  }

  // Convert to json object
  createOpts = createOpts.json();

  // Build start options.
  var startOpts = this.kbox.util.docker.StartOpts()
    .bind(this.app.config.homeBind, '/ssh')
    .json();

  // Perform a container run.
  return engine.run(image, payload, createOpts, startOpts)
  // Return.
  .nodeify(done);

};

// Return constructor as the module object.
module.exports = Git;
