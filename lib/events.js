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
    // Grab our current pantheon config
    var pantheonConfig = kalaboxJson.pluginConf['kalabox-plugin-pantheon'];

    // Add some UUID stuff if we are pulling
    if (pantheonConfig.action === 'pull') {
      var site = pantheon.sites[pantheonConfig.uuid].information;
      pantheonConfig.framework = site.framework;
      pantheonConfig.upstream = site.upstream;
      delete pantheonConfig.product;
    }

    // Or product stuff if we are creating from start state
    if (pantheonConfig.action === 'create') {
      var product = pantheon.products[pantheonConfig.product].attributes;
      pantheonConfig.framework = product.framework;
      pantheonConfig.upstream = product.upstream;
      delete pantheonConfig.uuid;
    }

    // Rebuild json
    kalaboxJson.pluginConf['kalabox-plugin-pantheon'] = pantheonConfig;

    // Go home Sam
    done();
  });

};
