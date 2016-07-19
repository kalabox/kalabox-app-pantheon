
'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  // Grab client module
  var Client = require('./lib/client.js');
  var pantheon = new Client(kbox);

  // Load our events and create modules
  require('./lib/create.js')(kbox, pantheon);
  require('./lib/events.js')(kbox, pantheon);

  // Declare our app to the world
  kbox.create.add('pantheon', {
    task: {
      name: 'Pantheon',
      description: 'Creates a Pantheon app.',
      pkg: {
        dir: path.join(__dirname, 'app')
      }
    }
  });

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'pantheon');
  });

  // Create integration.
  kbox.integrations.create('pantheon', function(api) {

    // Authorize login.
    api.methods.auth = function(token) {
      return pantheon.__auth(token)
      .wrap('Error authorizing with Machine Token');
    };

    // Set the logins method of api.
    api.methods.logins = function() {
      return kbox.Promise.try(function() {
        return pantheon.getTokensByEmail();
      })
      .wrap('Error getting logins.');
    };

    // Set the sites method of the api.
    api.methods.sites = function(token) {
      return pantheon.getSites()
      .then(function(sites) {
        return _.map(sites, function(site) {
          site.getEnvironments = function() {
            return pantheon.getEnvs(token, site.name);
          };
          return site;
        });
      })
      .wrap('Error getting sites.');
    };

  });

};
