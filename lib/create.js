
'use strict';

module.exports = function(kbox, pantheon) {

  // Npm modulez
  var _ = require('lodash');

  // Get any options that might be in play
  var options = kbox.core.deps.get('argv').options;

  // Select a machine token (by email) or optionally add another
  kbox.create.add('pantheon', {
    option: {
      name: 'token',
      weight: -99,
      task: {
        kind: 'string',
        description: 'Pantheon machine token',
      },
      inquire: {
        type: 'list',
        message: 'Choose a Pantheon account',

        // Grab a list of tokens to use plus an option to add a new one
        choices: function() {

          // Get our list of tokens
          var choices = pantheon.getTokensByEmail();

          // Add option to add another token
          choices.push({name: 'add a different token', value: 'more'});

          // Return choices
          return choices;

        },

        // Return either:
        //  * The token as passed in by --token
        //  * The token for the selected email
        //  * 'more'
        filter: function(input) {
          if (input) {
            var more = (input && input === 'more');
            var token = options.token || pantheon.getTokenFromEmail(input);
            return (more) ? 'more' : token;
          }
        },

        // Only run this prompt if we have entered a pantheon machine token before
        when: function() {
          return !_.isEmpty(pantheon.getTokensByEmail());
        }
      }
    }
  });

  // Prompt for a machine token if needed
  kbox.create.add('pantheon', {
    option: {
      name: 'token',
      weight: -98,
      inquire: {
        type: 'password',
        message: 'Enter a Pantheon machine token',
        // Only run this prompt if we don't have a token yet
        when: function(answers) {
          return (!answers.token || answers.token === 'more');
        }
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'site',
      weight: -90,
      task: {
        kind: 'string',
        description: 'Pantheon site machine name',
      },
      inquire: {
        type: 'list',
        message: 'Which site?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // Get the token from either options or the answers
          var token = options.token || answers.token;

          // Authenticate with the token to get a session
          return pantheon.getSites(token)

          // Parse the list
          .then(function(sites) {
            done(sites);
          });

        }
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
        description: 'Pantheon site environment',
      },
      inquire: {
        type: 'list',
        message: 'Which environment?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // The token and site are either in the answers or the options
          var token = options.token || answers.token;
          var site = options.site || answers.site;

          // Authenticate with the token to get a session
          return pantheon.getEnvs(token, site)

          // Parse and return the envs
          .then(function(envs) {
            done(envs);
          });

        }
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'name',
      weight: -75,
      task: {
        kind: 'string',
        description: 'The name of your app.',
      },
      inquire: {
        type: 'input',
        message: 'What will you call this monster you have created',
        validate: function(value) {
          // @todo: do we need a better error message?
          var domain = kbox.core.deps.get('globalConfig').domain;
          var kebabMe = kbox.util.domain.modKebabCase(value);
          return kbox.util.domain.validateDomain([kebabMe, domain].join('.'));
        },
        filter: function(value) {
          if (value) {
            return kbox.util.domain.modKebabCase(value);
          }
        },
        default: function(answers) {
          return options.site || answers.site;
        }
      },
      conf: {
        type: 'global'
      }
    }
  });

  // Add a non-interactive option to skip pulling the database
  kbox.create.add('pantheon', {
    option: {
      name: 'nodb',
      task: {
        kind: 'boolean',
        description: 'Skip pulling my database.',
      }
    }
  });

  // Add a non-interactive option to skip pulling the files directory
  kbox.create.add('pantheon', {
    option: {
      name: 'nofiles',
      task: {
        kind: 'boolean',
        description: 'Skip pulling my files directory.',
      }
    }
  });

};
