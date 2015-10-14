
'use strict';

module.exports = function(kbox) {

  // Pkg.json
  var pkgJson = require('./package.json');
  var PLUGIN_NAME = 'kalabox-app-pantheon';

  // Instrinsc modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  // Grab vendor modules
  var clientPath = pkgJson.postInstallAssets[PLUGIN_NAME].client;
  var Client = require('./' + path.join('vendor', PLUGIN_NAME, clientPath));
  var pantheon = new Client(kbox);

  // Load our events
  // @todo: need a better way to load this so it is
  // just for pantheon apps
  require('./lib/events.js')(kbox, pantheon);

  // Declare our app to the world
  kbox.create.add('pantheon', {
    task: {
      name: 'Pantheon',
      module: 'kalabox-app-pantheon',
      description: 'Creates a Pantheon app.'
    }
  });

  // Load all our steps and inquiries
  require('./lib/create.js')(kbox, pantheon);

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'pantheon');
  });

  // Create integration.
  kbox.integrations.create('pantheon', function(api) {

    // Authorize login.
    api.methods.auth = function(email, password) {
      var self = this;
      return kbox.Promise.try(function() {
        return self.ask([
          {
            id: 'username'
          },
          {
            id: 'password'
          }
        ]);
      })
      .then(function(answers) {
        return pantheon.auth(answers.username, answers.password);
      })
      .tap(function(session) {
        return pantheon.setSession(session);
      });
    };

    // Set the sites method of the api.
    api.methods.sites = function() {
      var self = this;
      // Get email.
      return kbox.Promise.try(function() {
        return self.ask([
          {
            id: 'username'
          }
        ]);
      })
      // Set session based on email.
      .then(function(answers) {
        var session = pantheon.getSessionFile(answers.username);
        pantheon.setSession(session);
      })
      // Get and map sites.
      .then(function() {
        return pantheon.getSites()
        .then(function(sites) {
          return _.map(sites, function(val, key) {
            return {
              name: val.information.name,
              id: key
            };
          });
        });
      });
    };

  });

};
