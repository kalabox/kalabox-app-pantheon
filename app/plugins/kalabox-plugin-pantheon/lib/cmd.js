'use strict';

module.exports = function(kbox, app) {

  // node modules
  var format = require('util').format;

  // npm modules
  var _ = require('lodash');

  // kbox modules
  var log = kbox.core.log.make('PANTHEON CMD RUN');

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
   * Appserver run def template
   */
  var appserverContainer = function() {
    return {
      compose: app.composeCore,
      project: app.name,
      opts: {
        services: ['appserver'],
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
   * Helper to run commands on a container
   */
  var run = function(entrypoint, cmd, service) {

    // Build run definition
    var runDef = service || defaultCliContainer();
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
   * Run Import DB command
   */
  var importDB = function(alias) {
    var cmd = ['drush',
      alias,
      'sql-connect',
      '&&',
      'drush',
      alias,
      'sql-dump',
      '|',
      'mysql',
      '-u',
      '$DB_USER',
      '-p$DB_PASSWORD',
      '-h',
      '$DB_HOST',
      '$DB_NAME'
    ];
    return run('usermap', cmd, terminusContainer());
  };

  /*
   * Run Export DB command
   */
  var exportDB = function(alias, connection) {
    var cmd = [
      'drush',
      alias,
      'sql-dump',
      '|',
      connection
    ];
    return run('usermap', cmd, terminusContainer());
  };

  /*
   * Run extract commands
   */
  var extract = function(archive, env) {

    // The extraction command
    var extract = [
      'tar',
      '-zxvf',
      archive,
      '-C',
      '/tmp',
      '&&',
      'mv',
      '/tmp/files_' + env + '/*',
      '/media'
    ];

    // Extract and remove
    return run('usermap', extract)
    .then(function() {
      return run('rm', ['-f', archive]);
    });

  };

  /*
   * Run small script to ensure Pantheon SSH keys are setup correctly
   */
  var ensureSSHKeys = function() {
    return run(['bash', '-c'], ['pantheon-ensure-keys'], terminusContainer());
  };

  /*
   * Ensure our symlink is setup correctly
   */
  var ensureSymlink = function() {
    // Get the correct filemount
    var filemount = '/code/' + app.env.getEnv('KALABOX_APP_PANTHEON_FILEMOUNT');
    // Force remove the filemount
    return run('rm', ['-rf', filemount], appserverContainer())
    .then(function() {
      return run('ln', ['-nsf', '/media', filemount], appserverContainer());
    });
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
      '2222'
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
    ensureSymlink: ensureSymlink,
    extract: extract,
    importDB: importDB,
    exportDB: exportDB,
    git: git,
    rsync: rsync,
    drush: drush
  };

};
