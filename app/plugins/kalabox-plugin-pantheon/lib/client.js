'use strict';

/**
 * Module for interacting with the pantheon api directly from node
 * @module client.js
 */

// Node modules.
var fs = require('fs-extra');
var path = require('path');
var urls = require('url');
var _ = require('lodash');

/*
 * Constructor.
 */
function Client(kbox, app) {

  // Load in our kbox object and some relevant things
  this.kbox = kbox;
  this.app = app;
  this.Promise = kbox.Promise;

  // Get the directory of our cached sessions
  var homeDir = this.kbox.core.deps.lookup('globalConfig').home;
  this.cacheDir = path.join(homeDir, '.kalabox', 'pantheon', 'session');

  // Pantheon endpoint
  this.target = {
    protocol: 'https',
    hostname: 'dashboard.getpantheon.com',
    port: '443'
  };

  // Das Kindacache
  this.session = undefined;
  this.sites = undefined;

}

/*
 * Set the session
 */
Client.prototype.setSession = function(session) {

  // Make sure we are translating expire correctly
  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  // Set our runtime cache
  this.session = {
    session: session.session,
    session_expire_time: session.session_expire_time || session.expires_at,
    user_uuid: session.user_uuid || session.user_id,
    email: session.email,
    name: session.name
  };
  // jshint camelcase:true
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

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
  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  if (session && Date.now() > (session.session_expire_time * 1000)) {
    return false;
  }
  // jshint camelcase:true
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

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

  // Get this instance's cached session.
  var session = this.session || this.getSessionFile(email);

  // If we have a valid session we return it
  if (this.validateSession(session)) {
    return session;
  }

  // Otherwise return undefined
  return undefined;

};

/*
 * Returns a session property
 */
Client.prototype.getSessionProp = function(prop) {

  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  switch (prop) {
    case 'session': return this.getSession().session;
    case 'expires': return this.getSession().session_expire_time;
    case 'user': return this.getSession().user_uuid;
    case 'email': return this.getSession().email;
    case 'name': return this.getSession().name;
  }
  // jshint camelcase:true
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

};

/*
 * Return auth headers
 */
Client.prototype.__getAuthHeaders = function(session) {
  return {
    'Content-Type': 'application/json',
    'Cookie': 'X-Pantheon-Session=' + session
  };
};

/*
 * Return a default data object
 */
Client.prototype.__getRequestData = function(data) {

  // Make sure data is at least an empty object
  data = (data !== undefined) ? data : {};

  // Yeah
  var self = this;

  // Reauth if our session is no longer valid
  return self.Promise.try(function() {
    if (!self.getSession()) {
      return self.reAuthSession()
      .then(function(session) {
        return _.merge(data, {headers: self.__getAuthHeaders(session.session)});
      });
    }
    else {
      var session = self.getSession();
      return _.merge(data, {headers: self.__getAuthHeaders(session.session)});
    }
  });

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

  // Log our requests
  var log = this.kbox.core.log.make('PANTHEON API');
  log.debug(verb);
  log.debug(pathname);
  log.debug(data);

  // GEt rest mod
  var rest = require('restler');

  // Need this for all the promises we will make
  var self = this;

  // Build the URL object
  var obj = _.extend(this.target, {pathname: self.__url(pathname)});

  // Attempt the request
  return this.Promise.retry(function() {
    // Send REST request.
    return new self.Promise(function(fulfill, reject) {
      rest[verb](urls.format(obj), data)
      .on('success', fulfill)
      .on('fail', function(data) {
        var err = new Error(data);
        reject(err);
      })
      .on('error', reject);
    });
  });

};

/*
 * If our session is not valid lets try to get a new one
 */
Client.prototype.reAuthSession = function() {

  // Get the inquirer
  var inquirer = require('inquirer');

  // We need ourselves present when we make promises
  var self = this;
  var email = this.app.pluginconf.pantheon.email;

  // Prompt question
  var questions = [{
    name: 'password',
    type: 'password',
    message: 'Pantheon dashboard password (' + email + ')'
  }];

  /*
   * Helper method to promisify inquiries
   */
  var askIt = function(questions) {
    return new self.Promise(function(answers) {
      console.log('Your Pantheon session has expired. We need to reauth!');
      inquirer.prompt(questions, answers);
    });
  };

  // Run the prompt and return the password
  return askIt(questions)

  // Get my answers
  .then(function(answers) {
    // Get the email
    if (answers && answers.password) {
      return self.auth(email, answers.password);
    }
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
  return this.__request('postJson', ['authorize'], data)

  // Validate response and return ID.
  .then(function(response) {

    // Get auth headers since we have a valid session now
    var headers = self.__getAuthHeaders(response.session);

    // Set the fullname
    // jshint camelcase:false
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    return self.getProfile(response.user_id, {headers: headers})
      .then(function(profile) {

        // Add additional data to our response and then set
        // the session
        var session = _.merge(response, {
          email: email,
          name: profile.full_name
        });
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
        // jshint camelcase:true

        // Set and return the session
        return self.setSession(session);
      });

  });

};



/*
 * Get users profile
 *
 * GET /users/USERID/profile
 *
 */
Client.prototype.getProfile = function(userId, data) {

  // Use cached user if we have one
  var user = userId || this.getSessionProp('user');

  // Start by getting our request data
  return this.__getRequestData(data)

  // Use this data
  .then(function(requestData) {

    // Send REST request.
    return this.__request(
      'get',
      ['users', user, 'profile'],
      requestData
    );

  });

};

/*
 * Get full list of our backups
 *
 * sites/SITEID/environments/ENV/backups/catalog/
 */
Client.prototype.getBackups = function(sid, env, data) {

  // Start by getting our request data
  return this.__getRequestData(data)

  // Use this data
  .then(function(requestData) {

    // Send REST request.
    return this.__request(
      'get',
      ['sites', sid, 'environments', env, 'backups', 'catalog'],
      requestData
    );

  });

};

/*
 * Get full list of our sites bindings
 *
 * GET sites/SITEID/environments/dev/backups/catalog
 */
Client.prototype.getBindings = function(sid, data) {

  // Start by getting our request data
  return this.__getRequestData(data)

  // Use this data
  .then(function(requestData) {

    // Send REST request.
    return this.__request(
      'get',
      ['sites', sid, 'bindings'],
      requestData
    );

  });

};

// Return constructor as the module object.
module.exports = Client;
