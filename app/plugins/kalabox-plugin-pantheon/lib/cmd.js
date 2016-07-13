'use strict';

module.exports = function(kbox, app) {

  // node modules
  var format = require('util').format;

  // npm modules
  var _ = require('lodash');

  // kbox modules
  var log = kbox.core.log.make('KBOX CLI');

  /*
   * Cli container def
   */
  var defaultCliContainer = function() {
    return {
      compose: app.composeCore,
      project: app.name,
      opts: {
        mode: kbox.core.deps.get('mode') === 'gui' ? 'collect' : 'attach',
        services: ['cli'],
        app: app
      }
    };
  };

  /*
   * Terminus container def
   */
  var terminusContainer = function() {
    return {
      compose: app.composeCore,
      project: app.name,
      opts: {
        mode: kbox.core.deps.get('mode') === 'gui' ? 'collect' : 'attach',
        services: ['terminus'],
        app: app
      }
    };
  };

  /*
   * Helper to run commands on the cli container
   */
  var run = function(entrypoint, cmd, opts) {

    // Build run definition
    var runDef = opts || defaultCliContainer();
    runDef.opts.entrypoint = entrypoint;
    runDef.opts.cmd = cmd;

    // Log the run
    log.info(format(
      'Running %s using %s with %j for app %s ',
      cmd,
      entrypoint,
      runDef.compose,
      runDef.project
    ));

    return kbox.Promise.retry(function() {
      app.env.setEnv('KALABOX_CLI_WORKING_DIR', '/code');
      return kbox.engine.run(runDef);
    });
  };

  /*
   * Run git commands
   */
  var git = function(cmd) {
    cmd.unshift('git');
    return run('usermap', cmd);
  };

  /*
   * Run drush commands
   */
  var drush = function(cmd) {
    cmd.unshift('drush');
    return run('usermap', cmd, terminusContainer());
  };

  /*
   * Run small script to ensure Pantheon SSH keys are setup correctly
   */
  var ensureSSHKeys = function() {
    return run('usermap', ['pantheon-ensure-keys'], terminusContainer());
  };

  /*
   * Run rsync commands
   */
  var rsync = function(source, dest) {

    /*
     * Basic map function to translate a directory into
     * a rsync exclusion string
     */
    var exclude = function(dir) {
      return ['--exclude', dir];
    };

    // Generic list of dirs to exclude
    var dirs = [
      'js',
      'css',
      'ctools',
      'imagecache',
      'xmlsitemap',
      'backup_migrate',
      'php/twig/*',
      'styles/*',
      'less'
    ];

    // Our ssh options
    var sshOptions = kbox.util.shell.escSpaces([
      'ssh',
      '-p',
      '2222',
      '-i',
      '$HOME/.ssh/pantheon.kalabox.id_rsa',
      '-o',
      'StrictHostKeyChecking=no'
    ], 'linux');

    // Base command
    var cmd = [
      '-rlvz',
      '--size-only',
      '--ipv4',
      '--progress',
      '-e',
      '"' + sshOptions + '"'
    ];
    cmd = cmd.concat(_.flatten(_.map(dirs, exclude)));

    // Add source and destination
    cmd.push(source);
    cmd.push(dest);

    // Run the command
    cmd.unshift('rsync');
    return run('usermap', cmd);
  };

  // Return our things
  return {
    ensureSSHKeys: ensureSSHKeys,
    git: git,
    rsync: rsync,
    drush: drush
  };

};
