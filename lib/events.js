
'use strict';

module.exports = function(kbox, pantheon) {

  // node modules
  var format = require('util').format;

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var Promise = kbox.Promise;
  var log = kbox.core.log.make('PANTHEON CREATE EVENTS');

  /*
   * Add some other important Pantheon specigic things to our apps kalabox.yml before
   * creating it
   */
  kbox.core.events.on('pre-create-configure', function(data) {

    // Grab the config from the data
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

      // Connect to pantheon so we can get some info about our site
      var session;
      return Promise.try(function() {
        return pantheon.auth(results.token);
      })

      // Get site info
      .then(function(s) {
        session = s;
        return pantheon.getSites(session);
      })

      // Update our config with relevant info
      .then(function(sites) {

        // Extract some helful data
        var devImages = _.includes(pkg.version, 'dev');
        var uuid = _.findKey(sites, function(site) {
          return site.information.name === pantheonConfig.site;
        });
        var site = sites[uuid].information;

        // Set pantheon config
        pantheonConfig.framework = pantheonConfig.framework || site.framework;
        pantheonConfig.php = site.php_version || 53;
        pantheonConfig.upstream = site.upstream;
        pantheonConfig.uuid = uuid;
        pantheonConfig.images = (devImages) ? 'dev' : 'v' + pkg.version;

        // Remove unneeded default settings ESPECIALL THE TOKEN!!!
        delete pantheonConfig.token;
        delete pantheonConfig.nofiles;
        delete pantheonConfig.nodb;

        // Get the filemount from the framework and add it to our list of ignores
        // NOTE: on Pantheon apps the filemount should be a symlink ie "Name"
        // not "Path"
        var filemount = getFilemount(pantheonConfig.framework);
        var ignores = sharingConfig.ignore || [];
        ignores.push('Name ' + filemount);
        sharingConfig.ignore = ignores;

        // Get the users profile
        return pantheon.getUser(session);
      })

      .then(function(user) {

        // Set the config for email and name
        pantheonConfig.name = user.profile.full_name;
        pantheonConfig.email = user.email;

        // Reset our config objects
        config.pluginconfig.pantheon = pantheonConfig;
        config.pluginconfig.sharing = sharingConfig;
        config.version = pkg.version;

        // Log the action
        log.info('Pantheon kalabox.yml configured');
        log.debug(format('Added Pantheon config: %j', pantheonConfig));
        log.debug(format('Added sharing config: %j', sharingConfig));

      });

    }

  });

  /*
   * Make sure our pantheon SSH keys are set up
   */
  kbox.core.events.on('post-create-configure', function(data) {
    if (data.config.type === 'pantheon') {
      var email = data.config.pluginconfig.pantheon.email;
      return pantheon.sshKeySetup(pantheon.getToken(email));
    }
  });

};
