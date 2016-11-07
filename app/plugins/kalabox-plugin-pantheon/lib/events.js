
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
   * Add pull/push to the app object.
   */
  app.events.on('post-app-load', function(app) {
    app.pull = require('./pull.js')(kbox, app).pull;
    app.push = require('./push.js')(kbox, app).push;
  });

  /*
   * Build the site after post-create happens
   */
  app.events.on('post-create', function(done) {

    // Get our pull stuff and app config
    var puller = require('./pull.js')(kbox, app);
    var pantheonConf = app.config.pluginconfig.pantheon;

    // We do allow for a few choices on create
    var skipDB = _.get(app.results, 'nodb', false);
    var skipFiles = _.get(app.results, 'nofiles', false);
    var choices = {
      database: (skipDB) ? 'none' : pantheonConf.env,
      files: (skipFiles) ? 'none' : pantheonConf.env,
    };

    // Pull the pantheon site
    return puller.pull(pantheonConf, choices)

    // Finish up
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

  /*
   * Make sure we set up relevant "security" before we start spinning up
   * services.
   */
  app.events.on('pre-start', function() {
    var commands = require('./cmd.js')(kbox, app);
    return commands.ensureKeys();
  });

};
