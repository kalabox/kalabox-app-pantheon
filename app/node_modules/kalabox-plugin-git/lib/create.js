'use strict';

var taskOpts = require('./tasks');

module.exports = function(kbox, appName) {

  // Add an option
  kbox.create.add(appName, {
    option: {
      name: 'git-username',
      task: taskOpts.gitUsername,
      inquire: {
        type: 'input',
        message: 'Git username?',
        validate: function(value) {
          // @todo some actual validation here
          return true;
        },
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-git',
        key: 'git-username'
      }
    }
  });

  // Add an option
  kbox.create.add(appName, {
    option: {
      name: 'git-email',
      task: taskOpts.gitEmail,
      inquire: {
        type: 'input',
        message: 'Git email?',
        validate: function(value) {
          // @todo some actual validation here
          return true;
        },
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-git',
        key: 'git-email'
      }
    }
  });

};
