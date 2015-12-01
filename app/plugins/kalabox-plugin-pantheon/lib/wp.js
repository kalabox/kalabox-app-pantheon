'use strict';

module.exports = function(kbox) {

  // Modules
  var _ = require('lodash');

  // "Constants"
  var PLUGIN_NAME = 'kalabox-plugin-pantheon';
  var TERMINUS = 'terminus:t0.9.3';

  // Kbox modules
  var globalConfig = kbox.core.deps.get('globalConfig');
  var engine = kbox.engine;

  kbox.ifApp(function(app) {

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
     * Runs a wp-cli command on the app data container
     **/
    var runWpCMD = function(cmd, opts, done) {

      // Run the wp-cli command in the correct directory in the container if the
      // user is somewhere inside the code directory on the host side.
      // @todo: consider if this is better in the actual engine.run command
      // vs here.

      // Get current working directory.
      var cwd = process.cwd();

      // Get code root.
      var codeRoot = app.config.codeRoot;

      // Get the branch of current working directory.
      // Run the wp-cli command in the correct directory in the container if the
      // user is somewhere inside the code directory on the host side.
      // @todo: consider if this is better in the actual engine.run command
      // vs here.
      var workingDirExtra = '';
      if (_.startsWith(cwd, codeRoot)) {
        workingDirExtra = cwd.replace(codeRoot, '');
      }
      var codeDir = globalConfig.codeDir;
      var workingDir = '/' + codeDir + workingDirExtra;

      // Build create options.
      var createOpts = kbox.util.docker.CreateOpts()
        .workingDir(workingDir)
        .volumeFrom(app.dataContainerName)
        .json();

      // Change entrypoint to wp-cli
      /* jshint ignore:start */
      //jscs:disable
      createOpts.Entrypoint = ["/usr/local/bin/kwp"];
      /* jshint ignore:end */

      // Build start options.
      var startOpts = kbox.util.docker.StartOpts()
        .bind(app.config.homeBind, '/ssh')
        .bind(app.rootBind, '/src')
        .json();

      // Perform a container run.
      return engine.run(TERMINUS, cmd, createOpts, startOpts)
      // Return.
      .nodeify(done);

    };

    // Tasks
    // wp-cli wrapper: kbox wp COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'wp'];
      task.category = 'appCmd';
      task.description = 'Run wp-cli commands.';
      task.kind = 'delegate';
      task.func = function(done) {
        var opts = getOpts(this.options);
        var cmd = this.payload;
        cmd.unshift('--allow-root');
        runWpCMD(cmd, opts, done);
      };
    });

  });

};
