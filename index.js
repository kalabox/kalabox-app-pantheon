'use strict';

var _ = require('lodash');

module.exports = function(kbox) {

  var drupalMatrix = {
    '6': {
      php: '5.3.29',
      drush: '5'
    },
    '7': {
      php: '5.4.40',
      drush: '6'
    },
    '8': {
      php: '5.5.24',
      drush: '7'
    }
  };

  // Declare our app to the world
  kbox.create.add('drupal', {
    task: {
      name: 'Drupal',
      module: 'kalabox-app-drupal',
      description: 'Creates a Drupal app.'
    }
  });

  // Add an option
  kbox.create.add('drupal', {
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
        default: 'My Drupal App'
      },
      conf: {
        type: 'global',
        key: 'appName'
      }
    }
  });

  // Add an option
  kbox.create.add('drupal', {
    option: {
      name: 'drupal-version',
      weight: -98,
      inquire: {
        type: 'list',
        message: 'What major version of drupal',
        default: '7',
        choices: Object.keys(drupalMatrix)
      }
    }
  });

  // Load php things
  require('./node_modules/kalabox-plugin-php/create.js')(
    kbox,
    drupalMatrix,
    'drupal'
  );

  // Load drush things
  require('./node_modules/kalabox-plugin-drush/create.js')(
    kbox,
    drupalMatrix,
    'drupal'
  );

  // Load git things
  require('./node_modules/kalabox-plugin-git/create.js')(kbox, 'drupal');

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'drupal');
  });

};
