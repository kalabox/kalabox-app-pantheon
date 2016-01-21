'use strict';

module.exports = function(kbox) {

  kbox.whenAppRegistered(function(app) {

    // Get our push and pull stuff
    var puller = require('./pull.js')(kbox, app);
    var pusher = require('./push.js')(kbox, app);

    // Grab the needed clients
    var Terminus = require('./terminus.js');
    var terminus = new Terminus(kbox, app);

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

  });

};
