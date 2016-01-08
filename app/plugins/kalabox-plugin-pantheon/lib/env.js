'use strict';

module.exports = function(kbox) {

  // Node
  var crypto = require('crypto');
  var path = require('path');

  // Constants
  var confPath = path.resolve(__dirname, '..', '..', '..', 'kalabox.yml');

  kbox.ifApp(function(app) {

    /*
     * Load our app config
     */
    var getConfig = function() {
      return kbox.util.yaml.toJson(confPath).pluginconfig.pantheon;
    };

    /*
     * Factory fucntion to construct our environment based on framework
     */
    var getEnv = function(framework) {

      // Framework specific stuff
      var frameworkSpec = {
        drupal: {
          filemount: 'sites/default/files'
        },
        drupal8: {
          filemount: 'sites/default/files'
        },
        wordpress: {
          filemount: 'wp-content/uploads'
        },
        backdrop: {
          filemount: 'files'
        }
      };

      // Pressflow database settings
      // Right now pantheon adds in drupal framework pressflow settings for
      // all frameworks
      // @todo: eventually this might change?
      var pantheonDatabases = {
        default: {
          default: {
            driver: 'mysql',
            prefix: '',
            database: 'pantheon',
            username: 'pantheon',
            password: '',
            host: 'database',
            port: 3306
          }
        }
      };

      var getHash = function(u) {
        return crypto.createHash('sha256').update(u).digest('hex');
      };

      // Construct a hashsalt for Drupal 8
      var drupalHashSalt = getHash(JSON.stringify(pantheonDatabases));

      // Some Default settings
      var settings = {
        databases: pantheonDatabases,
        conf: {
          pressflow_smart_start: true,
          pantheon_binding: 'kalabox',
          pantheon_site_uuid: 'kalabox',
          pantheon_environment: 'kalabox',
          pantheon_tier: 'kalabox',
          pantheon_index_host: 'solr',
          pantheon_index_port: 449,
          redis_client_host: 'redis',
          redis_client_port: 8161,
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
      var env = {
        framework: framework,
        docroot: '/',
        filemount: frameworkSpec[framework].filemount,
        drupalHashSalt: settings.drupal_hash_salt,
        dbHost: 'database',
        dbPort: 3306,
        dbUser: 'pantheon',
        dbPassword: '',
        dbName: 'pantheon',
        pantheonAccount: getConfig().account,
        pantheonSite: 'UUID',
        pantheonSiteName: app.name,
        pantheonEnvironment: 'kalabox',
        pantheonInfrastructureEnvironment: 'kalabox',
        pressflowSettings: JSON.stringify(settings),
        cacheHost: settings.conf.redis_client_host,
        cachePort: settings.conf.redis_client_port,
        cachePassword: settings.conf.redis_client_password,
        pantheonIndexHost: settings.conf.pantheon_index_host,
        pantheonIndexPort: settings.conf.pantheon_index_port,
        backdropSettings: JSON.stringify(settings),
        authKey: drupalHashSalt,
        secureAuthKey: getHash(app.name),
        loggedInKey: getHash(app.domain),
        authSalt: getHash(app.domain + framework),
        secureAuthSalt: getHash(app.name + app.domain),
        loggedInSalt: getHash(app.name + app.name),
        nonceSalt: getHash(app.domain + app.domain)
      };

      return env;

    };

    // Get the framework
    var framework = getConfig().framework;

    // Set some fun ENV action
    kbox.core.env.setEnvFromObj(getEnv(framework), 'app_pantheon');

  });

};
