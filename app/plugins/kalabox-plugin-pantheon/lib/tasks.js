'use strict';

module.exports = function(kbox) {

  // Modules
  var path = require('path');
  var fs = require('fs');
  var _ = require('lodash');

  // Nobody expects the Spanish Inquisition!
  var inquirer = require('inquirer');

  // "Constants"
  var PLUGIN_NAME = 'kalabox-plugin-pantheon';

  kbox.ifApp(function(app) {

    // Get our push and pull stuff
    var puller = require('./pull.js')(kbox, app);
    var pusher = require('./push.js')(kbox, app);

    // Grab the needed clients
    var Terminus = require('./terminus.js');
    var terminus = new Terminus(kbox, app);
    var pathToRoot = path.resolve(__dirname, '..', '..', '..');
    var pathToNode = path.join(pathToRoot, 'node_modules');
    var Drush = require(pathToNode + '/kalabox-plugin-drush/lib/drush.js');
    var drush = new Drush(kbox, app, 'terminus', PLUGIN_NAME);

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
        cmd.unshift('@dev');
        cmd.push('--strict=0');
        drush.cmd(cmd, opts, done);
      };
    });

    // kbox pull
    kbox.tasks.add(function(task) {

      // Grab pantheon config so we can mix in interactives
      var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];

      // Define our task metadata
      task.path = [app.name, 'pull'];
      task.category = 'appAction';
      task.description = 'Pull down new code and optionally data and files.';
      task.kind = 'delegate';
      task.options.push({
        name: 'database',
        kind: 'boolean',
        description: 'Import latest database backup.'
      });
      task.options.push({
        name: 'files',
        kind: 'boolean',
        description: 'Import latest files.'
      });

      // This is what we run yo!
      task.func = function(done) {

        // Grab the CLI options that are available
        var options = this.options;
        var questions = [
          {
            type: 'confirm',
            name: 'database',
            message: 'Also refresh from latest database backup?',
          },
          {
            type: 'confirm',
            name: 'files',
            message: 'Also grab latest files?',
          },
        ];

        // Filter out interactive questions based on passed in options
        questions = filterQuestions(questions, options);

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {

          // Collect our answers
          var choices = _.merge({}, options, answers);

          // Grab pantheon aliases
          return terminus.getSiteAliases()

          // Pull our code
          .then(function() {
            return puller.pullCode(pantheonConf.site, pantheonConf.env, 'pull');
          })

          // Pull our DB if selected
          .then(function() {
            if (choices.database) {
              return puller.pullDB(pantheonConf.site, pantheonConf.env);
            }
          })

          // Pull our files if selected
          .then(function() {
            if (choices.files) {
              return puller.pullFiles(pantheonConf.site, pantheonConf.env);
            }
          })

          .nodeify(done);

        });

      };
    });

    // kbox appname pull
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
        kind: 'string',
        description: 'Tell us about your change'
      });
      task.options.push({
        name: 'database',
        kind: 'boolean',
        description: 'Push local database up.'
      });
      task.options.push({
        name: 'files',
        kind: 'boolean',
        description: 'Push local files up.'
      });

      // This is how we do it
      // https://www.youtube.com/watch?v=0hiUuL5uTKc
      task.func = function(done) {

        // Grab the CLI options that are available
        var options = this.options;
        var questions = [
          {
            type: 'input',
            name: 'm',
            message: 'Tell us about these changes.',
            default: 'Best changes ever!'
          },
          {
            type: 'confirm',
            name: 'database',
            message: 'Also push up your local database?',
          },
          {
            type: 'confirm',
            name: 'files',
            message: 'Also push up your local files directory?',
          },
        ];

        // Filter out interactive questions based on passed in options
        questions = filterQuestions(questions, options);

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {

          // Collect our choices
          var choices = _.merge({}, options, answers);

          // Grab pantheon site aliases
          return terminus.getSiteAliases()

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
            if (choices.database) {
              return pusher.pushDB(pantheonConf.site, pantheonConf.env);
            }
          })

          // Push our files if selected
          .then(function() {
            if (choices.files) {
              return pusher.pushFiles(pantheonConf.site, pantheonConf.env);
            }
          })

          .nodeify(done);

        });

      };
    });

    // Events
    // Build the site after post-create happens
    kbox.core.events.on('post-create-app', function(app, done) {

      // Our pantheon config for later on
      var pantheonConf = app.config.pluginConf[PLUGIN_NAME];

      // Get our pantheon site aliases
      return terminus.getSiteAliases()

      // Pull our code for the first time
      .then(function() {
        return puller.pullCode(pantheonConf.site, pantheonConf.env, 'clone');
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
