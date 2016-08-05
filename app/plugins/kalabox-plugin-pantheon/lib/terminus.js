'use strict';

// Node modules
var format = require('util').format;

// Npm modulez
var _ = require('lodash');

/*
 * Constructor.
 */
function Terminus(kbox, app) {
  this.app = app;
  this.kbox = kbox;
}

/*
 * Send a request to a terminus container.
 */
Terminus.prototype.__request = function(cmd, options) {

  // Mimicry
  var self = this;
  var log = self.kbox.core.log.make('KBOX TERMINUS');

  /*
   * Cli container def
   */
  var terminusContainer = function() {
    return {
      compose: self.app.composeCore,
      project: self.app.name,
      opts: {
        services: ['terminus'],
        mode: 'collect',
        app: self.app
      }
    };
  };

  // Run the command
  return self.kbox.Promise.retry(function() {

    // Build run definition
    var runDef = terminusContainer();
    runDef.opts.entrypoint = ['bash', '--login', '-c'];
    cmd.unshift('terminus');
    cmd = cmd.concat(options);
    runDef.opts.cmd = _.uniq(cmd);

    // Log
    log.info(format(
      'Running %s with %j for app %s ',
      cmd,
      runDef.compose,
      runDef.project
    ));

    // Run the thing
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

    // Return valid JSON objects
    //
    .map(function(response) {
      try {
        JSON.parse(response);
      }
      catch (e) {
        // Pass in valid json that we know will be filtered out
        return {date: 'now'};
      }
      return JSON.parse(response);
    })

    // Filter out meta messages
    .filter(function(response) {
      return !response.date && !response.level && !response.message;
    })

    // Catch errors
    .catch(function(err) {
      // Some errors are OK
      if (!_.includes(err.message, 'No backups available.')) {
        throw new Error(err);
      }
    })

    // We can assume we only need the first response here
    .then(function(result) {
      log.debug(format('Terminus returned: %j', result));
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
  // Until https://github.com/pantheon-systems/cli/issues/844 is resolved
  // lets not try to grab --field=connection_mode for now and just
  // return connection_mode if it exists or some default (git?) if it
  // doesnt
  return this.__request(
    ['site', 'environment-info'],
    ['--format=json', '--site=' + site, '--env=' + env]
  )

  // Return the connection mode if we have it
  .then(function(environment) {
    if (_.has(environment[0], 'connection_mode')) {
      return environment[0].connection_mode;
    }
    // It's probably safest to assume this is sftp even if it isnt
    // this way we don't overwrite any changes and it forces us to
    // actually set the connection mode so it doesnt return null
    // next time
    else {
      return 'sftp';
    }
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
    ['site', 'set-connection-mode'],
    ['--format=json', '--site=' + site, '--env=' + env, '--mode=' + mode]
  );
};

/*
 * Get site aliases
 *
 * terminus sites aliases --format=json
 */
Terminus.prototype.getSiteAliases = function() {
  return this.__request(['sites', 'aliases'], ['--format=json']);
};

/*
 * Get environment drush version
 *
 * terminus site drush-version --env=dev --format=json
 */
Terminus.prototype.getDrushVersion = function(site, env) {
  return this.__request(
    ['site', 'drush-version'],
    [
      '--site=' + site,
      '--env=' + env,
      '--format=json'
    ]
  );
};

/*
 * Get latest backup of given site, env and type and save it
 *
 * terminus site backups get
 * --element=<type> --site=<site> --env=<env> --to=$HOME/Desktop/ --latest
 */
Terminus.prototype.downloadBackup = function(site, env, type) {
  return this.__request(
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
  return this.__request(
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
  if (!_.isEmpty(self.bindings)) {
    return self.kbox.Promise.resolve(self.bindings);
  }

  // Make a request
  return this.__request(
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

// Return constructor as the module object.
module.exports = Terminus;
