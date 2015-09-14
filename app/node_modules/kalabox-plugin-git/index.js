'use strict';

var path = require('path');
var taskOpts = require('./lib/tasks.js');

module.exports = function(kbox) {

  var events = kbox.core.events;
  var engine = kbox.engine;

  kbox.whenApp(function(app) {

    // Grab the clients
    var Git = require('./lib/git.js');
    var git = new Git(kbox, app);

    // Events
    // Install the util container for our things
    events.on('post-install', function(app, done) {
      var opts = {
        name: 'git',
        srcRoot: path.resolve(__dirname)
      };
      engine.build(opts, done);
    });

    // Tasks
    // git wrapper: kbox git COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'git'];
      task.description = 'Run git commands.';
      task.kind = 'delegate';
      task.options.push(taskOpts.gitUsername);
      task.options.push(taskOpts.gitEmail);
      task.func = function(done) {
        // We need to use this faux bin until the resolution of
        // https://github.com/syncthing/syncthing/issues/1056
        git.cmd(this.payload, this.options, done);
      };
    });

  });

};
