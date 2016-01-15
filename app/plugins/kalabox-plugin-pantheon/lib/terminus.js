'use strict';

// Npm modulez
var _ = require('lodash');

/*
 * Constructor.
 */
function Terminus(kbox, app) {

  // Kbox things
  this.app = app;
  this.kbox = kbox;

  // @todo: more caching?
  this.uuid = undefined;
  this.bindings = undefined;

}

/*
 * Send a request to a terminus container.
 */
Terminus.prototype.__request = function(entrypoint, cmd, options) {

  // Mimicry
  var self = this;

  /*
   * Cli container def
   */
  var terminusContainer = function() {
    return {
      compose: self.app.composeCore,
      project: self.app.name,
      opts: {
        services: ['terminus'],
        collect: true,
        stdio: ['inherit', 'pipe', 'inherit']
      }
    };
  };

  // Build run definition
  var runDef = terminusContainer();
  runDef.opts.entrypoint = 'bash --login -c';
  cmd.unshift(entrypoint);
  cmd = cmd.concat(options);
  runDef.opts.cmd = cmd;

  // Log
  var log = this.kbox.core.log.make('TERMINUS');
  log.info('Run definition: ', runDef);

  // Run the command
  return this.kbox.Promise.retry(function() {
    return self.kbox.engine.run(runDef)

    // We can assume we only need the first response here since
    // we are only running one terminus command at a time
    .then(function(responses) {
      return responses[0].split('\r\n');
    })

    // Filter out empties
    .filter(function(response) {
      return !_.isEmpty(response);
    })

    // Return objects
    .map(function(response) {
      return JSON.parse(response);
    })

    // Filter out meta messages
    .filter(function(response) {
      return !response.date && !response.level && !response.message;
    })

    // We can assume we only need the first response here
    .then(function(result) {
      log.info('Run returned: ', result);
      return result;
    });
  });
};

/*
 * TERMINUS COMMANDS
 */

/*
 * Wake the site
 *
 * terminus site wake --site="$PANTHEON_SITE" --env="$PANTHEON_ENV"
 */
Terminus.prototype.wakeSite = function(site, env) {

  return this.__request(
    ['terminus'],
    ['site', 'wake'],
    ['--site=' + site, '--env=' + env, '--format=json']
  );

};

/*
 * Get connection mode
 *
 * terminus site environment-info --field=connection_mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Terminus.prototype.getConnectionMode = function(site, env) {

  // Grab the data
  return this.__request(
    ['terminus'],
    ['site', 'environment-info', '--field=connection_mode'],
    ['--format=json', '--site=' + site, '--env=' + env]
  );

};

/*
 * Check for uncommitted changes
 *
 * terminus site code diffstat --site="$PANTHEON_SITE" --env="$PANTHEON_ENV")
 */
Terminus.prototype.hasChanges = function(site, env) {

  // Grab the data
  return this.__request(
    ['terminus'],
    ['site', 'code', 'diffstat'],
    ['--format=json', '--site=' + site, '--env=' + env]
  )

  // Return whether we have changes or not
  .then(function(data) {
    return !_.isEmpty(data);
  });

};

/*
 * Set connection mode
 *
 * terminus site set-connection-mode --site="$PANTHEON_SITE" --env="$PANTHEON_ENV" --mode=git
 */
Terminus.prototype.setConnectionMode = function(site, env, mode) {

  return this.__request(
    ['terminus'],
    ['site', 'set-connection-mode'],
    ['--format=json', '--site=' + site, '--env=' + env, '--mode=' + mode]
  );

};

/*
 * Get site uuid
 *
 * terminus site info --site="$PANTHEON_SITE" --field=id
 */
Terminus.prototype.getUUID = function(site) {

  // More of this sort of thing
  var self = this;

  // We run this a lot so lets cache per run and do a lookup before we
  // make a request
  if (self.uuid !== undefined) {
    return self.kbox.Promise.resolve(self.uuid);
  }

  // Make a request
  return self.__request(
    ['terminus'],
    ['site', 'info'],
    ['--format=json', '--site=' + site]
  )

  .then(function(data) {
    self.uuid = data[0].id;
    return self.kbox.Promise.resolve(self.uuid);
  });

};

/*
 * Get site aliases
 *
 * terminus sites aliases --format=json
 */
Terminus.prototype.getSiteAliases = function() {

  return this.__request(['terminus'], ['sites', 'aliases'], ['--format=json']);

};

/*
 * Get latest backup of given site, env and type and save it
 *
 * terminus site backups get
 * --element=<type> --site=<site> --env=<env> --to=$HOME/Desktop/ --latest
 */
Terminus.prototype.downloadBackup = function(site, env, type) {

  // Download the backup and return its location
  return this.__request(
    ['terminus'],
    ['site', 'backups', 'get'],
    [
      '--site=' + site,
      '--env=' + env,
      '--element=' + type,
      '--to=/backups',
      '--latest',
      '--format=json'
    ]
  );

};

/*
 * Create a backup of given site, env and type
 *
 * terminus site backup create
 * --element=database --site=<site> --env=<env>
 */
Terminus.prototype.createBackup = function(site, env, type) {

  // @todo: validate type?

  return this.__request(
    ['terminus'],
    ['site', 'backups', 'create'],
    [
      '--format=json',
      '--element=' + type,
      '--site=' + site,
      '--env=' + env
    ]
  );

};

/*
 * Checks to see if there is a backup of given type available for site and env
 */
Terminus.prototype.hasBackup = function(site, env, type) {

  return this.__request(
    ['terminus'],
    ['site', 'backups', 'list'],
    [
      '--format=json',
      '--element=' + type,
      '--site=' + site,
      '--env=' + env
    ]
  )

  .then(function(backups) {
    return !_.isEmpty(backups);
  });

};

/*
 * Get binding info for a site UUID
 *
 * https://dashboard.getpantheon.com/api/sites/UUID/bindings
 */
Terminus.prototype.connectionInfo = function(site, env) {

  // More of this sort of thing
  var self = this;

  // We run this a lot so lets cache per run and do a lookup before we
  // make a request
  if (self.bindings !== undefined) {
    return self.kbox.Promise.resolve(self.bindings);
  }

  // Make a request
  return this.__request(
    ['terminus'],
    ['site', 'connection-info'],
    [
      '--format=json',
      '--site=' + site,
      '--env=' + env
    ]
  )

  // Set cache and return
  .then(function(data) {
    self.bindings = data[0];
    return self.kbox.Promise.resolve(self.bindings);
  });

};

/*
 * This one is a little weird since its not really a terminus call
 * but its something we should keep outside of push/pull for reusability
 * @todo: maybe this goes into a util mod at some point?
 * @todo: eventually we might want to do this by framework?
 *
 * https://dashboard.getpantheon.com/api/sites/UUID/bindings
 */
Terminus.prototype.getExcludes = function() {

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

  // Return exclude array
  return _.flatten(_.map(dirs, exclude));

};

// Return constructor as the module object.
module.exports = Terminus;
