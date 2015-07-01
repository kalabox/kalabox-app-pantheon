'use strict';

var _ = require('lodash');

module.exports = function(kbox) {

  var pantheonMatrix = {
    'drupal6': {
      php: '5.3.29',
      drush: '5'
    },
    'drupal7': {
      php: '5.3.29',
      drush: '6'
    },
    'wordpress': {
      php: '5.3.29',
      drush: '5'
    },
    'drupal8': {
      php: '5.5.24',
      drush: '7'
    }
  };

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
  kbox.create.add('pantheon', {
    option: {
      name: 'pantheon-type',
      weight: -98,
      inquire: {
        type: 'list',
        message: 'What kind of Pantheon app',
        default: 'drupal7',
        choices: Object.keys(pantheonMatrix)
      }
    }
  });

  // Load php things
  require('./node_modules/kalabox-plugin-php/create.js')(
    kbox,
    pantheonMatrix,
    'pantheon'
  );

  // Load drush things
  require('./node_modules/kalabox-plugin-drush/create.js')(
    kbox,
    pantheonMatrix,
    'pantheon'
  );

  // Load git things
  require('./node_modules/kalabox-plugin-git/create.js')(kbox, 'pantheon');

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'pantheon');
  });

};
