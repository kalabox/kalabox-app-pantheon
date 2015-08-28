#!/usr/bin/env node

'use strict';

var _ = require('lodash');

module.exports = function(kbox, pantheon) {

  // Load some boxmods
  var events = kbox.core.events;

  // Events
  // pre-create-instantiate
  // Add some other important things to our kalabox.json before
  // creating it
  events.on('pre-create-instantiate', function(kalaboxJson, done) {

    // @todo: if someone passes in options instead of doing interactive mode
    // this is not going to work yet. need to make calls to get
    //  * site/product id
    //  * framework
    //  * upstream
    //  * environment
    // Grab our current pantheon config
    var pantheonConfig = kalaboxJson.pluginConf['kalabox-plugin-pantheon'];

    // @todo: we need a better way than this to have this hook called
    // only for pantheon apps
    if (pantheonConfig) {
      // Add some UUID stuff if we are pulling
      if (pantheonConfig.action === 'pull') {
        var site = pantheon.sites[pantheonConfig.uuid].information;
        pantheonConfig.framework = site.framework;
        pantheonConfig.upstream = site.upstream;
        pantheonConfig.site = site.name;
        delete pantheonConfig.product;
        // more secure to delete this?
        delete pantheonConfig.uuid;
      }

      // Rebuild json
      kalaboxJson.pluginConf['kalabox-plugin-pantheon'] = pantheonConfig;
    }

    // Go home Sam
    done();
  });

};
