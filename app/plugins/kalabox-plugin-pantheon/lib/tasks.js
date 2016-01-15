'use strict';

module.exports = function(kbox) {

  // Modules
  var _ = require('lodash');

  // Nobody expects the Spanish Inquisition!
  var inquirer = require('inquirer');

  kbox.whenAppRegistered(function(app) {

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
     * Set default choices if we need to
     */
    var setDefaultChoices = function(choices) {
      if (_.isEmpty(choices.database)) {
        choices.database = pantheonConf.env;
      }
      if (_.isEmpty(choices.files)) {
        choices.files = pantheonConf.env;
      }
      return choices;
    };

    /*
     * Helper to get pull questions
     */
    var getPullQuestions = function(options) {
      return [
        {
          type: 'list',
          name: 'database',
          message: 'Which database do you want to use?',
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
          type: 'confirm',
          name: 'newbackup',
          message: 'Create a new DB backup?',
          when: function(answers) {
            var optDb = options.database;
            var anDb = answers.database;
            var pullDb = optDb !== 'none' && anDb !== 'none';
            return !options.latestbackup && pullDb;
          }
        },
        {
          type: 'list',
          name: 'files',
          message: 'Which files do you want to use?',
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
          message: 'Which env do you want to push the DB to?',
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
          message: 'Which env do you want to push the files to?',
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

    // kbox pull
    kbox.tasks.add(function(task) {

      // Define our task metadata
      task.path = [app.name, 'pull'];
      task.category = 'appAction';
      task.description = 'Pull down new code and optionally data and files.';
      task.kind = 'delegate';
      // Build list of options for desc
      var getOptions = 'Options are ' + supportedPullEnvs.join(', ');
      task.options.push({
        name: 'database',
        kind: 'string',
        description: 'Pull DB from an env. ' + getOptions + ' and none'
      });
      task.options.push({
        name: 'files',
        kind: 'string',
        description: 'Pull files from an env. ' + getOptions + ' and none'
      });
      task.options.push({
        name: 'newbackup',
        kind: 'boolean',
        description: 'True to generate a new DB backup'
      });
      task.options.push({
        name: 'latestbackup',
        kind: 'boolean',
        description: 'Use latest DB backup'
      });

      // This is what we run yo!
      task.func = function(done) {

        // Grab the CLI options that are available
        var options = this.options;
        var questions = getPullQuestions();

        // Filter out interactive questions based on passed in options
        questions = kbox.util.cli.filterQuestions(questions, options);

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {

          // Get our pull module
          var puller = require('./pull.js')(kbox, app);

          // Collect our answers
          var choices = _.merge({}, options, answers);

          // Set defaults if user passed in legacy --database or --files
          choices = setDefaultChoices(choices);

          // Report to metrics.
          return kbox.metrics.reportAction('pull')

          // Pull our code
          .then(function() {
            return puller.pullCode(pantheonConf.site, pantheonConf.env);
          })

          // Pull our DB if selected
          .then(function() {
            if (choices.database && choices.database !== 'none') {

              // Get our args
              var site = pantheonConf.site;
              var database = choices.database;
              var newBackup = choices.newbackup;

              return puller.pullDB(site, database, newBackup);
            }
          })

          // Pull our files if selected
          .then(function() {
            if (choices.files && choices.files !== 'none') {

              // Get our args
              var site = pantheonConf.site;
              var files = choices.files;
              var newBackup = choices.newbackup;

              return puller.pullFiles(site, files, newBackup);
            }
          })

          .nodeify(done);

        });

      };
    });

    // kbox appname push
    kbox.tasks.add(function(task) {

      // Task metadata
      task.path = [app.name, 'push'];
      task.category = 'appAction';
      task.description = 'Push up new code and optionally data and files.';
      task.kind = 'delegate';
      task.options.push({
        name: 'message',
        alias: 'm',
        kind: 'string',
        description: 'Tell us about your change'
      });
      // Build list of options for desc
      var getOptions = 'Options are ' + supportedPushEnvs.join(', ');
      task.options.push({
        name: 'database',
        kind: 'string',
        description: 'Push DB to specific env. ' + getOptions + ' and none'
      });
      task.options.push({
        name: 'files',
        kind: 'string',
        description: 'Push files to a spefic env. ' + getOptions + ' and none'
      });

      // This is how we do it
      // https://www.youtube.com/watch?v=0hiUuL5uTKc
      task.func = function(done) {

        // Grab the CLI options that are available
        var options = this.options;
        var questions = getPushQuestions(options);

        // Filter out interactive questions based on passed in options
        questions = kbox.util.cli.filterQuestions(questions, options);

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {

          // Get our push module
          var pusher = require('./push.js')(kbox, app);

          // Collect our choices
          var choices = _.merge({}, options, answers);

          // Set defaults if user passed in legacy --database or --files
          choices = setDefaultChoices(choices);

          // Report to metrics.
          return kbox.metrics.reportAction('push')

          // Push our code
          .then(function() {
            return pusher.pushCode(
              pantheonConf.site,
              pantheonConf.env,
              choices.message
            );
          })

          // Push our DB is selected
          .then(function() {
            if (choices.database && choices.database !== 'none') {
              return pusher.pushDB(pantheonConf.site, choices.database);
            }
          })

          // Push our files if selected
          .then(function() {
            if (choices.files && choices.files !== 'none') {
              return pusher.pushFiles(pantheonConf.site, choices.files);
            }
          })

          .nodeify(done);

        });

      };
    });

  });

};
