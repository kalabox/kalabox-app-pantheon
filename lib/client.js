#!/usr/bin/env node

'use strict';

var _ = require('lodash');
var rest = require('restler');
var urls = require('url');
var Promise = require('bluebird');
Promise.longStackTraces();
var util = require('util');

/*
 * Default target.
 */
var PANTHEON_API = {
  protocol: 'https',
  hostname: 'dashboard.getpantheon.com',
  port: '443'
};

/*
 * Constructor.
 */
function Client(id, address) {

  // @todo: @bcauldwell - Do some argument processing here.

  // The id argument is optional.
  this.id = id;

  // Das Kindacache
  this.sites = undefined;
  this.products = undefined;
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
 * Build headers with our pantheon session so we can do
 * protected stuff
 */
Client.prototype.__getSessionHeaders = function(session) {
  return {
    'Content-Type': 'application/json',
    'Cookie': 'X-Pantheon-Session=' + session
  };
};

/*
 * Make sure we have a session token
 */
Client.prototype.__auth = function(session) {
  // @todo: how do we get a new one when it expires
  // @todo: how do we validate?
  // @todo: same thing?
  // @todo: lots of stuff to do here still
  if (session) {
    this.session = {
      session: session.session,
      expires_at: session.expires_at,
      user_id: session.user_id
    };
  }
  return this.session;
};

/*
 * Construct a new URL
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

  // Grab the session if we already have it
  if (this.session !== undefined) {
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
    self.session = self.__auth(response);
    return self.session;
  });

};

/*
 * Get full list of sites
 */
Client.prototype.getSites = function(session) {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.sites !== undefined) {
    return Promise.resolve(this.sites);
  }

  // Save for later
  var self = this;

  // @todo: validate this is valid session info
  var user = this.__auth(session);

  // Grab our headers to auth with the endpoint
  var data = {
    headers: this.__getSessionHeaders(user.session)
  };

  // Send REST request.
  return this.__request('get', ['users', user.user_id, 'sites'], data)

  // @todo: Validate response and return ID.
  .then(function(sites) {
    self.sites = sites;
    return self.sites;
  });

};

/*
 * Get full list of our products
 */
Client.prototype.getProducts = function(session) {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.products !== undefined) {
    return Promise.resolve(this.products);
  }

  // Save for later
  var self = this;

  // @todo: validate this is valid session info
  var user = this.__auth(session);

  // Grab our headers to auth with the endpoint
  var data = {
    headers: this.__getSessionHeaders(user.session)
  };

  // Send REST request.
  return this.__request('get', ['products'], data)

  // Validate response and return ID.
  .then(function(products) {
    self.products = products;
    return self.products;
  });

};

// Return constructor as the module object.
module.exports = Client;
