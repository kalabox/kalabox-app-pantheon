'use strict';

module.exports = function(kbox) {

  var path = require('path');
  var taskOpts = {
    gitUsername: {
      name: 'git-username',
      kind: 'string',
      description: 'Your git username.'
    },
    gitEmail: {
      name: 'git-email',
      kind: 'string',
      description: 'Your git email.'
    }
  };

  var events = kbox.core.events.context('8a227c39-60b6-4568-9c6b-a1035fcc163f');
  var engine = kbox.engine;

  kbox.ifApp(function(app) {

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
      task.category = 'appCmd';
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
