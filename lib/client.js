'use strict';

/**
 * Module for interacting with the pantheon api directly from node
 * @module client.js
 */

// Node modules.
var fs = require('fs-extra');
var format = require('util').format;
var path = require('path');
var urls = require('url');
var _ = require('lodash');

/*
 * Constructor.
 */
function Client(kbox) {

  // Load in our kbox object and some relevant things
  this.kbox = kbox;
  this.Promise = kbox.Promise;
  this.log = this.kbox.core.log.make('PANTHEON NODE API');

  // Make sure we have a token directory
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');
  var homeDir = globalConfig.home;
  this.tokenDir = path.join(homeDir, '.terminus', 'cache', 'tokens');
  if (!fs.existsSync(this.tokenDir)) {
    fs.mkdirpSync(this.tokenDir);
  }

  // Define the pantheon endpoint protocol/host/port
  this.target = {
    protocol: 'https',
    hostname: 'dashboard.pantheon.io',
    port: '443'
  };

}

/*
 * Add the token to the token cache
 */
Client.prototype.addToken = function(email, token) {
  var tokenFile = path.join(this.tokenDir, email);
  var data = JSON.stringify({email: email, token: token});
  fs.writeFileSync(tokenFile, data);
  this.log.info(format('Added Pantheon token at %s.', tokenFile));
};

/*
 * Get a specific token from the cache
 */
Client.prototype.getToken = function(email) {
  var tokenFile = path.join(this.tokenDir, email);
  var data = fs.readFileSync(tokenFile, 'utf8');
  return (JSON.parse(data).token);
};

/*
 * Get a list of all tokens in the cache
 */
Client.prototype.getTokenFiles = function() {

  // Read the token directory
  var files = fs.readdirSync(this.tokenDir);

  // Filter out files that aren't valid emails.
  files = _.filter(files, function(filename) {
    return _.contains(filename, '@');
  });

  // Start a token collector
  var tokens = [];

  // Collect all our tokens
  _.forEach(files, function(filename) {
    tokens.push(filename);
  });

  // Log the result
  this.log.info(format('Found local tokens %j.', tokens));

  // Return our tokens
  return tokens;

};

/*
 * Return auth headers we need for session protected endpoints
 */
Client.prototype.__getAuthHeaders = function(session) {
  return {
    'Content-Type': 'application/json',
    'Cookie': 'X-Pantheon-Session=' + session.session
  };
};

/*
 * Return headers we need to post data
 */
Client.prototype.__getPostHeaders = function() {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'Terminus/Kalabox'
  };
};

/*
 * Construct a new URL, possibly a lightsaber as well
 */
Client.prototype.__url = function(parts) {
  parts.unshift('api');
  return parts.join('/');
};

/*
 * Send and handle a REST request.
 */
Client.prototype.__request = function(verb, pathname, data, options) {

  // Log the actual request we are about to make
  this.log.info(format('Making %s request to %s', verb, pathname));
  this.log.debug(format('Request data: %j', data));
  this.log.debug(format('Request options: %j.', options));

  // GEt rest mod
  var rest = require('restler');

  // Need this for all the promises we will make
  var self = this;

  // Build the URL object
  var obj = _.extend(this.target, {pathname: self.__url(pathname)});

  // Attempt the request and retry a few times
  return this.Promise.retry(function() {

    // Send REST request.
    return new self.Promise(function(fulfill, reject) {

      // Make the actual request
      rest[verb](urls.format(obj), data, options)

      // Log result and fulfil promise
      .on('success', function(data) {
        self.log.debug(format('Response recieved: %j.', data));
        fulfill(data);
      })

      // Throw an error on fail/error
      .on('fail', function(data) {
        var err = new Error(data);
        reject(err);
      }).on('error', reject);
    });

  });

};

/*
 * Auth with pantheon
 */
Client.prototype.auth = function(token) {

  // Save this for later
  var self = this;

  // Send REST request.
  return this.__request(
    'postJson',
    ['authorize', 'machine-token'],
    {machine_token: token, client: 'terminus'},
    {headers: this.__getPostHeaders()}
  )

  // Validate response, build a session and cache the token
  .then(function(response) {

    // Create a session with the response
    var session = {
      session: response.session,
      session_expire_time: response.session_expire_time || response.expires_at,
      user_uuid: response.user_uuid || response.user_id
    };
    self.log.info(format('Got a Pantheon session: %j', session));

    // Get the user profile data
    return self.getUser(session)

    // Add our token to the cache
    .then(function(user) {
      self.addToken(user.email, token);
    })

    // Return the session
    .then(function() {
      return session;
    });

  });

};

/*
 * Get information on the user
 *
 * GET /users/USERID
 *
 */
Client.prototype.getUser = function(session) {
  return this.__request(
    'get',
    ['users', session.user_uuid],
    {headers: this.__getAuthHeaders(session)}
  );
};

/*
 * Get full list of sites
 *
 * sites/USERID/sites
 */
Client.prototype.getSites = function(session) {
  return this.__request(
    'get',
    ['users', session.user_uuid, 'sites'],
    {headers: this.__getAuthHeaders(session)}
  );
};

/*
 * Get full list of environments
 *
 * sites/SITEID/environments/
 */
Client.prototype.getEnvironments = function(session, sid) {
  return this.__request(
    'get',
    ['sites', sid, 'environments'],
    {headers: this.__getAuthHeaders(session)}
  );
};

/*
 * Get users ssh keys
 *
 * GET /users/USERID/keys
 *
 */
Client.prototype.__getSSHKeys = function(session) {
  return this.__request(
    'get',
    ['users', session.user_uuid, 'keys'],
    {headers: this.__getAuthHeaders(session)}
  );
};

/*
 * Post users ssh keys
 *
 * POST /users/USERID/keys
 *
 */
Client.prototype.__postSSHKey = function(session, sshKey) {
  return this.__request(
    'postJson',
    ['users', session.user_uuid, 'keys'],
    sshKey,
    {headers: this.__getAuthHeaders(session), query: {validate: true}}
  );
};

/*
 * Set up our SSH keys if needed
 */
Client.prototype.sshKeySetup = function(token) {

  // for later
  var self = this;

  // "CONSTANTS"
  var SSH_DIR = path.join(this.kbox.core.deps.get('globalConfig').home, '.ssh');
  var PRIVATE_KEY_PATH = path.join(SSH_DIR, 'pantheon.kalabox.id_rsa');
  var PUBLIC_KEY_PATH = path.join(SSH_DIR, 'pantheon.kalabox.id_rsa.pub');

  // Node modules
  var fingerprint = require('ssh-fingerprint');
  var keygen = require('ssh-keygen');

  /*
   * Load our pantheon public key and return it and a non-coloned
   * fingerprint
   */
  var loadPubKey = function() {
    var data = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');
    return {
      data: data,
      print: fingerprint(data).replace(/:/g, '')
    };
  };

  /*
   * Helper method to promisigy fs.exists
   */
  var existsAsync = function(path) {
    return new self.Promise(function(exists) {
      fs.exists(path, exists);
    });
  };

  // Make sure SSHDIR exists
  if (!fs.existsSync(SSH_DIR)) {
    fs.mkdirpSync(SSH_DIR);
  }

  // Check to see if we have both keys
  return self.Promise.join(
    existsAsync(PRIVATE_KEY_PATH),
    existsAsync(PUBLIC_KEY_PATH),
    function(privateExists, publicExists) {
      return privateExists && publicExists;
    }
  )

  // Generate a new SSH key if needed
  .then(function(exists) {
    if (!exists) {

      // Set Path environmental variable if we are on windows.
      // We need this because ssh-keygen is not in the path by default
      if (process.platform === 'win32') {

        // Add the correct gitbin
        // This can be in different spots for different windows versions so
        // we add the ones that exist
        var appData = process.env.LOCALAPPDATA;
        var programFiles = process.env.ProgramFiles;
        var programFiles2 = process.env.ProgramW6432;
        var gitBin1 = path.join(appData, 'Programs', 'Git', 'usr', 'bin');
        var gitBin2 = path.join(programFiles, 'Git', 'usr', 'bin');
        var gitBin3 = path.join(programFiles2, 'Git', 'usr', 'bin');

        // Only add the gitbin to the path if the path doesn't start with
        // it. We want to make sure gitBin is first so other things like
        // putty don't F with it.
        // See https://github.com/kalabox/kalabox/issues/342
        var env = self.kbox.core.env;
        _.forEach([gitBin1, gitBin2, gitBin3], function(gBin) {
          if (fs.existsSync(gBin) && !_.startsWith(process.env.path, gBin)) {
            env.setEnv('Path', [gBin, process.env.Path].join(';'));
          }
        });

      }

      // Build our key option array
      // @todo: add session email for comment
      var keyOpts = {
        location: PRIVATE_KEY_PATH,
        comment: 'me@kalabox',
        password: (process.platform === 'win32' ? '\'\'' : ''),
        read: false,
        destroy: false
      };

      // Generate our key if needed
      return self.Promise.fromNode(function(callback) {
        keygen(keyOpts, callback);
      });
    }
  })

  // Look to see if pantheon has our pubkey
  .then(function() {

    // Grab our public key
    var pubKey = loadPubKey();
    var session;

    // Authenticate with pantheon
    return self.auth(token)

    // Grab the public ssh key fingerprints from pantehon
    .then(function(s) {
      session = s;
      return self.__getSSHKeys(session);
    })

    // IF THE GLOVE FITS! YOU MUST ACQUIT!
    .then(function(keys) {
      return _.has(keys, pubKey.print);
    })

    // Post a key to pantheon if needed
    .then(function(hasKey) {
      if (!hasKey) {
        return self.__postSSHKey(session, pubKey.data);
      }
    });

  });

};

// Return constructor as the module object.
module.exports = Client;
