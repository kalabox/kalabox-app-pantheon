
'use strict';

module.exports = function(kbox, pantheon) {

  // Intrinsic modules.
  var path = require('path');
  var fs = require('fs');

  // Npm modulez
  var _ = require('lodash');
  var Promise = require('bluebird');
  Promise.longStackTraces();

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
  var parseEnvironments = function(envs) {
    var choices = [];

    // @todo:
    // This is best practices but maybe we want to open it up?
    delete envs.live;
    delete envs.test;

    _.map(envs, function(val, key) {
      choices.push({
        name: key,
        value: key
      });
    });
    return _.sortBy(choices, 'name');
  };

  // Add an option
  // @todo: Add a when function to this that checks for a valid cached token
  // and only prompts user if it needs to refresh
  kbox.create.add('pantheon', {
    option: {
      name: 'email',
      weight: -99,
      task: {
        kind: 'string',
        description: 'Pantheon dashboard email.',
      },
      inquire: {
        type: 'list',
        message: 'Choose a Pantheon account.',
        // Grab a list of accounts to use plus an option to use a
        // new account
        choices: function(answers) {

          // See if we have previously used accounts
          var session = pantheon.getSessionCache();

          // Build choices array
          var choices = [{
            name: session.email,
            value: session.email
          }];
          choices.push({name: 'use a different account', value: 'more'});

          // Return choices
          return choices;

        },
        validate: function(value) {
          // @todo some actual validation here
          return true;
        },
        // Only run this prompt if we have logged in with a pantheon
        // account before.
        when: function(answers) {
          // See if we have previously used accounts
          var session = pantheon.getSessionCache();
          return (session && session.email);
        }
      }
    }
  });

  // Add an option
  // @todo: Add a when function to this that checks for a valid cached token
  // and only prompts user if it needs to refresh
  kbox.create.add('pantheon', {
    option: {
      name: 'email2',
      weight: -98,
      inquire: {
        type: 'input',
        message: 'Pantheon dashboard email',
        validate: function(value) {
          // @todo some actual validation here
          return true;
        },
        // Only run this prompt if we have logged in with a pantheon
        // account before.
        when: function(answers) {
          if (answers.email === undefined || answers.email === 'more') {
            return true;
          }
        }
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'account'
      }
    }
  });

  // Add an option
  // @todo: Add a when function to this that checks for a valid cached token
  // and only prompts user if it needs to refresh
  // @todo: figure out how to add this in as a task option to be
  // passed downstream
  /*
  kbox.create.add('pantheon', {
    option: {
      name: 'password',
      weight: -97,
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
  */

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'uuid',
      weight: -90,
      task: {
        kind: 'string',
        description: 'Pantheon site machine name.',
      },
      inquire: {
        type: 'list',
        message: 'Which site?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // @todo: less idiotic way to do this
          var email = (answers.email) ? answers.email : answers.email2;

          // Login to the pantheon, set up SSH keys if needed
          pantheon.getSession(email)

          // Grab a list of sites from pantheon
          .then(function(session) {
            return pantheon.getSites();
          })

          // Parse the list
          .then(function(sites) {
            done(parseSites(sites));
          });

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
      name: 'env',
      weight: -85,
      task: {
        kind: 'string',
        description: 'Pantheon site environment.',
      },
      inquire: {
        type: 'list',
        message: 'Which environment?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // @todo: less idiotic way to do this
          var email = (answers.email) ? answers.email : answers.email2;

          // Login to the pantheon
          pantheon.getSession(email)

          // grab our sites environments
          .then(function(session) {
            var uuid = answers.uuid;
            return pantheon.getEnvironments(uuid);
          })

          // Parse and return the envs
          .then(function(envs) {
            done(parseEnvironments(envs));
          });

        }
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'env'
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
        default: function(answers) {
          return pantheon.sites[answers.uuid].information.name;
        }
      },
      conf: {
        type: 'global',
        key: 'appName'
      }
    }
  });

};
