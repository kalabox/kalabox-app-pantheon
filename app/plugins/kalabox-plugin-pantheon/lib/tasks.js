'use strict';

module.exports = function(kbox) {

  // Modules
  var path = require('path');
  var _ = require('lodash');

  // Nobody expects the Spanish Inquisition!
  var inquirer = require('inquirer');

  // "Constants"
  var PLUGIN_NAME = 'kalabox-plugin-pantheon';
  var TERMINUS = 'terminus:t0.9.3';

  // Kbox modules
  var events = kbox.core.events.context('6e086c59-20d2-46b5-84ce-44d2de1f58b6');

  kbox.whenAppRegistered(function(app) {

    // Get our push and pull stuff
    var puller = require('./pull.js')(kbox, app);
    var pusher = require('./push.js')(kbox, app);

    // Grab the needed clients
    var Terminus = require('./terminus.js');
    var terminus = new Terminus(kbox, app);
    var pathToRoot = path.resolve(__dirname, '..', '..', '..');
    var pathToNode = path.join(pathToRoot, 'node_modules');
    var Drush = require(pathToNode + '/kalabox-plugin-drush/lib/drush.js');
    var drush = new Drush(kbox, app, TERMINUS, PLUGIN_NAME);

    // Get our config
    var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];

    // Supports pull env
    var supportedPullEnvs = [pantheonConf.env, 'test', 'live'];
    var supportedPushEnvs = [pantheonConf.env];

    /*
     * Filter out questions that have been answered interactively
     */
    var filterQuestions = function(questions, options) {

      return _.filter(questions, function(question) {

        var option = options[question.name];

        if (question.filter) {
          options[question.name] = question.filter(options[question.name]);
        }
        if (option === false || option === undefined) {
          return true;
        }
        else {
          return !_.includes(Object.keys(options), question.name);
        }

      });
    };

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

    // Tasks
    // kbox terminus COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'terminus'];
      task.category = 'appCmd';
      task.description = 'Run terminus commands.';
      task.kind = 'delegate';
      task.func = function(done) {
        var opts = terminus.getOpts(this.options);
        var cmd = this.payload;
        terminus.cmd(cmd, opts, done);
      };
    });

    // kbox drush COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'drush'];
      task.category = 'appCmd';
      task.description = 'Run drush commands.';
      task.kind = 'delegate';
      task.options.push({
        name: 'drush-version',
        kind: 'string',
        description: 'The version of drush that you want.'
      });
      task.func = function(done) {
        var opts = drush.getOpts(this.options);
        var cmd = this.payload;
        // If no alias is specified then add our local one
        if (!_.includes(cmd.join(''), '@')) {
          cmd.unshift('@kbox');
        }
        // Need strict off for drush6
        if (opts['drush-version'] === '6') {
          cmd.push('--strict=0');
        }
        // Need to set custom alias path for drush8
        if (opts['drush-version'] === '8') {
          cmd.push('--alias-path=/src/config/drush');
        }
        // Specify the root, this will be overriden by our
        // alias file so it helps for pantheon remote things
        cmd.push('--root=.');
        drush.cmd(cmd, opts, done);
      };
    });

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
        var questions = [
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

        // Filter out interactive questions based on passed in options
        questions = filterQuestions(questions, options);

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {

          // Collect our answers
          var choices = _.merge({}, options, answers);

          // Set defaults if user passed in legacy --database or --files
          choices = setDefaultChoices(choices);

          // Report to metrics.
          return kbox.metrics.reportAction('pull')

          // Grab pantheon aliases
          .then(function() {
            return terminus.getSiteAliases();
          })

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

    // Set the integrations pull method.
    kbox.integrations.get('pantheon').setMethod('pull', function() {
      var self = this;
      return self.ask([
        {
          id: 'shouldPullFiles'
        },
        {
          id: 'shouldPullDatabase'
        }
      ])
      .then(function(answers) {
        // Grab pantheon config so we can mix in interactives
        var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];
        // Grab pantheon aliases
        return terminus.getSiteAliases()
        // Pull our code
        .then(function() {
          self.update('Pulling code.');
          return puller.pullCode(pantheonConf.site, pantheonConf.env);
        })
        // Pull our DB if selected
        .then(function() {
          if (answers.shouldPullDatabase) {
            self.update('Pulling database.');
            return puller.pullDB(pantheonConf.site, pantheonConf.env);
          }
        })
        // Pull our files if selected
        .then(function() {
          if (answers.shouldPullFiles) {
            self.update('Pulling files.');
            return puller.pullFiles(pantheonConf.site, pantheonConf.env);
          }
        })
        .then(function() {
          self.update('Done pulling.');
        });
      });
    });

    // Set the integrations push method.
    kbox.integrations.get('pantheon').setMethod('push', function() {
      // Save reference for later.
      var self = this;
      // Get plugin.
      var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];
      // Get site aliases.
      return kbox.Promise.try(function() {
        return terminus.getSiteAliases();
      })
      // Ask questions.
      .then(function() {
        return self.ask([
          {
            id: 'message'
          },
          {
            id: 'database'
          },
          {
            id: 'files'
          }
        ]);
      })
      // Push code.
      .tap(function(answers) {
        self.update('Pushing code.');
        return pusher.pushCode(
          pantheonConf.site,
          pantheonConf.env,
          answers.message
        );
      })
      // Push database.
      .tap(function(answers) {
        if (answers.database && answers.database !== 'none') {
          self.update('Pushing database.');
          return pusher.pushDB(pantheonConf.site, answers.database);
        }
      })
      // Push files.
      .tap(function(answers) {
        if (answers.files && answers.files !== 'none') {
          self.update('Pushing files.');
          return pusher.pushFiles(pantheonConf.site, answers.files);
        }
      })
      // Signal completion.
      .tap(function() {
        self.update('Done pushing.');
      });
    });

    // kbox appname push
    kbox.tasks.add(function(task) {

      // Grab pantheon conf
      var pantheonConf = app.config.pluginConf[PLUGIN_NAME];

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
        var questions = [
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

        // Filter out interactive questions based on passed in options
        questions = filterQuestions(questions, options);

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {

          // Collect our choices
          var choices = _.merge({}, options, answers);

          // Set defaults if user passed in legacy --database or --files
          choices = setDefaultChoices(choices);

          // Report to metrics.
          return kbox.metrics.reportAction('push')

          // Grab pantheon site aliases
          .then(function() {
            return terminus.getSiteAliases();
          })

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

    // Events
    // Build the site after post-create happens
    events.on('post-create-app', function(app, done) {

      // Our pantheon config for later on
      var pantheonConf = app.config.pluginConf[PLUGIN_NAME];

      // Get our pantheon site aliases
      return terminus.getSiteAliases()

      // Pull our code for the first time
      .then(function() {
        return puller.pullCode(pantheonConf.site, pantheonConf.env);
      })

      // Pull our DB
      .then(function() {
        return puller.pullDB(pantheonConf.site, pantheonConf.env);
      })

      // Get our files
      .then(function() {
        return puller.pullFiles(pantheonConf.site, pantheonConf.env);
      })

      .nodeify(done);

    });

  });

};
