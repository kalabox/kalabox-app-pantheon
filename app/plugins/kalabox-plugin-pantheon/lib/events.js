
'use strict';
module.exports = function(kbox, app) {

  // Node modules
  var _ = require('lodash');

  /*
   * Add our pantheon settings to the ENV and also
   * add our data compose to the compose array
   */

  // Set our pantheon stuff into the env
  var identifier = 'app_pantheon_config';
  app.env.setEnvFromObj(app.config.pluginconfig.pantheon, identifier);

  /*
   * Build the site after post-create happens
   */
  app.events.on('post-create', function(done) {

    // Get our push and pull stuff
    var puller = require('./pull.js')(kbox, app);

    // Our pantheon config for later on
    var pantheonConf = app.config.pluginconfig.pantheon;

    // Pull the pantheon site screenshot
    return puller.pullScreenshot(pantheonConf.uuid, pantheonConf.env)

    // Pull our code for the first time
    .then(function() {
      return puller.pullCode(pantheonConf.site, pantheonConf.env);
    })

    // Pull our DB
    .then(function() {
      if (!_.get(app.results, 'nodb', false)) {
        return puller.pullDB(pantheonConf.site, pantheonConf.env);
      }
    })

    // Get our files
    .then(function() {
      if (!_.get(app.results, 'nofiles', false)) {
        return puller.pullFiles(
          pantheonConf.site,
          pantheonConf.uuid,
          pantheonConf.env
        );
      }
    })

    // Then rebuild caches and registries as appropriate
    .then(function() {
      return puller.rebuild();
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
  app.events.on('pre-rebuild', function() {

    // We want to edit our engine remove things
    kbox.core.events.on('pre-engine-destroy', function(data) {

      // Get our services
      var services = _.flatten(_.map(app.composeCore, function(file)  {
        return _.keys(kbox.util.yaml.toJson(file));
      }));

      // Remove the data element
      var withoutData = _.remove(services, function(service) {
        return service !== 'data';
      });

      // Update data to note remove data services on rebuilds
      data.opts = {services: withoutData};

    });

  });

  /*
   * build an object of services to use
   */
  app.events.on('services', function() {

    // Get our services module
    var services = require('./services.js')(kbox, app);

    // Get our services info
    return services.getServicesInfo()

    // And then define it
    .then(function(services) {
      app.services = services;
    });

  });

};
