'use strict';

// Intrinsic modules.
var path = require('path');
var fs = require('fs');

// Npm modulez
var _ = require('lodash');

/*
 * Constructor.
 */
function Terminus(kbox, app) {

  // Terminus node clients
  // for some things it is better to use the node client because we dont have
  // to worry about an error we need to handle killing the whole damn thing
  var Client = require('./client.js');
  this.pantheon = new Client(kbox, app);

  // Kbox things
  this.app = app;
  this.kbox = kbox;

  // @todo: more caching?
  this.uuid = undefined;

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
        service: 'terminus',
        collect: true,
        stdio: [process.stdin, 'pipe', process.stderr]
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
  log.debug('Run definition: ', runDef);

  // Run the command
  return this.kbox.engine.run(runDef)

  // We can assume we only need the first response here since
  // we are only running one terminus command at a time
  .then(function(responses) {
    return responses[0];
  })

  // Parse to json
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
  )

  // Return a parsed json object
  .then(function(connectionMode) {
    return JSON.parse(connectionMode);
  });

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

    // Split into an array of messages
    var messages = data.split('\n');
    // Last message is empty
    messages.pop();
    var last = _.last(messages);

    // Parse the last message
    var response = JSON.parse(_.trim(last));
    return response.message !== 'No changes on server.';

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

  // need this for all the other things
  var self = this;

  // Download the backup and return its location
  // retry if needed
  return this.kbox.Promise.retry(function() {
    return self.__request(
      ['terminus'],
      ['site', 'backups', 'get'],
      [
        '--site=' + site,
        '--env=' + env,
        '--element=' + type,
        '--to=/src/config/terminus/',
        '--latest',
        '--format=json'
      ]
    )

    // Catch the error and see if we need to remove an old failed backup
    // first and then retry
    .catch(function(err) {
      // Extract messages from error and array them
      var msgs  = err.message.substring(err.message.indexOf('{')).split('\n');
      var exists = _.find(msgs, function(msg) {
        var obj = JSON.parse(_.trim(msg));
        return _.includes(obj.message, 'already exists');
      });

      // If target file already exists then extract its name, delete and retry
      if (exists !== undefined) {
        // Extract the path
        var getRight = JSON.parse(exists).message.split('(');
        var getLeft = getRight[1].split(')');
        var containerPath = getLeft[0];

        // Get path on host filesystem
        var filename = path.basename(containerPath);
        var filePath = path.join(self.app.root, 'config', 'terminus', filename);

        // Remove the offending file
        fs.unlinkSync(filePath);
      }

      // And finally throw the error
      throw new Error(err);
    })

    // Parse the data to get the filename
    .then(function(data) {
      var dataz = _.dropRight(data.split('\n'), 1);
      var response = JSON.parse(_.last(dataz));
      return _.trim(_.last(response.message.split('Downloaded ')));
    });
  });

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
    ]);
};

/*
 * Checks to see if there is a backup of given type available for site and env
 */
Terminus.prototype.hasBackup = function(uuid, env, type) {

  var self = this;

  return this.pantheon.getBackups(uuid, env)

  .then(function(backups) {
    var keys = _.keys(backups).join('');
    var manual = 'backup_' + type;
    var auto = 'automated_' + type;
    var hasBackup = _.includes(keys, manual) || _.includes(keys, auto);
    return self.kbox.Promise.resolve(hasBackup);
  });

};

/*
 * Get binding info for a site UUID
 *
 * https://dashboard.getpantheon.com/api/sites/UUID/bindings
 */
Terminus.prototype.getBindings = function(uuid) {

  return this.pantheon.getBindings(uuid);

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
    return ['--exclude', '\'' + dir + '\''].join(' ');
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

  // Return exclude string
  return _.map(dirs, exclude).join(' ');

};

// Return constructor as the module object.
module.exports = Terminus;
