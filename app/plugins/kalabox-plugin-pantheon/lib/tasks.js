'use strict';

// Modules
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

module.exports = function(kbox) {

  var globalConfig = kbox.core.deps.get('globalConfig');
  var events = kbox.core.events;
  var engine = kbox.engine;
  var Promise = kbox.Promise;

  kbox.whenApp(function(app) {

    // Grab the needed clients
    var Terminus = require('./terminus.js');
    var terminus = new Terminus(kbox, app);
    var pathToRoot = path.resolve(__dirname, '..', '..', '..');
    var pathToNode = path.join(pathToRoot, 'node_modules');
    var Drush = require(pathToNode + '/kalabox-plugin-drush/lib/drush.js');
    var drush = new Drush(kbox, app, 'terminus');

    // Tasks
    // kbox terminus COMMAND
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'terminus'];
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
        drush.cmd(cmd, opts, done);
      };
    });

  });

};
