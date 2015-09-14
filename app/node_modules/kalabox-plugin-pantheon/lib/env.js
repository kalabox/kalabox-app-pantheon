'use strict';

// Intrinsic modules
var crypto = require('crypto');

// NPM modules
var _ = require('lodash');

module.exports = function(kbox) {

  // Constants
  var PLUGIN_NAME = 'kalabox-plugin-pantheon';

  kbox.ifApp(function(app) {

    // Terminus node client
    // for some things it is better to use the node client because we dont have
    // to worry about an error we need to handle killing the whole damn thing
    var Client = require('./client.js');
    var pantheon = new Client(kbox, app);

    // Framework specific stuff
    // @todo: eventually we will grab the php version directly via terminus
    // see https://github.com/pantheon-systems/cli/issues/431
    var frameworkSpec = {
      drupal: {
        php: '5.3.29',
        filemount: 'sites/default/files'
      },
      drupal8: {
        php: '5.5.24',
        filemount: 'sites/default/files'
      },
      wordpress: {
        php: '5.5.24',
        filemount: 'wp-content/uploads'
      },
      backdrop: {
        php: '5.3.29',
        filemount: 'files'
      }
    };

    /*
     * Function to take starting options and add more options to it
     * without adding in dups
     */
    var addPush = function(start, options) {
      if (start.Env) {
        options.forEach(function(env) {
          if (!_.includes(start.Env, env)) {
            start.Env.push(env);
          }
        });
      }
      // Add them all!!!!
      else {
        start.Env = options;
      }

      return start;

    };

    /*
     * Function to take starting options and add more options to it
     * without adding in dups
     */
    var getGitInfo = function() {

      var session = pantheon.getSession();
      if (session && session.email && session.name) {
        return {
          email: session.email,
          name: session.name
        };
      }

    };

    /*
     * Factory fucntion to construct our environment based on framework
     */
    var getInstallSpec = function(framework) {

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
            host: app.domain,
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
          pantheon_index_host: ['solr', app.domain].join('.'),
          pantheon_index_port: 449,
          redis_client_host: ['redis', app.domain].join('.'),
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
      var installEnv = [
        'FRAMEWORK=' + framework,
        'DOCROOT=/',
        'FILEMOUNT=' + frameworkSpec[framework].filemount,
        'DRUPAL_HASH_SALT=' + settings.drupal_hash_salt,
        'DB_HOST=' + app.domain,
        'DB_PORT=3306',
        'DB_USER=pantheon',
        'DB_PASSWORD=',
        'DB_NAME=pantheon',
        'PANTHEON_ACCOUNT=' + app.config.pluginConf[PLUGIN_NAME].account,
        'PANTHEON_SITE=UUID',
        'PANTHEON_SITE_NAME=' + app.name,
        'PANTHEON_ENVIRONMENT=kalabox',
        'PANTHEON_INFRASTRUCTURE_ENVIRONMENT=kalabox',
        'PRESSFLOW_SETTINGS=' + JSON.stringify(settings),
        'CACHE_HOST=' + settings.conf.redis_client_host,
        'CACHE_PORT=' + settings.conf.redis_client_port,
        'CACHE_PASSWORD=' + settings.conf.redis_client_password,
        'PANTHEON_INDEX_HOST=' + settings.conf.pantheon_index_host,
        'PANTHEON_INDEX_PORT=' + settings.conf.pantheon_index_port
      ];

      // We also need to inject backdrop settings if appropriate
      if (framework === 'backdrop') {
        installEnv.push('BACKDROP_SETTINGS=' + JSON.stringify(settings));
      }

      // We also need to inject wp settings if appropriate
      if (framework === 'wordpress') {
        var wpSalt = [
          'AUTH_KEY=' + drupalHashSalt,
          'SECURE_AUTH_KEY=' + getHash(app.name),
          'LOGGED_IN_KEY=' + getHash(app.domain),
          'AUTH_SALT=' + getHash(app.name + app.domain),
          'SECURE_AUTH_SALT=' + getHash(app.domain + app.name),
          'LOGGED_IN_SALT=' + getHash(app.name + app.name),
          'NONCE_SALT=' + getHash(app.domain + app.domain),
        ];

        installEnv = installEnv.concat(wpSalt);
      }

      return installEnv;

    };

    // Grab framework from kalabox.json
    var framework = app.config.pluginConf[PLUGIN_NAME].framework;

    // Get our environments based on the framework
    var installEnv = getInstallSpec(framework);

    // EVENTS
    /*
     * Inject every app component with the install environment
     */
    kbox.core.events.on('pre-install-component', function(component, done) {

      // Set our install options
      component.installOptions = addPush(component.installOptions, installEnv);
      done();

    });

    /*
     * Add in the bind mount to the shared cert directory
     */
    kbox.core.events.on('pre-start-component', function(component, done) {

      // Cert bind
      var certs =  '/certs:/srv/certs:rw';
      component.opts.Binds = addPush(component.opts.Binds, certs);
      done();

    });

    /*
     * Inject ENV and PHP version to named non-app containers as well
     */
    kbox.core.events.on('pre-engine-create', function(createOptions, done) {

      var name = createOptions.name;

      // Only do this on named containers
      if (name) {

        // Don't add phpversion to db containers
        var split = createOptions.name.split('_');
        var type = (split[2]) ? split[2] : split[1];

        // @todo: once https://github.com/pantheon-systems/cli/issues/431
        // happens we want to change this back to userConf
        if (type !== 'db') {
          var phpVar = 'PHP_VERSION=' + frameworkSpec[framework].php;
          if (!_.includes(installEnv, phpVar)) {
            installEnv.push(phpVar);
          }
        }

        // Inject your default envvars
        createOptions = addPush(createOptions, installEnv);

      }

      // All containers need the correct SSH path
      var sshEnvVar = ['SSH_KEY=pantheon.kalabox.id_rsa'];
      createOptions = addPush(createOptions, sshEnvVar);

      // All containers need the correct git user/email info
      // but only do this if we have a session to use
      var gitInfo = getGitInfo();
      var gitEnvVar = ['GITUSER=' + gitInfo.name, 'GITEMAIL=' + gitInfo.email];
      createOptions = addPush(createOptions, gitEnvVar);

      // All containers need the correct pantheon User
      var pantheonAccount = app.config.pluginConf[PLUGIN_NAME].account;
      var pantheonUser = ['PANTHEON_ACCOUNT=' + pantheonAccount];
      createOptions = addPush(createOptions, pantheonUser);

      // Make sure we have SSH keys
      // @todo: we are assuming our temp containers are the only ones that
      // need our pantheon ssh keys which may not be a good assumption
      // @todo: this IS a bad assumption the git container gets name undefined
      // we should change this or rework something
      if (name === undefined || _.includes(name, 'kalabox_temp')) {

        // @todo: two file reads and a request might not be great for perfomance
        // here even with static caching
        return pantheon.sshKeySetup()

        .then(function(keySet) {
          if (!keySet) {
            // @todo: something helpful
          }
        })

        .nodeify(done);

      }
      else {

        done();

      }

    });

    /*
     * Updates kalabox aliases when app is started and symlinks some things
     */
    kbox.core.events.on('post-start-component', function(component, done) {

      // Image name
      var image = 'kalabox/debian:stable';

      // Build create options
      var createOpts = {};

      // Build start options
      var startOpts = kbox.util.docker.StartOpts()
        .bind(app.rootBind, '/src')
        .volumeFrom(component.dataContainerName)
        .json();

      // Only run on the db container
      // This allows for both kbox drush to be used
      // and local drush to be used via: drush @<appname> status
      if (component.name === 'db') {

        kbox.engine.inspect(component.containerId)
        .then(function(data) {
          var key = '3306/tcp';
          if (data && data.NetworkSettings.Ports[key]) {
            var port = data.NetworkSettings.Ports[key][0].HostPort;
            var cmd = [
              'sed',
              '-i',
              's/\'host\'.*/\'host\' => \'' + app.domain + '\',/g',
              '/src/config/drush/aliases.drushrc.php'
            ];

            return kbox.engine.run(image, cmd, createOpts, startOpts);
          }
        })

        .nodeify(done);

      }

      // Only run on the appserver container
      // Symlinks
      else if (component.name === 'appserver') {

        // Symlink the filemount to /media
        var fileMount = frameworkSpec[framework].filemount;
        var cmd = ['ln', '-nsf', '/media', '/code/' + fileMount];
        return kbox.engine.queryData(component.containerId, cmd)

        // Emulate /srv/bindings
        .then(function() {
          var cmd = ['mkdir', '-p', '/srv/bindings'];
          return kbox.engine.queryData(component.containerId, cmd);
        })
        .then(function() {
          var cmd = ['ln', '-nsf', '/', '/srv/bindings/kalabox'];
          return kbox.engine.queryData(component.containerId, cmd);
        })

        .nodeify(done);

      }

      // Just finish
      else {
        done();
      }

    });

  });

};
