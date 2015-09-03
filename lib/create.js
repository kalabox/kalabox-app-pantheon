
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
   * Parse our envs from terminus into a choices array
   */
  var parseEnvironments = function(envs) {
    var choices = [];

    // @todo: Do we want to allow pull from test/live?
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

  // We need this so we can later "validate" our password
  var loginEmail;

  // Choose a pantheon account to use or optionally auth with a
  // differnet account
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
          var session = pantheon.getSession();

          // Build choices array
          var choices = [{
            name: session.email,
            value: session.email
          }];

          // Add option to add account
          choices.push({name: 'add a different account', value: 'more'});

          // Return choices
          return choices;

        },
        validate: function(value) {
          // @todo: actually validate this as a valid email
          loginEmail = value;
          return true;
        },
        // Only run this prompt if we have logged in with a pantheon
        // account before.
        when: function(answers) {
          // See if we have previously used accounts
          var session = pantheon.getSession();
          return (session && session.email);
        }
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'account'
      }
    }
  });

  // Prompt for dashboard username if needed
  kbox.create.add('pantheon', {
    option: {
      name: 'email2',
      weight: -98,
      inquire: {
        type: 'input',
        message: 'Pantheon dashboard email',
        validate: function(value) {
          // @todo: actually validate this as a valid email
          loginEmail = value;
          return true;
        },
        // Only run this prompt if we havent logged in with a pantheon
        // account before.
        when: function(answers) {
          if (answers.email === undefined || answers.email === 'more') {
            return true;
          }
        }
      }
    }
  });

  // Prompt for password if needed
  // @todo: eventually remove this and have this handled inside getToken
  // we can only do this when we resolve the inquiry inception issue.
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
        message: 'Pantheon dashboard password',
        validate: function(value) {

          // Attempt a login and set up ssh keys if needed
          //
          // Presumably if we are at this point we can say this is a needed
          // request that we need to make?
          // @todo: verify above

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // Login to the pantheon
          // @todo: handle SSH keys?
          pantheon.auth(loginEmail, value)

          // Validate if we have a valid session
          .then(function(session) {
            done(pantheon.validateSession(session));
          });

        },
        when: function(answers) {

          // Prompt for password if we have no stored session
          // or if user is entering a new account
          if (answers.email === undefined || answers.email === 'more') {
            return true;
          }

          // Also prompt for password if we are trying to use a preexisting
          // session and that session is no longer valid
          if (answers.email) {
            // @todo: Eventually this can handle multiple sessions
            return !pantheon.validateSession(pantheon.getSession());
          }

        }
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
        description: 'Pantheon site machine name.',
      },
      inquire: {
        type: 'list',
        message: 'Which site?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // @todo: handle account switching
          /*
          var email = (answers.email) ? answers.email : answers.email2;
          */

          // Grab a list of sites from pantheon, we presume if youve
          // gotten this far that you have a valid session and all is right in
          // the world
          pantheon.getSites()

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

          // @todo: handle account switching
          /*
          var email = (answers.email) ? answers.email : answers.email2;
          */

          // Grab this sites environments, we presume if youve
          // gotten this far that you have a valid session and all is right in
          // the world
          pantheon.getEnvironments(answers.uuid)

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
