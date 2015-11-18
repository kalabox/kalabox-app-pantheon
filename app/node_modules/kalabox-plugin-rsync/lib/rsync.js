#!/usr/bin/env node

'use strict';

var path = require('path');
var _ = require('lodash');
var PLUGIN_NAME = 'kalabox-plugin-rsync';

/*
 * Constructor.
 */
function Rsync(kbox, app) {

  this.app = app;
  this.kbox = kbox;

}

/**
 * Runs a git command on the app data container
 **/
Rsync.prototype.cmd = function(payload, cli, done) {

  var engine = this.kbox.engine;
  var Promise = this.kbox.Promise;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');

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
  var image = 'rsync';

  // Build create options.
  var createOpts = this.kbox.util.docker.CreateOpts()
    .workingDir(workingDir)
    .env('EVAL', cli)
    .volumeFrom(this.app.dataContainerName)
    .json();

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
module.exports = Rsync;
