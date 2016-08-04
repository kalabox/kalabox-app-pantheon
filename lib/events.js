
'use strict';

module.exports = function(kbox, pantheon) {

  // node modules
  var format = require('util').format;

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var log = kbox.core.log.make('PANTHEON CREATE EVENTS');

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

      // Grab relevant config
      var sharingConfig = config.pluginconfig.sharing || {};
      var pantheonConfig = config.pluginconfig.pantheon;

      // Connect to pantheon so we can get some info about our site
      return Promise.all([
        pantheon.getSites(results.token),
        pantheon.getEnvs(results.token, results.site)
      ])

      // Update our config with relevant info
      .then(function(info) {

        // Extract some helful data
        var devImages = _.includes(pkg.version, 'dev');
        var site = _.find(info[0], function(site) {
          return site.name === pantheonConfig.site;
        });
        var env = _.find(info[1], function(env) {
          return env.name === pantheonConfig.env;
        });

        // Build the basic config out
        pantheonConfig.uuid = site.uuid;
        pantheonConfig.framework = site.framework;
        pantheonConfig.upstream = site.upstream;
        pantheonConfig.images = (devImages) ? 'dev' : 'v' + pkg.version;
        pantheonConfig.php = env.php || site.php || 53;

        // Downgrade the php version to 55 if it is 56/70 until we have resolution on
        // https://github.com/kalabox/kalabox/issues/1438
        if (pantheonConfig.php === 56 || pantheonConfig.php === 70) {
          pantheonConfig.php = 55;
        }

        // Remove unneeded default settings ESPECIALLY THE TOKEN!!!
        delete pantheonConfig.token;
        delete pantheonConfig.nofiles;
        delete pantheonConfig.nodb;

        // Get the users profile
        return pantheon.getUser(results.token);

      })

      // Set the name and email
      .then(function(user) {
        pantheonConfig.name = user.profile.full_name;
        pantheonConfig.email = user.email;
      })

      // Reset all our config
      .then(function() {

        // Get the filemount from the framework and add it to our list of ignores
        // NOTE: on Pantheon apps the filemount should be a symlink ie "Name" not "Path"
        var ignores = sharingConfig.ignore || [];
        ignores.push('Name ' + getFilemount(pantheonConfig.framework));
        sharingConfig.ignore = ignores;

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

};
