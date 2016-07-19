'use strict';

module.exports = function(kbox, app) {

  // Modules
  var _ = require('lodash');

  // Nobody expects the Spanish Inquisition!
  var inquirer = require('inquirer');

  // Get other kalabox modules
  var qs = require('./questions.js')(kbox, app);
  var filterQs = kbox.util.cli.filterQuestions;

  // Get our config
  var conf = app.config.pluginconfig.pantheon;

  /*
   * Set default choices if we need to
   */
  var setDefaultChoices = function(choices) {
    if (_.isEmpty(choices.database)) {
      choices.database = conf.env;
    }
    if (_.isEmpty(choices.files)) {
      choices.files = conf.env;
    }
    return choices;
  };

  // Load our push and pull tasks
  app.events.on('load-tasks', function() {

    // kbox pull
    kbox.tasks.add(function(task) {

      // Define our task metadata
      task.path = [app.name, 'pull'];
      task.category = 'appAction';
      task.description = 'Pull down new code and optionally data and files';
      task.kind = 'delegate';
      task.options.push({
        name: 'database',
        kind: 'string',
        description: 'Pull DB from a supported env or none'
      });
      task.options.push({
        name: 'files',
        kind: 'string',
        description: 'Pull files from a supported env or none'
      });

      // This is what we run yo!
      task.func = function(done) {

        // Get our options before this becomes that
        var options = this.options;

        // Launch the inquiry
        inquirer.prompt(filterQs(qs.pull, options), function(answers) {

          // Report to metrics.
          return kbox.metrics.reportAction('pull')

          // Do the pull
          .then(function() {

            // Get our pull module
            var puller = require('./pull.js')(kbox, app);

            // Compute our choices
            var choices = setDefaultChoices(_.merge({}, options, answers));

            // Pull the site
            return puller.pull(conf, choices);
          })

          // Finish up
          .nodeify(done);

        });

      };
    });

    // kbox push
    kbox.tasks.add(function(task) {

      // Task metadata
      task.path = [app.name, 'push'];
      task.category = 'appAction';
      task.description = 'Push up new code and optionally data and files';
      task.kind = 'delegate';
      task.options.push({
        name: 'message',
        alias: 'm',
        kind: 'string',
        description: 'Tell us about your change'
      });
      task.options.push({
        name: 'database',
        kind: 'string',
        description: 'Push DB to a supported env or none'
      });
      task.options.push({
        name: 'files',
        kind: 'string',
        description: 'Push files to a supported env or none'
      });

      // This is how we do it
      // https://www.youtube.com/watch?v=0hiUuL5uTKc
      task.func = function(done) {

        // Get our options before this becomes that
        var options = this.options;

        // Launch the inquiry
        inquirer.prompt(filterQs(qs.push, options), function(answers) {

          // Report to metrics.
          return kbox.metrics.reportAction('push')

          // Push our stuff
          .then(function() {

            // Get our push module
            var pusher = require('./push.js')(kbox, app);

            // Compute our choices
            var choices = setDefaultChoices(_.merge({}, options, answers));

            // Push our site
            return pusher.push(conf, choices);

          })

          // Finish up
          .nodeify(done);

        });

      };
    });

  });

};
