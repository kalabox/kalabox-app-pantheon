'use strict';

module.exports = function(kbox) {

  // Intrinsic modules
  var crypto = require('crypto');
  var path = require('path');
  var fs = require('fs');

  // NPM modules
  var _ = require('lodash');

  // Constants
  var PLUGIN_NAME = 'kalabox-plugin-pantheon';
  var TERMINUS = 'terminus:t0.9.3';

  // Kbox modules
  var events = kbox.core.events.context('cc8e0202-4c28-467b-8bae-433bae435f08');

  kbox.ifApp(function(app) {

    /*
     * Basic kalabox.json validation function
     * @todo: this is pretty weak for now
     */
    var validateKalaboxJson = function() {

      // Path to kbox json
      var kjPath = path.join(app.root, 'kalabox.json');

      // Check to see if we even have a kalabox.json
      if (!fs.existsSync(kjPath))  {
        return false;
      }

      // Objectify
      var kj = require(kjPath);
      var pantheonConfig = kj.pluginConf[PLUGIN_NAME];

      // Do a quick scan to make sure our pantheon plugin has all non-empty
      // values
      var isGood = _.reduce(pantheonConfig, function(current, now) {
        return current && !_.isEmpty(now);
      });

      // Looks like we good! WE CNA DO THIS!
      return isGood && true;

    };

    /*
     * Updates kalabox aliases when app is started and symlinks some things
     */
    events.on('post-start-component', function(component, done) {

      // Image name
      var image = 'kalabox/debian:stable';

      // Build create options
      var createOpts = {};

      // Build start options
      var startOpts = kbox.util.docker.StartOpts()
        .bind(app.rootBind, '/src')
        .volumeFrom(component.dataContainerName)
        .json();

      // Only run on the db container
      // This allows for both kbox drush to be used
      // and local drush to be used via: drush @<appname> status
      if (component.name === 'db') {

        kbox.engine.inspect(component.containerId)
        .then(function(data) {
          var key = '3306/tcp';
          if (data && data.NetworkSettings.Ports[key]) {
            //var port = data.NetworkSettings.Ports[key][0].HostPort;
            var cmd = [
              'sed',
              '-i',
              's/\'host\'.*/\'host\' => \'' + app.domain + '\',/g',
              '/src/config/drush/aliases.drushrc.php'
            ];

            return kbox.engine.run(image, cmd, createOpts, startOpts);
          }
        })

        .nodeify(done);

      }

      // Only run on the appserver container
      // Symlinks
      else if (component.name === 'appserver') {

        // Emulate /srv/bindings
        var cmd = ['mkdir', '-p', '/srv/bindings'];
        return kbox.engine.queryData(component.containerId, cmd)
        // If on drops8 make sure styles dir exists
        .then(function() {
          if (framework === 'drupal8') {
            var cmd = ['mkdir', '-p', '/media/styles'];
            return kbox.engine.queryData(component.containerId, cmd);
          }
        })
        // Emulate /srv/bindings
        .then(function() {
          var cmd = ['ln', '-nsf', '/', '/srv/bindings/kalabox'];
          return kbox.engine.queryData(component.containerId, cmd);
        })
        // Check if symlink dir exists
        .then(function() {
          var fileMount = frameworkSpec[framework].filemount;
          var upOneDir = fileMount.split('/');
          upOneDir.pop();
          var codeDir = app.config.codeDir;
          var dirCheck = '/' + [codeDir, upOneDir.join('/')].join('/');
          var cmd = ['ls', dirCheck];
          return kbox.engine.queryData(component.containerId, cmd);
        })
        // Check if we can create the symlink or not
        .catch(function(error) {
          return !_.contains(error.message, 'Non-zero exit code');
        })
        // Symlink the filemount to /media if appropriate
        .then(function(canCreate) {
          if (canCreate !== false) {
            var fileMount = frameworkSpec[framework].filemount;
            // Check if mount dir exists and set the symlink if it does
            var lnkFile = '/' + [app.config.codeDir, fileMount].join('/');
            var cmd = ['ln', '-nsf', '/media', lnkFile];
            return kbox.engine.queryData(component.containerId, cmd);
          }
        })

        .nodeify(done);

      }

      // Just finish
      else {
        done();
      }

    });

  });

};
