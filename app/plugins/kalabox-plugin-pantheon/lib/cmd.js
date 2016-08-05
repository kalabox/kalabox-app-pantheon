'use strict';

module.exports = function(kbox, app) {

  // node modules
  var format = require('util').format;

  // npm modules
  var _ = require('lodash');

  // kbox modules
  var log = kbox.core.log.make('PANTHEON CMD RUN');
  var Promise = kbox.Promise;

  // Terminus client
  var Terminus = require('./terminus.js');
  var terminus = new Terminus(kbox, app);

  /*
   * Get a string of dru[a; tables whose data to skip
   */
  var getDrupalSkipData = function() {

    // Default options
    var tables = ['cache', 'cache_*', 'history', 'sessions', 'watchdog'];

    // Extra tables
    var extras = app.config.pluginconfig.pantheon.skiptables || [];

    // Create the string and return
    return _.union(tables, extras).join(',');

  };

  /*
   * Get the straight mysqldump command using pantheon connection info
   */
  var mysqlDumpCmd = function(bindings) {
    return [
      'mysqldump',
      '-u',
      bindings.mysql_username,
      '-p' + bindings.mysql_password,
      '-h',
      bindings.mysql_host,
      '-P',
      bindings.mysql_port.toString(),
      '--no-autocommit',
      '--single-transaction',
      '--opt',
      '-Q',
      bindings.mysql_database
    ];
  };

  /*
   * Get the mysql dump via drush based ssh tunnel
   */
  var drushSqlDumpCmd = function(alias) {
    return [
      'drush',
      alias,
      'sql-connect',
      '&&',
      'drush',
      alias,
      'sql-dump'
    ];
  };

  /*
   * Switch to return the correct msyql command based on the framework
   * see: https://github.com/kalabox/kalabox/issues/1329
   */
  var sqlDumpCmd = function(site, env) {

    // Get the framework, default to the wordpress dump since it is LCD
    var framework = app.config.pluginconfig.pantheon.framework || 'wordpress';

    // Determine whether to use drush or not
    var useDrush = (framework !== 'wordpress');

    // Construct the alias
    var alias = ['@pantheon', site, env].join('.');

    // Get the connection info or drush version
    return Promise.try(function() {
      if (useDrush) {
        return terminus.getDrushVersion(site, env);
      }
      else {
        return terminus.connectionInfo(site, env);
      }
    })

    // Construct the command and optimize if needed
    .then(function(data) {

      // Basic import command
      var cmd = (useDrush) ? drushSqlDumpCmd(alias) : mysqlDumpCmd(data);

      // If this is drush import and we are drush 7+ then optimize
      if (useDrush && data >= 7) {
        cmd.push('--structure-tables-list=' + getDrupalSkipData());
      }

      // Return cmd
      return cmd;

    });

  };

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
  var importDB = function(site, env) {

    // Get the dump command
    return sqlDumpCmd(site, env)

    // Add the pipe and return the command
    .then(function(cmd) {
      cmd.push('|');
      cmd.push('mysql');
      cmd.push('-A');
      cmd.push('-u');
      cmd.push('$DB_USER');
      cmd.push('-p$DB_PASSWORD');
      cmd.push('-h');
      cmd.push('$DB_HOST');
      cmd.push('$DB_NAME');
      return run('usermap', cmd, terminusContainer());
    });

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
