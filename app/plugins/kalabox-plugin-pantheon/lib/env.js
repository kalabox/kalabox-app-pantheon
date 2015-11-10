'use strict';

module.exports = function(kbox) {

  // Intrinsic modules
  var crypto = require('crypto');
  var path = require('path');
  var fs = require('fs');

  // NPM modules
  var _ = require('lodash');

  // Constants
  var PLUGIN_NAME = 'kalabox-plugin-pantheon';
  var TERMINUS = 'terminus:t0.9.2';

  kbox.ifApp(function(app) {

    // Terminus node client
    // for some things it is better to use the node client because we dont have
    // to worry about an error we need to handle killing the whole damn thing
    var Client = require('./client.js');
    var pantheon = new Client(kbox, app);

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
     * Basic kalabox.json validation function
     * @todo: this is pretty weak for now
     */
    var validateKalaboxJson = function() {

      // Path to kbox json
      var kjPath = path.join(app.root, 'kalabox.json');

      // Check to see if we even have a kalabox.json
      if (!fs.existsSync(kjPath))  {
        return false;
      }

      // Objectify
      var kj = require(kjPath);
      var pantheonConfig = kj.pluginConf[PLUGIN_NAME];

      // Do a quick scan to make sure our pantheon plugin has all non-empty
      // values
      var isGood = _.reduce(pantheonConfig, function(current, now) {
        return current && !_.isEmpty(now);
      });

      // Looks like we good! WE CNA DO THIS!
      return isGood && true;

    };

    /*
     * Function to take starting options and add more options to it
     * without adding in dups
     */
    var getGitInfo = function() {

      // Use our session if we can
      var session = pantheon.getSession();
      if (session && session.email && session.name) {
        return {
          email: session.email,
          name: session.name
        };
      }
      // If we cant for whatever reason then so this instead
      else {
        return {
          email: app.config.pluginConf[PLUGIN_NAME].account,
          name: app.config.pluginConf[PLUGIN_NAME].account
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

    // Do a basic validation of our install kalabox.json and throw
    // and error with some advice before we continue
    // @todo: better error message
    if (!validateKalaboxJson()) {
      throw new Error('Invalid kalabox.json. Look for missing properties!');
    }

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

      // Only do this on named containers
      if (createOptions.name) {

        // Don't add phpversion to db containers
        var split = createOptions.name.split('_');
        var type = (split[2]) ? split[2] : split[1];

        // Set the PHP version from the config
        if (type !== 'db') {
          var phpVar = 'PHP_VERSION=' + app.config.pluginConf[PLUGIN_NAME].php;
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
      return pantheon.sshKeySetup(createOptions)

      // Stuff
      .then(function(keySet) {
        if (!keySet) {
          // @todo: something helpful
        }
      })

      // Return
      .nodeify(done);

    });

    // Install the terminus container for our things and also
    // pull down a site or create a new site
    kbox.core.events.on('post-install', function(app, done) {
      // Make sure we install the terminus container for this app
      var opts = {
        name: TERMINUS,
        srcRoot: path.resolve(__dirname, '..', '..', '..'),
      };
      // Install the terminus container and then do install things if
      // this is the first time
      return kbox.engine.build(opts)
      .nodeify(done);
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

        // Emulate /srv/bindings
        var cmd = ['mkdir', '-p', '/srv/bindings'];
        return kbox.engine.queryData(component.containerId, cmd)
        // If on drops8 make sure styles dir exists
        .then(function() {
          if (framework === 'drupal8') {
            var cmd = ['mkdir', '-p', '/media/styles'];
            return kbox.engine.queryData(component.containerId, cmd);
          }
        })
        // Emulate /srv/bindings
        .then(function() {
          var cmd = ['ln', '-nsf', '/', '/srv/bindings/kalabox'];
          return kbox.engine.queryData(component.containerId, cmd);
        })
        // Check if symlink dir exists
        .then(function() {
          var fileMount = frameworkSpec[framework].filemount;
          var upOneDir = fileMount.split('/');
          upOneDir.pop();
          var codeDir = app.config.codeDir;
          var dirCheck = '/' + [codeDir, upOneDir.join('/')].join('/');
          var cmd = ['ls', dirCheck];
          return kbox.engine.queryData(component.containerId, cmd);
        })
        // Check if we can create the symlink or not
        .catch(function(error) {
          return !_.contains(error.message, 'Non-zero exit code');
        })
        // Symlink the filemount to /media if appropriate
        .then(function(canCreate) {
          if (canCreate !== false) {
            var fileMount = frameworkSpec[framework].filemount;
            // Check if mount dir exists and set the symlink if it does
            var lnkFile = '/' + [app.config.codeDir, fileMount].join('/');
            var cmd = ['ln', '-nsf', '/media', lnkFile];
            return kbox.engine.queryData(component.containerId, cmd);
          }
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
