
'use strict';

module.exports = function(kbox, pantheon) {

  // Node modules
  var path = require('path');

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var Promise = kbox.Promise;

  /*
   * Add some other important things to our kalabox.yml before
   * creating it
   */
  kbox.core.events.on('pre-create-configure', function(data) {

    // Grab the config from teh data
    var config = data.config;
    var results = data.results;

    // Only run on Pantheon apps
    if (config.type === 'pantheon') {

      // Grab the current config
      var pantheonConfig = config.pluginconfig.pantheon;

      // Set the image version
      // Get relevant config options
      var prod = require(path.join(__dirname, 'config.json'));
      var locked = kbox.core.deps.get('globalConfig').locked;

      // Expose the correct pantheon img version
      pantheonConfig.images = (!locked) ? 'dev' : 'v' + prod.url.version;

      // Set a version
      config.version = (!locked) ? prod.url.dev : prod.url.version;

      // Make sure we have a session otherwise auth
      // NOTE: the only reason we wouldn't have a session
      return Promise.try(function() {
        if (!pantheon.getSession() && results.email && results.password) {
          return pantheon.auth(results.email, results.password);
        }
      })

      // Get site info
      .then(function() {
        return pantheon.getSites();
      })

      // Update our config with relevant info
      .then(function(pSites) {

        // Get cached site info
        var sites = pantheon.sites || pSites;
        // Get the UUID
        var uuid = _.findKey(sites, function(site) {
          return site.information.name === pantheonConfig.site;
        });
        var site = sites[uuid].information;

        // Set various kbox.yml properties
        pantheonConfig.framework = pantheonConfig.framework || site.framework;
        // jshint camelcase:false
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        pantheonConfig.php = site.php_version || 53;
        pantheonConfig.upstream = site.upstream;
        pantheonConfig.uuid = uuid;

        // Remove password
        delete pantheonConfig.password;

        // Get the user profile
        var data = pantheon.__getAuthHeaders(pantheon.session);
        return pantheon.getProfile(pantheon.session.user_id, data);

      })

      .then(function(profile) {
        // jshint camelcase:false
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        pantheonConfig.name = profile.full_name;
        // Rebuild json
        config.pluginconfig.pantheon = pantheonConfig;
      });

    }

  });

  /*
   * Make sure our pantheon SSH keys are set up
   */
  kbox.core.events.on('post-create-configure', function(data) {

    // Grab the config from teh data
    var config = data.config;

    if (config.type === 'pantheon') {

      // Set the correct session
      // @todo: it feels weird to have to do this again
      var account = config.pluginconfig.pantheon.email;
      pantheon.setSession(account, pantheon.getSessionFile(account));

      // Make sure we have SSH keys that can communciate with pantheon
      return pantheon.sshKeySetup();

    }

  });

};
