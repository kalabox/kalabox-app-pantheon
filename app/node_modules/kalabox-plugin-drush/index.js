'use strict';

module.exports = function(kbox) {

  // Modules
  var path = require('path');
  var fs = require('fs');
  var _ = require('lodash');

  // "Constants"
  var PLUGIN_NAME = 'kalabox-plugin-drush';

  // Tasks
  var taskOpts = {
    name: 'drush-version',
    kind: 'string',
    description: 'The version of drush that you want.'
  };

  var globalConfig = kbox.core.deps.get('globalConfig');
  var events = kbox.core.events.context('bff70713-19f0-4fe2-90d9-371fc303508c');
  var engine = kbox.engine;
  var Promise = kbox.Promise;

  kbox.ifApp(function(app) {

    // Grab the clients
    var Drush = require('./lib/drush.js');
    var drush = new Drush(kbox, app);

    // Events
    // Install the drush container for our things
    events.on('post-install', function(app, done) {
      // If profile is set to dev build from source
      var opts = {
        name: 'drush',
        srcRoot: path.resolve(__dirname)
      };
      engine.build(opts, done);
    });

    // Updates kalabox aliases when app is started.
    // This allows for both kbox drush to be used
    // and local drush to be used via: drush @<appname> status
    events.on('post-start-component', function(component, done) {
      // Only run on the db container
      if (component.name !== 'db') {
        done();
      }
      else {

        kbox.engine.inspect(component.containerId)
        .then(function(data) {
          var key = '3306/tcp';
          if (data && data.NetworkSettings.Ports[key]) {
            var port = data.NetworkSettings.Ports[key][0].HostPort;
            var cmd = [
              'sed',
              '-i',
              's/\'host\'.*/\'host\' => \'' + app.domain + '\',/g',
              '/src/config/drush/aliases.drushrc.php'
            ];

            // Image name
            var image = 'kalabox/debian:stable';

            // Build create options
            var createOpts = {};

            // Build start options
            var startOpts = kbox.util.docker.StartOpts()
              .bind(app.rootBind, '/src')
              .json();

            return kbox.engine.run(image, cmd, createOpts, startOpts);

          }
        })
        .nodeify(done);

      }
    });

    // Tasks
    // drush wrapper: kbox drush COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'drush'];
      task.category = 'appCmd';
      task.description = 'Run drush commands.';
      task.kind = 'delegate';
      task.options.push(taskOpts);
      task.func = function(done) {
        var opts = drush.getOpts(this.options);
        var cmd = this.payload;
        cmd.unshift('@dev');
        drush.cmd(cmd, opts, done);
      };
    });

  });

};
