'use strict';

var path = require('path');
var _ = require('lodash');

var PLUGIN_NAME = 'kalabox-plugin-rsync';

module.exports = function(kbox) {

  var events = kbox.core.events.context('67543535-178f-440a-969d-825fd4d1f303');
  var engine = kbox.engine;
  var globalConfig = kbox.core.deps.lookup('globalConfig');

  kbox.ifApp(function(app) {

    // Grab the clients
    var Rsync = require('./lib/rsync.js');
    var rsync = new Rsync(kbox, app);

    // Events
    // Install the util container for our things
    events.on('post-install', function(app, done) {
      // If profile is set to dev build from source
      var opts = {
        name: 'rsync',
        srcRoot: path.resolve(__dirname)
      };
      engine.build(opts, done);
    });

    // Tasks
    // git wrapper: kbox git COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'rsync'];
      task.category = 'appCmd';
      task.description = 'Run rsync commands.';
      task.kind = 'delegate';
      task.func = function(done) {
        rsync.cmd(this.payload, false, done);
      };
    });

  });

};
