'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');
  var _ = require('lodash');

  // Kbox modules
  var events = kbox.core.events.context('6e086c59-20d2-46b5-84ce-44d2de1f58b6');

  /*
   * Add our pantheon settings to the ENV and also
   * add our data compose to the compose array
   */
  kbox.whenAppRegistered(function(app) {

    // Set our pantheon stuff into the env
    var identifier = 'app_pantheon_config';
    kbox.core.env.setEnvFromObj(app.config.pluginconfig.pantheon, identifier);

    /*
     * Build the site after post-create happens
     */
    events.on('post-create-app', function(app, done) {

      // Get our push and pull stuff
      var puller = require('./pull.js')(kbox, app);

      // Grab the needed clients
      var Terminus = require('./terminus.js');
      var terminus = new Terminus(kbox, app);

      // Our pantheon config for later on
      var pantheonConf = app.config.pluginConf.pantheon;

      // Get our pantheon site aliases
      return terminus.getSiteAliases()

      // Pull our code for the first time
      .then(function() {
        return puller.pullCode(pantheonConf.site, pantheonConf.env);
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

    /*
     * We don't want to uninstall our data container on a rebuild
     * so remove the data container from here
     *
     * NOTE: this is a nifty implementation where we inception some events
     * to target exactly what we want
     */
    events.on('pre-app-rebuild', function(app) {
      //app.composeCore = _.remove(app.composeCore, function(file) {
      //  return file !== dataCompose;
      //});
    });


  });

};
