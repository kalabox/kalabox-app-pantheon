'use strict';

module.exports = function(kbox) {

  /*
   * Add our pantheon settings to the ENV
   */
  kbox.whenAppRegistered(function(app) {
    var identifier = 'app_pantheon_config';
    kbox.core.env.setEnvFromObj(app.config.pluginconfig.pantheon, identifier);
  });
};
