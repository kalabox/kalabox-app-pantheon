'use strict';

// Modules
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

module.exports = function(kbox) {

  var globalConfig = kbox.core.deps.get('globalConfig');
  var events = kbox.core.events;
  var engine = kbox.engine;
  var Promise = kbox.Promise;

  kbox.whenApp(function(app) {

    // Helpers
    /**
     * Gets plugin conf from the appconfig or from CLI arg
     **/
    var getOpts = function(options) {
      // Grab our options from config
      var defaults = app.config.pluginConf[PLUGIN_NAME];
      // Override any config coming in on the CLI
      _.each(Object.keys(defaults), function(key) {
        if (_.has(options, key) && options[key]) {
          defaults[key] = options[key];
        }
      });
      return defaults;
    };

    /**
     * Runs a terminus command on the app data container
     **/
    var runTerminusCMD = function(cmd, opts, done) {

      // Run the terminus command in the correct directory in the container if the
      // user is somewhere inside the code directory on the host side.
      // @todo: consider if this is better in the actual engine.run command
      // vs here.

      // Get current working directory.
      var cwd = process.cwd();

      // Get code root.
      var codeRoot = app.config.codeRoot;

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
      var createOpts = kbox.util.docker.CreateOpts()
        .workingDir(workingDir)
        .volumeFrom(app.dataContainerName)
        .json();

      // Build start options.
      var startOpts = kbox.util.docker.StartOpts()
        .bind(app.config.homeBind, '/ssh')
        .bind(path.join(app.config.homeBind, '.terminus'), '/root/.terminus')
        .bind(app.rootBind, '/src')
        .json();

      // Perform a container run.
      return engine.run(image, cmd, createOpts, startOpts)
      // Return.
      .nodeify(done);

    };

    // Tasks
    // drush wrapper: kbox terminus COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'terminus'];
      task.description = 'Run terminus commands.';
      task.kind = 'delegate';
      task.func = function(done) {
        var opts = getOpts(this.options);
        var cmd = this.payload;
        runTerminusCMD(cmd, opts, done);
      };
    });

  });

};
