'use strict';

var path = require('path');

module.exports = function(kbox) {

  var events = kbox.core.events;
  var engine = kbox.engine;

  kbox.whenApp(function(app) {

    // Events
    // Install the terminus container for our things
    events.on('post-install', function(app, done) {
      var opts = {
        name: 'terminus',
        srcRoot: path.resolve(__dirname, '..', '..', '..'),
      };
      engine.build(opts, done);
    });

  });

};
