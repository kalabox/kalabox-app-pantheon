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
  this.sites = undefined;
  this.backups = undefined;
  this.products = undefined;
  this.session = undefined;
  this.profile = undefined;

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

  if (session) {

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

  }

  else {
    // @todo: fail?
  }
  return this.session;
};

/*
 * Helper function for reading file cache.
 */
Client.prototype.getSessionCache = function() {

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
    return session;
  } else {
    return undefined;
  }

};

/*
 * Reset the session
 */
Client.prototype.__resetSession = function() {

  // Delete file cache.
  fs.unlinkSync(SESSIONFILE);
  return undefined;

};

/*
 * Make sure we have a session token
 */
Client.prototype.getSession = function(email) {

  var self = this;

  // Get this instance's cached session.
  var session = self.session || self.getSessionCache();

  /*
   * Date.now uses miliseconds, while session_expire_time seems to use
   * seconds, so converting them to match is needed. So here I'm just
   * multiplying session_expire_time by 1000 to be in miliseconds.
   */
  if (session && Date.now() > (session.session_expire_time * 1000)) {
    session = self.session = self.__resetSession();
  }

  // Kill session if it doesn't have the full name on it so we can get it
  if (session && session.name === undefined) {
    session = self.session = self.__resetSession();
  }

  // At this point if session is defined we are good to go!
  if (session) {
    self.__setSession(session);
    return Promise.resolve(session);
  }

  // Otherwise we need to prompt the user to reauth
  else if (!session) {

    // Build a basic prompt for pantheon auth
    var questions = [
      {
        name: 'password',
        type: 'password',
        message: 'Pantheon dashboard password'
      }
    ];

    /*
     * Helper method to promisigy fs.exists
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

      // If no email try to grab from session cache
      // @todo: eventually we want this to grab a specific user session file
      if (!email) {
        var session = self.getSessionCache();
        email = session.email;
      }

      // Login
      return self.__login(email, answers.password);

    })

    .nodeify(Promise.resolve(session));

  }

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
 */
Client.prototype.__request = function(verb, pathname, data) {

  // Save for later.
  var self = this;

  // Build url.
  return Promise.try(function() {
    var obj = _.extend(self.target, {pathname: self.__url(pathname)});
    return urls.format(obj);
  })
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
Client.prototype.__auth = function(email, password) {

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
 * login with pantheon
 * this is different from auth in that it does needed kalabox things as well
 * like grab some extra info and handle ssh keys
 */
Client.prototype.__login = function(email, password) {

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
    return new Promise(function(resolve) {
      fs.exists(path, resolve);
    });
  };

  // Some things to use later
  var self = this;

  // Login to the pantheon, set up SSH keys if needed
  // and pull a list of sites
  // @todo: ERROR HANDLING
  // @todo: better debug logging
  // @toto: AFRICA
  return self.__auth(email, password)

  // We've got a session!
  .then(function(session) {

    // Now check to see whether we have a pantheon SSH key already
    // @todo: we shouldnt assume that because a private key exists that a
    // public one does as well
    return existsAsync(PRIVATE_KEY_PATH);

  })

  // Generate a new SSH key if eneded
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

      var keyOpts = {
        location: PRIVATE_KEY_PATH,
        comment: email,
        read: false,
        destroy: false
      };

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
    return self.getSSHKeys()

    // IF THE GLOVE FITS! YOU MUST ACQUIT!
    .then(function(keys) {
      return _.has(keys, pubKey.print);
    })

    // Post a key to pantheon if needed
    .then(function(hasKey) {
      if (!hasKey) {
        return self.postSSHKey(pubKey.data);
      }
    });
  })

  // Actually return the session
  .then(function() {
    return self.session;
  });

};

/*
 * Get full list of sites
 */
Client.prototype.getSites = function() {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.sites !== undefined) {
    return Promise.resolve(this.sites);
  }

  // Save for later
  var self = this;

  // Session up here because we need session.user_id
  return self.getSession()

  .then(function(session) {

    // Grab our headers to auth with the endpoint
    var data = {
      headers: self.__getSessionHeaders(session)
    };

    return self.__request('get', ['users', session.user_uuid, 'sites'], data);

  })

  // Return sites
  .then(function(sites) {
    self.sites = sites;
    return self.sites;
  });

};

/*
 * Get full list of environments
 */
Client.prototype.getEnvironments = function(uuid) {

  // Just grab the cached envs if we already have
  // made a request this process
  if (this.sites[uuid].information.envs !== undefined) {
    return Promise.resolve(this.sites[uuid].information.envs);
  }

  // Save for later
  var self = this;

  // Session up here because we need session.user_id
  return self.getSession()

  .then(function(session) {

    // Grab our headers to auth with the endpoint
    var data = {
      headers: self.__getSessionHeaders(session)
    };

    return self.__request('get', ['sites', uuid.trim(), 'environments'], data);

  })

  // @todo: Validate response and return ID.
  .then(function(envs) {
    self.sites[uuid].information.envs = envs;
    return self.sites[uuid].information.envs;
  });

};

/*
 * Get full list of our backups
 *
 * sites/1b377733-0fa4-4453-b9f5-c43477274010/environments/dev/backups/catalog/
 */
Client.prototype.getBackups = function(uuid, env) {

  // Just grab the cached backups if we already have
  // made a request this process
  if (this.backups !== undefined) {
    return Promise.resolve(this.backups);
  }

  // Save for later
  var self = this;

  // Session up here because we need session.user_id
  return self.getSession()

  .then(function(session) {

    // Grab our headers to auth with the endpoint
    var data = {
      headers: self.__getSessionHeaders(session)
    };

    // Send REST request.
    return this.__request(
      'get',
      ['sites', uuid.trim(), 'environments', env.trim(), 'backups', 'catalog'],
      data
    );
  })

  // Validate response and return ID.
  .then(function(backups) {
    self.backups = backups;
    return self.backups;
  });

};

/*
 * Get full list of our sites bindings
 *
 * sites/1b377733-0fa4-4453-b9f5-c43477274010/environments/dev/backups/catalog/
 */
Client.prototype.getBindings = function(uuid) {

  // Just grab the cached backups if we already have
  // made a request this process
  if (this.bindings !== undefined) {
    return Promise.resolve(this.bindings);
  }

  // Save for later
  var self = this;

  // Session up here because we need session.user_id
  return self.getSession()

  .then(function(session) {

    // Grab our headers to auth with the endpoint
    var data = {
      headers: self.__getSessionHeaders(session)
    };

    // Send REST request.
    return this.__request(
      'get',
      ['sites', uuid.trim(), 'bindings'],
      data
    );
  })

  // Validate response and return ID.
  .then(function(bindings) {
    return bindings;
  });

};

/*
 * Get users profile
 *
 * https://dashboard.getpantheon.com/api/users/UUID/profile
 *
 */
Client.prototype.getProfile = function() {

  // Just grab the cached profile if we already have
  // made a request this process
  if (this.profile !== undefined) {
    return Promise.resolve(this.profile);
  }

  // Save for later
  var self = this;

  // Session up here because we need session.user_id
  return self.getSession()

  .then(function(session) {

    // Grab our headers to auth with the endpoint
    var data = {
      headers: self.__getSessionHeaders(session)
    };

    // Send REST request.
    return self.__request(
      'get',
      ['users', session.user_uuid, 'profile'],
      data
    );

  })

  // Validate response and return ID.
  .then(function(profile) {
    return profile;
  });

};

/*
 * Get users ssh keys
 *
 * GET https://dashboard.getpantheon.com/api/users/UUID/keys
 *
 */
Client.prototype.getSSHKeys = function() {

  // Save for later
  var self = this;

    // Session up here because we need session.user_id
  return self.getSession()

  .then(function(session) {

    // Grab our headers to auth with the endpoint
    var data = {
      headers: self.__getSessionHeaders(session)
    };

    // Send REST request.
    return self.__request(
      'get',
      ['users', session.user_uuid, 'keys'],
      data
    );

  })

  // Validate response and return ID.
  .then(function(keys) {
    return keys;
  });

};

/*
 * Post users ssh keys
 *
 * POST https://dashboard.getpantheon.com/api/users/UUID/keys
 *
 */
Client.prototype.postSSHKey = function(sshKey) {

  // Save for later
  var self = this;

  // Session up here because we need session.user_id
  return self.getSession()

  .then(function(session) {

    // Grab our headers to auth with the endpoint
    var data = {
      headers: self.__getSessionHeaders(session),
      data: JSON.stringify(sshKey),
      query: {
        validate: true
      }
    };

    // Send REST request.
    return self.__request(
      'post',
      ['users', session.user_uuid, 'keys'],
      data
    );

  })

  // Validate response and return ID.
  .then(function(keys) {
    return keys;
  });

};

// Return constructor as the module object.
module.exports = Client;
