'use strict';

module.exports = function(kbox, app) {

  // Modules
  var _ = require('lodash');

  // Get our config
  var pantheonConf = app.config.pluginconfig.pantheon;

  // Supports pull env
  var supportedPullEnvs = [pantheonConf.env, 'test', 'live'];
  var supportedPushEnvs = [pantheonConf.env];

  /*
   * Get choices array for supported pull environments
   * @todo: allow multidev?
   */
  var getEnvPullChoices = function() {

    // Map to a choices object and return
    return _.map(supportedPullEnvs, function(env) {
      return {
        name: env,
        value: env
      };
    });

  };

  /*
   * Get choices array for supported pull environments
   * @todo: allow multidev?
   */
  var getEnvPushChoices = function() {

    // Map to a choices object and return
    return _.map(supportedPushEnvs, function(env) {
      return {
        name: env,
        value: env
      };
    });

  };

  /*
   * Helper to get pull questions
   */
  var getPullQuestions = function() {

    return [
      {
        type: 'list',
        name: 'database',
        message: 'Pull database from which environment?',
        choices: function() {

          // Get approved choices
          var choices = getEnvPullChoices();

          // Add none choice
          choices.push({
            name: 'Do not pull a database',
            value: 'none'
          });

          // Return our choices
          return choices;

        },
        default: function() {
          return pantheonConf.env;
        }
      },
      {
        type: 'list',
        name: 'files',
        message: 'Pull files from which environment?',
        choices: function() {

          // Get approved choices
          var choices = getEnvPullChoices();

          // Add none choice
          choices.push({
            name: 'Do not pull files',
            value: 'none'
          });

          // Return our choices
          return choices;

        },
        default: function(answers) {
          return answers.database || pantheonConf.env;
        }
      }
    ];
  };

  /*
   * Helper to get push questions
   */
  var getPushQuestions = function() {
    return [
      {
        type: 'string',
        name: 'message',
        message: 'Tell us about your changes'
      },
      {
        type: 'list',
        name: 'database',
        message: 'Push database to which environment?',
        choices: function() {

          // Get approved choices
          var choices = getEnvPushChoices();

          // Add none choice
          choices.push({
            name: 'Do not push the database',
            value: 'none'
          });

          // Return our choices
          return choices;

        },
        default: function() {
          return pantheonConf.env;
        }
      },
      {
        type: 'list',
        name: 'files',
        message: 'Push files to which environment?',
        choices: function() {

          // Get approved choices
          var choices = getEnvPushChoices();

          // Add none choice
          choices.push({
            name: 'Do not push the files',
            value: 'none'
          });

          // Return our choices
          return choices;

        },
        default: function(answers) {
          return answers.database || pantheonConf.env;
        }
      }
    ];
  };

  return {
    push: getPushQuestions(),
    pull: getPullQuestions()
  };

};
