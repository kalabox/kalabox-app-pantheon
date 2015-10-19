'use strict';

module.exports = function(kbox, drupal, appName) {

  var _ = require('lodash');

  var taskOpts = {
    name: 'drush-version',
    kind: 'string',
    description: 'The version of drush that you want.'
  };

  var drushVersions = _.pluck(drupal, 'drush');

  // Add an option
  kbox.create.add(appName, {
    option: {
      name: 'drush-version',
      task: taskOpts,
      inquire: {
        type: 'list',
        message: 'Major Drush version?',
        default: function(answers) {
          if (answers['drupal-version']) {
            return drupal[answers['drupal-version']].drush;
          }
          else {
            return '6';
          }
        },
        choices: drushVersions
      },
      conf: {
        type: 'plugin',
        plugin: 'kalabox-plugin-drush',
        key: 'drush-version'
      }
    }
  });

};
