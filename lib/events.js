
'use strict';

module.exports = function(kbox, pantheon) {

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
    var pkg = data.pkg;

    // Only run on Pantheon apps
    if (config.type === 'pantheon') {

      /*
       * Returns the filemount based on the framework
       */
      var getFilemount = function(framework) {
        switch (framework) {
          case 'drupal': return 'sites/default/files';
          case 'drupal8': return 'sites/default/files';
          case 'wordpress': return 'wp-content/uploads';
          case 'backdrop': return 'files';
        }
      };

      // Grab relevant config
      var sharingConfig = config.pluginconfig.sharing || {};
      var pantheonConfig = config.pluginconfig.pantheon;

      // Set the version
      config.version = pkg.version;

      // Connect to pantheon so we can get some info about our site
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

        // Extract some helful data
        var devImages = _.includes(pkg.version, 'dev');
        var sites = pantheon.sites || pSites;
        var uuid = _.findKey(sites, function(site) {
          return site.information.name === pantheonConfig.site;
        });
        var site = sites[uuid].information;

        // Set pantheon config
        pantheonConfig.framework = pantheonConfig.framework || site.framework;
        // jshint camelcase:false
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        pantheonConfig.php = site.php_version || 53;
        pantheonConfig.upstream = site.upstream;
        pantheonConfig.uuid = uuid;
        pantheonConfig.images = (devImages) ? 'dev' : 'v' + pkg.version;

        // Remove unneeded default settings
        delete pantheonConfig.password;
        delete pantheonConfig.nofiles;
        delete pantheonConfig.nodb;

        // Get the filemount from the framework and add it to our list of ignores
        // NOTE: on Pantheon apps the filemount should be a symlink ie "Name"
        // not "Path"
        var filemount = getFilemount(pantheonConfig.framework);
        var ignores = sharingConfig.ignore || [];
        ignores.push('Name ' + filemount);
        sharingConfig.ignore = ignores;

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
        config.pluginconfig.sharing = sharingConfig;
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
