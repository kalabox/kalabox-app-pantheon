
'use strict';

module.exports = function(kbox, pantheon) {

  // Intrinsic modules.
  var path = require('path');
  var fs = require('fs');

  // Npm modulez
  var _ = require('lodash');
  var Promise = require('bluebird');
  var fingerprint = require('ssh-fingerprint');
  var keygen = require('ssh-keygen');
  Promise.longStackTraces();

  // "CONSTANTS"
  var SSH_DIR = path.join(kbox.core.deps.lookup('globalConfig').home, '.ssh');
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
  // @todo: Add a when function to this that checks for a valid cached token
  // and only prompts user if it needs to refresh
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
        description: 'Pantheon site machine name.',
      },
      inquire: {
        type: 'list',
        message: 'Which site?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // Login to the pantheon, set up SSH keys if needed
          // and pull a list of sites
          // @todo: ERROR HANDLING
          // @todo: better debug logging
          // @toto: AFRICA
          pantheon.login(answers.email, answers.password)

          // We've got a session!
          .then(function(session) {

            kbox.core.log.debug('PANTHEON LOGIN => WE GOOD', session);

            // Now check to see whether we have a pantheon SSH key already
            // @todo: we shouldnt assume that because a private key exists that a
            // public one does as well
            return existsAsync(PRIVATE_KEY_PATH)

            // Generate a new SSH key if eneded
            .then(function(exists) {
              if (!exists) {
                kbox.core.log.debug('PANTHEON SSHKEY => GENERATING KEY');
                var keyOpts = {
                  location: PRIVATE_KEY_PATH,
                  comment: answers.email,
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
              return pantheon.getSSHKeys()

              // IF THE GLOVE FITS! YOU MUST ACQUIT!
              .then(function(keys) {
                return _.has(keys, pubKey.print);
              })

              // Post a key to pantheon if needed
              .then(function(hasKey) {
                if (!hasKey) {
                  kbox.core.log.debug('PANTHEON SSHKEY => POSTING KEY');
                  return pantheon.postSSHKey(pubKey.data);
                }
              });
            })

            // Grab a list of sites from pantheon
            .then(function() {
              return pantheon.getSites();
            })

            // Parse the list
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
            return pantheon.getProducts()
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

          // Login to the pantheon
          pantheon.login(answers.email, answers.password)
          .then(function(session) {

            // grab our sites environments
            var uuid = answers.uuid;
            return pantheon.getEnvironments(uuid)
            .then(function(envs) {
              done(parseEnvironments(envs));
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
          if (answers.action === 'pull') {
            return pantheon.sites[answers.uuid].information.name;
          }
          else {
            return pantheon.products[answers.product].attributes.machinename;
          }
        }
      },
      conf: {
        type: 'global',
        key: 'appName'
      }
    }
  });

   // Load git things
  var gitCreate = './../node_modules/kalabox-plugin-git/lib/create.js';
  require(gitCreate)(kbox, 'pantheon');

};
