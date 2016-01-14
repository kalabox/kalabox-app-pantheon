'use strict';

module.exports = function(kbox, app) {

  /*
   * Cli container def
   */
  var cliContainer = function() {
    return {
      compose: app.composeCore,
      project: app.name,
      opts: {
        stdio: 'inherit',
        services: ['cli']
      }
    };
  };

  /*
   * Helper to run commands on the cli container
   */
  var run = function(entrypoint, cmd) {

    // Build run definition
    var runDef = cliContainer();
    runDef.opts.entrypoint = entrypoint;
    runDef.opts.cmd = cmd;

    // Log the run
    var log = kbox.core.log.make(entrypoint.toUpperCase());
    log.info(runDef);

    return kbox.engine.run(runDef);
  };

  /*
   * Run git commands
   */
  var git = function(cmd) {
    return run('kgit', cmd);
  };

  /*
   * Run rsync commands
   */
  var rsync = function(cmd) {
    return run('rsync', cmd);
  };

  // Return our things
  return {
    git: git,
    rsync: rsync
  };

};
