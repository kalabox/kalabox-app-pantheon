'use strict';

/**
 * Module for interacting with the pantheon api directly from node
 * @module client.js
 */

// Intrinsic modules.
var fs = require('fs-extra');
var path = require('path');
var urls = require('url');

// Npm modulez
var _ = require('lodash');
var rest = require('restler');
var fingerprint = require('ssh-fingerprint');
var keygen = require('ssh-keygen');
var inquirer = require('inquirer');

/*
 * Constructor.
 */
function Client(kbox, app) {

  /*
   * Default endpoint.
   */
  var PANTHEON_API = {
    protocol: 'https',
    hostname: 'dashboard.getpantheon.com',
    port: '443'
  };

  // Load in our kbox object and some relevant things
  this.kbox = kbox;
  this.Promise = kbox.Promise;
  var globalConfig = this.kbox.core.deps.lookup('globalConfig');
  var homeDir = globalConfig.home;
  this.cacheDir = path.join(homeDir, '.kalabox', 'terminus', 'session');
  if (!fs.existsSync(this.cacheDir)) {
    fs.mkdirpSync(this.cacheDir);
  }

  this.app = app;

  // Pantheon endpoint
  this.target = PANTHEON_API;

  // Das Kindacache
  this.session = undefined;
  this.sites = undefined;
  this.keySet = false;

}

/**
 * Gets plugin conf from the appconfig or from CLI arg
 **/
Client.prototype.__getOpts = function() {

  var opts;

  if (this.app) {
    // Grab our options from config
    opts = this.app.config.pluginConf['kalabox-plugin-pantheon'];
  }

  return opts;

};

/*
 * Set the session
 */
Client.prototype.setSession = function(session) {

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
  fs.mkdirpSync(this.cacheDir);
  var sessionFile = path.join(this.cacheDir, this.session.email);
  var writableSession = JSON.stringify(this.session);
  fs.writeFileSync(sessionFile, writableSession);

  return this.session;

};

/*
 * Helper function for reading file cache.
 */
Client.prototype.getSessionFiles = function() {

  var self = this;
  var files = fs.readdirSync(this.cacheDir);
  var sessions = [];

  // Try to load all our session files
  _.forEach(files, function(filename) {
    // Try to read in each file
    try {
      // Read in the file
      var sessionFile = path.join(self.cacheDir, filename);
      var data = fs.readFileSync(sessionFile, 'utf8');
      var session = JSON.parse(data);
      sessions.push(session);
    }
    catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  });

  // If file cache was loaded, parse the contents and set the session.
  if (!_.isEmpty(sessions)) {
    return sessions;
  } else {
    return undefined;
  }

};

/*
 * Helper function for reading specific file cache.
 */
Client.prototype.getSessionFile = function(email) {

  var sessions = this.getSessionFiles();

  var session = _.find(sessions, function(sess) {
    return sess.email === email;
  });

  return session;

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
Client.prototype.getSession = function(email) {

  // If no email try to load from app conf
  // @todo: if no email then load all the sessions we have saved
  if (!email && this.app) {
    var config = this.__getOpts();
    email = config.account;
  }

  // Get this instance's cached session.
  var session = this.session || this.getSessionFile(email);

  // If we have a valid session we return it
  if (this.validateSession(session)) {
    return session;
  }

  // At least return the email and name even if we are invalid
  else {
    if (session && session.email && session.name) {
      return {
        email: session.email,
        name: session.name
      };
    }
    else {
      return undefined;
    }
  }
};

/*
 * Returns true if we need to reauth
 */
Client.prototype.needsReauth = function(session) {

  var reUp = (session && session.session === undefined);
  this.kbox.core.log.debug('SESSION VALID => ' + !reUp);
  return reUp;

};

/*
 * If our session is not valid lets try to get a new one
 */
Client.prototype.reAuthSession = function() {

  // We need ourselves present when we make promises
  var self = this;

  var session = this.getSession();

  // Prompt question
  var questions = [
    {
      name: 'password',
      type: 'password',
      message: 'Pantheon dashboard password (' + session.email + ')'
    }
  ];

  /*
   * Helper method to promisify inquiries
   */
  var askIt = function(questions, session) {
    if (self.needsReauth(session)) {
      return new self.Promise(function(answers) {
        console.log('Your Pantheon session has expired. We need to reauth!');
        inquirer.prompt(questions, answers);
      });
    }
    else {
      return self.Promise.resolve(false);
    }
  };

  // Run the prompt and return the password
  return askIt(questions, session)

  // Get my answers
  .then(function(answers) {

    // Get the email
    if (answers !== false) {

      // Grab the session again
      // @todo: what happens if we can't do this?
      var session = self.getSession();

      // Login
      return self.auth(session.email, answers.password);
    }

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
    if (this.needsReauth(session)) {

      // Reuath attempt
      return this.reAuthSession()

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
  return self.Promise.try(function() {

    // Build the URL object
    var obj = _.extend(self.target, {pathname: self.__url(pathname)});

    // Format to url string and return
    return urls.format(obj);

  })

  // Make the Request and handle the result
  // @todo: clean this code up
  .then(function(url) {

    return self.Promise.retry(function() {
      // Send REST request.
      return new self.Promise(function(fulfill, reject) {
        rest[verb](url, data)
        .on('success', fulfill)
        .on('fail', function(data) {
          var err = new Error(data);
          reject(err);
        })
        .on('error', reject);
      });
    });

  });

};

/*
 * Auth with pantheon
 */
Client.prototype.auth = function(email, password) {

  // Check static cache
  if (this.session !== undefined) {
    return this.Promise.resolve(this.session);
  }

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

    // Set the email and placeholder name
    response.email = email;
    response.name = '';

    // Set the session once here so we can run the profile disco request
    self.session = self.setSession(response);

    // Set the fullname
    return self.getProfile()
      .then(function(profile) {
        self.session.name = profile.full_name;
      })
      .then(function() {
        // Set session again with additional info
        // @todo: this might be redundant
        self.session = self.setSession(self.session);
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
    data: JSON.stringify(sshKey),
    query: {
      validate: true
    }
  };

  // Send REST request.
  return this.__request('post', ['users', session.user_uuid, 'keys'], data)

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
Client.prototype.sshKeySetup = function(opts) {

  // Check static cache
  if (this.keySet === true) {
    return this.Promise.resolve(true);
  }

  // for later
  var self = this;

  /*
   * Determines whether a container needs SSH keys or not
   * @todo: this is better than what we had but probably still needs
   * improvement
   */
  var needsSshKeys = function(opts) {

    // Check if we have a temp container or not
    var isTemp = _.includes(opts.name, 'kalabox_temp');

    // Check to see if this container is named correctly
    var namedCorrect = opts.name === undefined || isTemp;

    // Check to see if this image is invalidates the need
    var imageCorrect = true;
    if (opts.image) {
      // Get image type
      var type = _.head(_.last(opts.image.split('/')).split(':'));

      // List of excluded images
      var badImageTypes = ['debian'];

      // Change to false if our image type is an excluded type
      imageCorrect = !_.includes(badImageTypes, type);
    }

    return namedCorrect && imageCorrect;

  };

  // Resolve if this container does not need sshKeys
  if (!needsSshKeys(opts)) {
    return this.Promise.resolve(true);
  }

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
    return new self.Promise(function(exists) {
      fs.exists(path, exists);
    });
  };

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
      // @todo: add session email for comment
      var pw = (process.platform === 'win32' ? '\'\'' : '');
      var keyOpts = {
        location: PRIVATE_KEY_PATH,
        comment: 'me@kalabox',
        password: pw,
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
    })

    // Set cache to say yes
    // @todo: handle error
    .then(function() {
      self.keySet = true;
      return self.keySet;
    });

  });

};

/*
 * Get full list of sites
 *
 * sites/USERID/sites
 */
Client.prototype.getSites = function() {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.sites !== undefined) {
    return this.Promise.resolve(this.sites);
  }

  // Some things to use later
  var self = this;

  // Get the session for user info
  var session = this.getSession();

  // Make the request
  return this.__request('get', ['users', session.user_uuid, 'sites'], {})

  // Return sites
  .then(function(sites) {
    self.sites = sites;
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
  return this.__request('get', ['sites', sid, 'environments'], {})

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
    ['sites', sid, 'environments', env, 'backups', 'catalog'],
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
  return this.__request('get', ['sites', sid, 'bindings'], {})

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
