#!/usr/bin/env node

'use strict';

var _ = require('lodash');
var Client = require('./lib/client.js');
var pantheon = new Client();

module.exports = function(kbox) {

  // Load some boxmods
  var events = kbox.core.events;

  // Get some nice looking conf
  var phpVersions = require('./conf/php.js')(kbox);

  /*
   * Parse our sites from terminus into a choices array
   */
  var parseSites = function(sites) {
    var choices = [];
    _.map(sites, function(val, key) {
      choices.push({
        name: val.information.name,
        value: key
      });
    });
    return _.sortBy(choices, 'name');
  };

  /*
   * Parse our products from terminus into a choices array
   */
  var parseProducts = function(products) {
    var choices = [];
    _.map(products, function(val, key) {
      choices.push({
        name: val.attributes.longname,
        value: key
      });
    });
    return _.sortBy(choices, 'name');
  };

  // Events
  // pre-create-instantiate
  // Add some other important things to our kalabox.json before
  // creating it
  events.on('pre-create-instantiate', function(kalaboxJson, done) {
    // Grab our current pantheon config
    var pantheonConfig = kalaboxJson.pluginConf['kalabox-plugin-pantheon'];

    // Add some UUID stuff if we are pulling
    if (pantheonConfig.action === 'pull') {
      var site = pantheon.sites[pantheonConfig.uuid].information;
      pantheonConfig.framework = site.framework;
      pantheonConfig.upstream = site.upstream;
      delete pantheonConfig.product;
    }

    // Or product stuff if we are creating from start state
    if (pantheonConfig.action === 'create') {
      var product = pantheon.products[pantheonConfig.product].attributes;
      pantheonConfig.framework = product.framework;
      pantheonConfig.upstream = product.upstream;
      delete pantheonConfig.uuid;
    }

    // Rebuild json
    kalaboxJson.pluginConf['kalabox-plugin-pantheon'] = pantheonConfig;

    // Go home Sam
    done();
  });

  // Declare our app to the world
  kbox.create.add('pantheon', {
    task: {
      name: 'Pantheon',
      module: 'kalabox-app-pantheon',
      description: 'Creates a Pantheon app.'
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'email',
      weight: -99,
      task: {
        kind: 'string',
        description: 'Pantheon dashboard email.',
      },
      inquire: {
        type: 'input',
        message: 'Pantheon dashboard email',
        validate: function(value) {
          // @todo some actual validation here
          return true;
        }
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'password',
      weight: -98,
      task: {
        kind: 'string',
        description: 'Pantheon dashboard password.',
      },
      inquire: {
        type: 'password',
        message: 'Pantheon dashboard password'
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'action',
      weight: -95,
      inquire: {
        type: 'list',
        message: 'What do you want to do?',
        default: 'pull',
        choices: [
          {name: 'Pull a pre-existing site from Pantheon', value: 'pull'},
          {name: 'Create new site from start state', value: 'create'}
        ]
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'action'
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'uuid',
      weight: -90,
      task: {
        kind: 'string',
        description: 'Pantheon site uuid.',
      },
      inquire: {
        type: 'list',
        message: 'Which site?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // Login to the pantheon
          pantheon.login(answers.email, answers.password)
          .then(function(session) {

            // grab our sites
            return pantheon.getSites(session)
            .then(function(sites) {
              done(parseSites(sites));
            });
          });
        },
        when: function(answers) {
          // @todo some actual validation here
          return (answers.action === 'pull');
        }
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'uuid'
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'product',
      weight: -90,
      inquire: {
        type: 'list',
        message: 'Which start state?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // Login to the pantheon
          pantheon.login(answers.email, answers.password)
          .then(function(session) {

            // grab our sites
            return pantheon.getProducts(session)
            .then(function(products) {
              done(parseProducts(products));
            });
          });
        },
        when: function(answers) {
          return (answers.action === 'create');
        }
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'product'
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'name',
      weight: -80,
      task: {
        kind: 'string',
        description: 'The name of your app.',
      },
      inquire: {
        type: 'input',
        message: 'What will you call this monster you have created',
        validate: function(value) {
          // @todo some actual validation here
          return true;
        },
        filter: function(value) {
          return _.kebabCase(value);
        },
        default: 'My Pantheon App'
      },
      conf: {
        type: 'global',
        key: 'appName'
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'php-version',
      task: {
        kind: 'string',
        description: 'PHP version?',
      },
      inquire: {
        type: 'list',
        message: 'Php version?',
        choices: phpVersions
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'php'
      }
    }
  });

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'pantheon');
  });

};
