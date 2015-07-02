'use strict';

var _ = require('lodash');

module.exports = function(kbox) {

  // Get some nice looking conf
  var phpVersions = require('./conf/php.js')(kbox);

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
      name: 'name',
      weight: -99,
      task: {
        kind: 'string',
        description: 'The name of your app.',
      },
      inquire: {
        type: 'input',
        message: 'What will this app be called',
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
  /*
  kbox.create.add('pantheon', {
    option: {
      name: 'pantheon-grab',
      weight: -98,
      inquire: {
        type: 'list',
        message: 'What do you want to do?',
        default: 'create',
        choices: [
          {name: 'Pull down a pre-existing site from Pantheon', value: 'pull'},
          {name: 'Create new site from start state', value: 'create'},
          {name: 'Import site from elsewhere', value: 'import'}
        ]
      }
    }
  });
  */

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

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'solr',
      task: {
        kind: 'string',
        description: 'Add solr service?',
      },
      inquire: {
        type: 'confirm',
        message: 'Use solr?',
        default: false
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'solr'
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'redis',
      task: {
        kind: 'string',
        description: 'Add redis service?',
      },
      inquire: {
        type: 'confirm',
        message: 'Use redis?',
        default: false
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-pantheon',
        key: 'redis'
      }
    }
  });

  // Load git things
  require('./node_modules/kalabox-plugin-git/create.js')(kbox, 'pantheon');

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'pantheon');
  });

};
