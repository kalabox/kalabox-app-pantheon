'use strict';

var crypto = require('crypto');
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

module.exports = function(kbox) {

  kbox.whenApp(function(app) {

    // Get kalabox.json stuff
    var userConf;
    if (app.config.pluginConf[PLUGIN_NAME]) {
      userConf = app.config.pluginConf[PLUGIN_NAME];
    }

    // Pressflow database settings
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

    // Construct a hashsalt for Drupal 8
    var drupalHashSalt = crypto
      .createHash('sha256')
      .update(JSON.stringify(pantheonDatabases))
      .digest('hex');

    // Some Defauly settings
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
        redis_client_host: ['redis', app.domain].join('.'),
        redis_client_port: 8160,
        redis_client_password: '',
        file_public_path: 'sites/default/files',
        file_private_path: 'sites/default/files/private',
        file_directory_path: 'site/default/files',
        file_temporary_path: '/tmp',
        file_directory_temp: '/tmp',
        css_gzip_compression: false,
        js_gzip_compression: false,
        page_compression: false
      },
      drupal_hash_salt: drupalHashSalt,
      config_directory_name: 'config'
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
      'BACKDROP_SETTINGS=' + JSON.stringify(settings),
    ];

    // Additional environmental variables for redis
    installEnvs.push('CACHE_HOST=' + settings.conf.redis_client_host);
    installEnvs.push('CACHE_PORT=' + settings.conf.redis_client_port);
    installEnvs.push(
      'CACHE_PASSWORD=' + settings.conf.redis_client_password
    );

    // Additional environmental variables for solr
    installEnvs.push(
      'PANTHEON_INDEX_HOST=' + settings.conf.pantheon_index_host
    );
    installEnvs.push(
      'PANTHEON_INDEX_PORT=' + settings.conf.pantheon_index_port
    );

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

    // pre-engine-create
    kbox.core.events.on('pre-engine-create', function(createOptions, done) {
      if (createOptions.name) {

        // Don't add phpversion to db containers
        var split = createOptions.name.split('_');
        var type = (split[2]) ? split[2] : split[1];

        if (userConf.php) {
          if (type !== 'db') {
            installEnvs.push('PHP_VERSION=' + userConf.php);
          }
        }

        // Inject your default envvars
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
