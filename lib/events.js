
'use strict';

module.exports = function(kbox, pantheon) {

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var events = kbox.core.events;

  // Events
  // pre-create-instantiate
  // Add some other important things to our kalabox.json before
  // creating it
  events.on('pre-create-instantiate', function(kalaboxJson, done) {

    /*
     * If site does not have a php version set then grab the default one
     */
    var getPhpVersion = function(site) {

      // If our site info has a php version
      if (site.php_version && site.php_version === '55') {
        return site.php_version === '55' ? '5.5.24' : '5.3.29';
      }

      // If not we grab the default for hte framwork
      var framework = site.framework;
      var needs55 = framework === 'drupal8' || framework === 'wordpress';
      return needs55 ? '5.5.24' : '5.3.29';
    };

    // @todo: if someone passes in options instead of doing interactive mode
    // this is not going to work yet. need to make calls to get
    //  * site
    //  * framework
    //  * php
    //  * upstream
    //  * environment
    // Grab our current pantheon config
    var pantheonConfig = kalaboxJson.pluginConf['kalabox-plugin-pantheon'];

    // @todo: we need a better way than this to have this hook called
    // only for pantheon apps
    if (pantheonConfig) {

      // Get cached site info
      var site = pantheon.sites[pantheonConfig.uuid].information;

      // Set various kbox.json properties
      pantheonConfig.framework = pantheonConfig.framework || site.framework;
      pantheonConfig.php = getPhpVersion(site);
      pantheonConfig.upstream = site.upstream;
      pantheonConfig.site = site.name;
      var drushversion = pantheonConfig.framework === 'drupal8' ? '8' : '6';
      pantheonConfig['drush-version'] = drushversion;

      // Might be insecure to have this info around?
      delete pantheonConfig.uuid;

      // Rebuild json
      kalaboxJson.pluginConf['kalabox-plugin-pantheon'] = pantheonConfig;
    }

    // Go home Sam
    done();
  });

};
