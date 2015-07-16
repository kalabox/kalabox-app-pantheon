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
 * Cache constants
 */
var HOMEKEY = (this.platform === 'win32') ? 'USERPROFILE' : 'HOME';
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
  this.session = this.__getSession();

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
      email: session.email
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
 * Make sure we have a session token
 */
Client.prototype.__getSession = function() {

  // YOU WERE BORN WITH NOTHING!
  var session = {};

  // Grab the session if we already have it in run cache
  if (this.session !== undefined) {
    session = this.session;
  }
  // Try to grab from filecache
  else if (fs.existsSync(SESSIONFILE))  {
    session = JSON.parse(fs.readFileSync(SESSIONFILE, 'utf8'));
    // File is empty :()
    if (session === null) {
      session = undefined;
    }
    else {
      this.__setSession(session);
    }
  }
  else {
    session = undefined;
  }

  // Validate session hasn't expired yet
  if (Date.now() - session.session_expire_time < 0) {
    // invalidate cache
    this.session = undefined;
    session = undefined;
    // Destroy cached session file
    fs.unlinkSync(SESSIONFILE);
  }

  // Return whatever it is we are returning
  if (session === undefined) {
    // @todo: better debugging/logging
    console.log('You need to login first.');
  }

  // Return what we have left
  return session;

};

/*
 * Build headers with our pantheon session so we can do
 * protected stuff
 */
Client.prototype.__getSessionHeaders = function() {
  // Try to grab our session
  var session = this.__getSession();
  // Reutrn the header object
  return {
    'Content-Type': 'application/json',
    'Cookie': 'X-Pantheon-Session=' + session.session
  };
};

/*
 * Construct a new URL, possibly lightsaber as well
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
    // Give request a 10 second timeout.
    .timeout(10 * 1000)
    // Wrap errors for more information.
    .catch(function(err) {
      var dataString = typeof data === 'object' ? JSON.stringify(data) : data;
      throw new Error(err,
        'Error during REST request. url=%s, data=%s.',
        [verb, url].join(':'),
        dataString
      );
    });

  });

};

/*
 * Get full list of all metrics records.
 */
Client.prototype.login = function(email, password) {

  // Grab the session if we already have it and the session is for the same
  // user who just tried to login
  this.session = this.__getSession();
  if (this.session !== undefined && email === this.session.email) {
    return Promise.resolve(this.session);
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
    // @todo: validate response
    // Set our session and return
    response.email = email;
    self.session = self.__setSession(response);
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

  // Session up here because we need session.user_id
  var session = this.__getSession();
  // Save for later
  var self = this;

  // Grab our headers to auth with the endpoint
  var data = {
    headers: this.__getSessionHeaders()
  };

  // Send REST request.
  return this.__request('get', ['users', session.user_uuid, 'sites'], data)

  // @todo: Validate response and return ID.
  .then(function(sites) {
    self.sites = sites;
    return self.sites;
  });

};

/*
 * Get full list of sites
 */
Client.prototype.getEnvironments = function(uuid) {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.sites[uuid].information.envs !== undefined) {
    return Promise.resolve(this.sites[uuid].information.envs);
  }

  // Session up here because we need session.user_id
  var session = this.__getSession();
  // Save for later
  var self = this;

  // Grab our headers to auth with the endpoint
  var data = {
    headers: this.__getSessionHeaders()
  };

  // Send REST request.
  return this.__request('get', ['sites', uuid, 'environments'], data)

  // @todo: Validate response and return ID.
  .then(function(envs) {
    self.sites[uuid].information.envs = envs;
    return self.sites[uuid].information.envs;
  });

};

/*
 * Get full list of our products
 */
Client.prototype.getProducts = function() {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.products !== undefined) {
    return Promise.resolve(this.products);
  }

  // Session up here because we need session.user_id
  var session = this.__getSession();
  // Save for later
  var self = this;

  // Grab our headers to auth with the endpoint
  var data = {
    headers: this.__getSessionHeaders()
  };

  // Send REST request.
  return this.__request('get', ['products'], data)

  // Validate response and return ID.
  .then(function(products) {
    self.products = products;
    return self.products;
  });

};

/*
 * Get full list of our backups
 * sites/1b377733-0fa4-4453-b9f5-c43477274010/environments/dev/backups/catalog/
 * https://dashboard.getpantheon.com/api/sites/2de15cd7-4ee1-4023-9186-9aeaa9ff4905/bindings
 */
Client.prototype.getBackups = function(uuid, env) {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.backups !== undefined) {
    return Promise.resolve(this.backups);
  }

  // Session up here because we need session.user_id
  var session = this.__getSession();
  // Save for later
  var self = this;

  // Grab our headers to auth with the endpoint
  var data = {
    headers: this.__getSessionHeaders()
  };

  // Send REST request.
  return this.__request(
    'get',
    ['sites', uuid, 'environments', env, 'backups', 'catalog'],
    data
  )

  // Validate response and return ID.
  .then(function(backups) {
    self.backups = backups;
    return self.backups;
  });

};

// Return constructor as the module object.
module.exports = Client;
