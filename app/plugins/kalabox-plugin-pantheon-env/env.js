'use strict';

var crypto = require('crypto');
var PLUGIN_NAME = 'kalabox-plugin-pantheon-env';

module.exports = function(kbox) {

  kbox.whenApp(function(app) {
    // Set the default pantheon database infos
    var pantheonDatabases = {
      default: {
        default: {
          driver: 'mysql',
          prefix: '',
          database: 'pantheon',
          username: 'pantheon',
          password: '',
          host: app.domain,
          port: 3306
        }
      }
    };

    // Construct a hashsalt
    var drupalHashSalt = crypto
      .createHash('sha256')
      .update(JSON.stringify(pantheonDatabases))
      .digest('hex');

    // Here are our default settings
    var settings = {
      databases: pantheonDatabases,
      conf: {
        pressflow_smart_start: true,
        pantheon_binding: null,
        pantheon_site_uuid: null,
        pantheon_environment: 'kalabox',
        pantheon_tier: 'kalabox',
        pantheon_index_host: ['solr', app.domain].join('.'),
        pantheon_index_port: 449,
        redis_client_host: null,
        redis_client_port: null,
        redis_client_password: null,
        file_public_path: 'sites/default/files',
        file_private_path: 'sites/default/files/private',
        file_directory_path: 'site/default/files',
        file_temporary_path: '/tmp',
        file_directory_temp: '/tmp',
        css_gzip_compression: false,
        js_gzip_compression: false,
        page_compression: false
      },
      drupal_hash_salt: drupalHashSalt
    };

    // Default environmental variables
    var installEnvs = [
      'FRAMEWORK=drupal',
      'DOCROOT=/',
      'FILEMOUNT=sites/default/files',
      'DRUPAL_HASH_SALT=' + settings.drupal_hash_salt,
      'DB_HOST=' + app.domain,
      'DB_PORT=3306',
      'DB_USER=pantheon',
      'DB_PASSWORD=',
      'DB_NAME=pantheon',
      'PANTHEON_SITE=UUID',
      'PANTHEON_SITE_NAME=' + app.name,
      'PANTHEON_ENVIRONMENT=kalabox',
      'PANTHEON_INFRASTRUCTURE_ENVIRONMENT=kalabox',
      'PRESSFLOW_SETTINGS=' + JSON.stringify(settings),
      'BACKDROP_SETTINGS=' + JSON.stringify(settings)
    ];

    // Events
    // pre-install
    kbox.core.events.on('pre-install-component', function(component, done) {
      if (component.installOptions.Env) {
        installEnvs.forEach(function(env) {
          component.installOptions.Env.push(env);
        });
      }
      else {
        component.installOptions.Env = installEnvs;
      }
      done();
    });

    // EVENT: pre-engine-create
    kbox.core.events.on('pre-engine-create', function(createOptions, done) {
      if (!createOptions.name) {
        if (createOptions.Env) {
          installEnvs.forEach(function(env) {
            createOptions.Env.push(env);
          });
        }
        else {
          createOptions.Env = installEnvs;
        }
      }
      done();
    });

  });

};
