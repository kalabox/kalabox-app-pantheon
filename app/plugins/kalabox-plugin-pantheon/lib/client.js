'use strict';

/**
 * Module for interacting with the pantheon api directly from node
 * @module client.js
 */

// Intrinsic modules.
var fs = require('fs-extra');
var path = require('path');
var urls = require('url');
var util = require('util');

// Npm modulez
var _ = require('lodash');
var Promise = require('bluebird');
var rest = require('restler');
var fingerprint = require('ssh-fingerprint');
var keygen = require('ssh-keygen');
var inquirer = require('inquirer');

// Stack me
Promise.longStackTraces();

/*
 * Default endpoint.
 */
var PANTHEON_API = {
  protocol: 'https',
  hostname: 'dashboard.getpantheon.com',
  port: '443'
};

/*
 * CONSTANTS
 */
var HOMEKEY = (process.platform === 'win32') ? 'USERPROFILE' : 'HOME';
var CACHEDIR = path.join(process.env[HOMEKEY], '.terminus', 'cache');
var SESSIONFILE = path.join(CACHEDIR, 'session');

/*
 * Constructor.
 */
function Client(id, address) {

  // The id argument is optional.
  this.id = id;

  // Das Kindacache
  this.session = undefined;

  // The address argument is also optional.
  if (address) {
    this.target = urls.parse(address);
  } else {
    // Grab the default target that points to the production instance.
    this.target = PANTHEON_API;
  }

}

/*
 * Set the session
 */
Client.prototype.__setSession = function(session) {

  // @todo: how do we validate?
  // @todo: only write file if its changed? md5 hash compare?

  // Make sure we are translating expire correctly
  var expires;
  if (session.session_expire_time) {
    expires = session.session_expire_time;
  }
  else {
    expires = session.expires_at;
  }

  // Make sure we are translating uid correctly
  var uid;
  if (session.user_uuid) {
    uid = session.user_uuid;
  }
  else {
    uid = session.user_id;
  }

  // Set our runtime cache
  this.session = {
    session: session.session,
    session_expire_time: expires,
    user_uuid: uid,
    email: session.email,
    name: session.name
  };

  // Save a cache locally so we can share among terminus clients
  fs.mkdirpSync(CACHEDIR);
  var writableSession = JSON.stringify(this.session);
  fs.writeFileSync(SESSIONFILE, writableSession);

  return this.session;

};

/*
 * Helper function for reading file cache.
 */
Client.prototype.getSessionFile = function() {

  var self = this;
  var data;

  // Try to load contents of file cache.
  try {
    data = fs.readFileSync(SESSIONFILE, 'utf8');
    /*
     * This is to handle a special case where the file cache's contents
     * are set to the string 'null' or are empty/newline. It should be handled
     * as if the file does not exist or is empty.
     */
    if (data === 'null' || data === 'null\n' || data === '' || data === '\n') {
      data = undefined;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  // If file cache was loaded, parse the contents and set the session.
  if (data) {
    var session = JSON.parse(data);
    self.__setSession(session);
    return session;
  } else {
    return undefined;
  }

};

/*
 * Make sure our session is still 100% 2legit2quit
 */
Client.prototype.validateSession = function(session) {

  // Session is false, session is tricksy if it is undefined
  if (session === undefined) {
    return false;
  }

  /*
   * Session is illegitimate if its expired
   *
   * Date.now uses miliseconds, while session_expire_time seems to use
   * seconds, so converting them to match is needed. So here I'm just
   * multiplying session_expire_time by 1000 to be in miliseconds.
   */
  if (session && Date.now() > (session.session_expire_time * 1000)) {
    return false;
  }

  // Kill session if it doesn't have the full name on it so we can reauth
  // and get this important data
  if (session && session.name === undefined) {
    return false;
  }

  // Session is lookin MIGHTY FINE! MIGHTY FINE INDEED!
  return true;

};

/*
 * Returns the session if it exists and is valid
 */
Client.prototype.getSession = function() {

  // Get this instance's cached session.
  var session = this.session || this.getSessionFile();

  // If we have a valid session we return it
  if (this.validateSession(session)) {
    return session;
  }

  // We have nothing!
  else {
    return undefined;
  }

};

/*
 * If our session is not valid lets try to get a new one
 */
Client.prototype.__reAuthSession = function() {

  // We need ourselves present when we make promises
  var self = this;

  // Prompt questions
  var questions = [
    {
      name: 'password',
      type: 'password',
      message: 'Pantheon dashboard password'
    }
  ];

  /*
   * Helper method to promisigy inquiries
   */
  var askIt = function(questions) {
    return new Promise(function(answers) {
      inquirer.prompt(questions, answers);
    });
  };

  // Run the prompt and return the password
  return askIt(questions)

  // Get my answers
  .then(function(answers) {

    // Get the email
    // @todo: eventually get this from app config when we switch to
    // a multi user name jam
    var session = self.getSessionFile();
    var email = session.email;

    // Login
    return self.auth(email, answers.password);

  });

};

/*
 * Build headers with our pantheon session so we can do
 * protected stuff
 */
Client.prototype.__getSessionHeaders = function(session) {

  // Reutrn the header object
  return {
    'Content-Type': 'application/json',
    'Cookie': 'X-Pantheon-Session=' + session.session
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
 * @todo: make this less ugly
 */
Client.prototype.__request = function(verb, pathname, data) {

  // @todo: Try each request a few times?

  // Need this for all the promises we will make
  var self = this;

  // Skip this part for an authorize request since we may
  // not have a session yet and dont need auth headers anyway
  if (!_.includes(pathname, 'authorize')) {

    // Grab a session to set up our auth
    var session = this.getSession();

    // Prompt the user to reauth if the session is invalid
    if (session === undefined) {

      // Reuath attempt
      return this.__reAuthSession()

      // Set our session to be the new session
      .then(function(reAuthSession) {
        session = reAuthSession;
      });

    }

    // Build our header and merge it into any other
    // data we might be sending along
    var headers = this.__getSessionHeaders(session);
    data = _.merge(data, {headers: headers});

  }

  // Format our URL
  return Promise.try(function() {

    // Build the URL object
    var obj = _.extend(self.target, {pathname: self.__url(pathname)});

    // Format to url string and return
    return urls.format(obj);

  })

  // Make the Request and handle the result
  // @otdo: clean this code up
  .then(function(url) {

    // Send REST request.
    return new Promise(function(fulfill, reject) {
      rest[verb](url, data)
      .on('success', fulfill)
      .on('fail', function(data, resp) {
        var err = new Error(data);
        reject(err);
      })
      .on('error', reject);
    })
    // Give request a twenty second timeout.
    .timeout(20 * 1000)
    // Wrap errors for more information.
    .catch(function(err) {
      var dataString = typeof data === 'object' ? JSON.stringify(data) : data;
      // @todo: retry on fail
      throw new Error(err,
        'Error during REST request. url=%s, data=%s.',
        [verb, url].join(':'),
        dataString
      );
    });

  });

};

/*
 * Auth with pantheon
 */
Client.prototype.auth = function(email, password) {

  // @todo: Should we worried about caching here at all?

  // Save this for later
  var self = this;

  // @todo: validate email and password?
  // Set our stuff
  var data = {
    email: email,
    password: password
  };

  // Send REST request.
  return self.__request('postJson', ['authorize'], data)

  // Validate response and return ID.
  .then(function(response) {

   // @todo: validate response

    // Set the email and placeholder name
    response.email = email;
    response.name = '';

    // Set the session once here so we can run the profile disco request
    self.session = self.__setSession(response);

    // Set the fullname
    return self.getProfile()
      .then(function(profile) {
        self.session.name = profile.full_name;
      })
      .then(function() {
        // Set session again with additional info
        // @todo: this might be redundant
        self.session = self.__setSession(self.session);
        return self.session;
      });

  });

};

/*
 * Get users ssh keys
 *
 * GET /users/USERID/keys
 *
 */
Client.prototype.__getSSHKeys = function() {

  // Get the session for user info
  var session = this.getSession();

  // Send REST request.
  return this.__request('get', ['users', session.user_uuid, 'keys'], {})

  // Return keys
  .then(function(keys) {
    return keys;
  });

};

/*
 * Post users ssh keys
 *
 * POST /users/USERID/keys
 *
 */
Client.prototype.__postSSHKey = function(sshKey) {

  // Get the session for user info
  var session = this.getSession();

  // Send in our ssh key with validation on
  var data = {
    data: sshKey,
    query: {
      validate: true
    }
  };

  // Send REST request.
  return this.__request('postJson', ['users', session.user_uuid, 'keys'], data)

  // Return keys
  .then(function(keys) {
    return keys;
  });

};

/*
 * Set up our SSH keys if needed
 *
 * We only needs to check for this if we are going to run something in either
 * the terminus/git/rsync containers
 */
Client.prototype.sshKeySetup = function() {

  // @todo: switch this and constants when we start injection kbox into this
  // thing
  var platformIsWindows = process.platform === 'win32';
  var envKey = platformIsWindows ? 'USERPROFILE' : 'HOME';

  // "CONSTANTS"
  var SSH_DIR = path.join(process.env[envKey], '.ssh');
  var PRIVATE_KEY_PATH = path.join(SSH_DIR, 'pantheon.kalabox.id_rsa');
  var PUBLIC_KEY_PATH = path.join(SSH_DIR, 'pantheon.kalabox.id_rsa.pub');

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
    return new Promise(function(exists) {
      fs.exists(path, exists);
    });
  };

  // Some things to use later
  var self = this;

  // Now check to see whether we have a pantheon SSH key already
  // @todo: we shouldnt assume that because a private key exists that a
  // public one does as well
  return existsAsync(PRIVATE_KEY_PATH)

  // Generate a new SSH key if needed
  .then(function(exists) {
    if (!exists) {

      // Set Path environmental variable if we are on windows.
      // We need this because ssh-keygen is not in the path by default
      if (process.platform === 'win32') {

        // Get needed vars
        var gitBin = 'C:\\Program Files (x86)\\Git\\bin;';
        var path = process.env.path;

        // Only add the gitbin to the path if the path doesn't start with
        // it. We want to make sure gitBin is first so other things like
        // putty don't F with it.
        // See https://github.com/kalabox/kalabox/issues/342
        if (!_.startsWith(path, gitBin)) {
          process.env.Path = gitBin + path;
        }
      }

      // Build our key option array
      // @todo: add session email for comment?
      var keyOpts = {
        location: PRIVATE_KEY_PATH,
        comment: 'me@kalabox',
        read: false,
        destroy: false
      };

      // Generate our key if needed
      return Promise.fromNode(function(callback) {
        keygen(keyOpts, callback);
      });
    }
  })

  // Look to see if pantheon has our pubkey
  .then(function() {

    // Grab our public key
    var pubKey = loadPubKey();

    // Grab public key fingerprints from pantheon
    return self.__getSSHKeys()

    // IF THE GLOVE FITS! YOU MUST ACQUIT!
    .then(function(keys) {
      return _.has(keys, pubKey.print);
    })

    // Post a key to pantheon if needed
    .then(function(hasKey) {
      if (!hasKey) {
        return self.__postSSHKey(pubKey.data);
      }
    });
  });

};

/*
 * Get full list of sites
 *
 * sites/USERID/sites
 */
Client.prototype.getSites = function() {

  // Get the session for user info
  var session = this.getSession();

  // Make the request
  return this.__request('get', ['users', session.user_uuid, 'sites'], {})

  // Return sites
  .then(function(sites) {
    return sites;
  });

};

/*
 * Get full list of environments
 *
 * sites/SITEID/environments/
 */
Client.prototype.getEnvironments = function(sid) {

  // Make request
  return this.__request('get', ['sites', sid.trim(), 'environments'], {})

  // Return object of envs
  .then(function(envs) {
    return envs;
  });

};

/*
 * Get full list of our backups
 *
 * sites/SITEID/environments/ENV/backups/catalog/
 */
Client.prototype.getBackups = function(sid, env) {

  // Send REST request.
  return this.__request(
    'get',
    ['sites', sid.trim(), 'environments', env.trim(), 'backups', 'catalog'],
    {}
  )

  // Return object of backups
  .then(function(backups) {
    return backups;
  });

};

/*
 * Get full list of our sites bindings
 *
 * GET sites/SITEID/environments/dev/backups/catalog
 */
Client.prototype.getBindings = function(sid) {

  // Send REST request.
  return this.__request('get', ['sites', sid.trim(), 'bindings'], {})

  .then(function(bindings) {
    return bindings;
  });

};

/*
 * Get users profile
 *
 * GET /users/USERID/profile
 *
 */
Client.prototype.getProfile = function() {

  // Get the session for user info
  var session = this.getSession();

  // Send REST request.
  return this.__request('get', ['users', session.user_uuid, 'profile'], {})

  // Return the profile
  .then(function(profile) {
    return profile;
  });

};

// Return constructor as the module object.
module.exports = Client;
