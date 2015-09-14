'use strict';

// Intrinsic modules.
var url = require('url');
var fs = require('fs');
var path = require('path');

// NPM modules
var Promise = require('bluebird');
var _ = require('lodash');

// "Constants"
var PLUGIN_NAME = 'kalabox-plugin-pantheon';

module.exports = function(kbox) {

  var Promise = kbox.Promise;
  Promise.longStackTraces();

  kbox.ifApp(function(app) {

    // Grab the terminus client
    var Terminus = require('./terminus.js');
    var terminus = new Terminus(kbox, app);

    // Grab delegated helpers
    var pathToRoot = path.resolve(__dirname, '..', '..', '..');
    var pathToNode = path.join(pathToRoot, 'node_modules');
    var Git = require(pathToNode + '/kalabox-plugin-git/lib/git.js');
    var git = new Git(kbox, app);
    var Rsync = require(pathToNode + '/kalabox-plugin-rsync/lib/rsync.js');
    var rsync = new Rsync(kbox, app);

    // Grab some kalabox modules
    var events = kbox.core.events;
    var engine = kbox.engine;

    // Nobody expects the Spanish Inquisition!
    var inquirer = require('inquirer');

    /*
     * Push up our sites code
     */
    var pushCode = function(site, env, message) {

      // the pantheon site UUID
      var siteid = null;
      var repo = null;

      // Check to see what our connection mode is
      return terminus.getConnectionMode(site, env)
        // Set the connection mode to git if needed
        // and then try again
        .then(function(connectionMode) {
          var modeSplit = connectionMode.split(':');
          var mode = modeSplit[1].trim().toLowerCase();
          if (mode !== 'git') {
            // @todo: actually test this part
            return terminus.setConnectionMode(site, env)
              .then(function(data) {
                pushCode(site, env);
              });
          }
        })
        // Wake the site
        .then(function() {
          return terminus.wakeSite(site, env);
        })
        // Generate our code repo URL and CUT THAT MEAT!
        // errr PULL THAT CODE!
        .then(function() {
          return git.cmd(['add', '--all'], [])
            .then(function() {
              return git.cmd(['commit', '--allow-empty', '-m', message], []);
            })
            .then(function() {
              var branch = (env === 'dev') ? 'master' : env;
              return git.cmd(['push', 'origin', branch], []);
            });
        });
    };

    /*
     * Push your local DB up to pantheon
     */
    var pushDB = function(site, env) {
      // Get the cid of this apps database
      // @todo: this looks gross
      var dbID = _.result(_.find(app.components, function(cmp) {
        return cmp.name === 'db';
      }), 'containerId');
      var wasRunning = null;
      var defaults = {
        PublishAllPorts: true,
        Binds: [app.rootBind + ':/src:rw']
      };
      // Start up the DB
      return engine.isRunning(dbID)
        .then(function(status) {
          wasRunning = status;
          if (!wasRunning) {
            return engine.start(dbID, defaults)
            // Wait a bit to get the DB going before we do the next thing
            // @todo: Have a way to check that the DB container is
            // actually ready?
            .delay(5000);
          }
        })
        .then(function() {
          return engine.queryData(dbID, ['dump-mysql']);
        })
        .then(function() {
          return terminus.getUUID(site);
        })
        .then(function(uuid) {
          return terminus.getBindings(uuid);
        })
        .then(function(binds) {
          var box = _.find(binds, function(bind) {
            return (bind.database === 'pantheon' && bind.environment === env);
          });
          var connectionInfo = {
            password: box.password,
            host: ['dbserver', env, box.site, 'drush', 'in'].join('.'),
            port: box.port.toString()
          };
          return Promise.resolve(connectionInfo);
        })
        .then(function(connectionInfo) {
          // Perform a container run.
          var dbFile = '/src/config/terminus/pantheon.sql';
          var payload = [
            'import-mysql',
            connectionInfo.host,
            connectionInfo.password,
            connectionInfo.port,
            dbFile
          ];
          return engine.queryData(dbID, payload);
        })
        .then(function() {
          if (!wasRunning) {
            return engine.stop(dbID);
          }
        });
    };

    /*
     * Pull down our sites database
     */
    var pushFiles = function(site, env) {
      // the pantheon site UUID
      var siteid = null;
      // Get our UUID
      // @todo: cache this
      return terminus.getUUID(site)
        .then(function(uuid) {
          siteid = uuid.trim();
        })
        .then(function() {
          // @todo: lots of cleanup here
          var envSite = [env, siteid].join('.');
          var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
          var fileMount = '/media/* --temp-dir=/tmp/';
          var opts = '-rlvz --size-only --ipv4 --progress -e \'ssh -p 2222\'';

          return rsync.cmd([opts, fileMount, fileBox], true);
        });
    };

    // kbox appname pull COMMAND
    kbox.tasks.add(function(task) {
      // @todo: if you have started from a start state this needs to do something
      // more complicated like import a site into pantheon and then rebuld the site
      // locally

      var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];

      task.path = [app.name, 'push'];
      task.category = 'appAction';
      task.description = 'Push up new code and optionally data and files.';
      task.kind = 'delegate';
      task.options.push({
        name: 'message',
        kind: 'string',
        description: 'Tell us about your change'
      });
      task.options.push({
        name: 'database',
        kind: 'boolean',
        description: 'Push local database up.'
      });
      task.options.push({
        name: 'files',
        kind: 'boolean',
        description: 'Push local files up.'
      });

      task.func = function(done) {

        // Grab the CLI options that are available
        var options = this.options;
        var questions = [
          {
            type: 'input',
            name: 'm',
            message: 'Tell us about these changes.',
            default: 'Best changes ever!'
          },
          {
            type: 'confirm',
            name: 'database',
            message: 'Also push up your local database?',
          },
          {
            type: 'confirm',
            name: 'files',
            message: 'Also push up your local files directory?',
          },
        ];

        // Filter out interactive questions based on passed in options
        questions = _.filter(questions, function(question) {

          var option = options[question.name];

          if (question.filter) {
            options[question.name] = question.filter(options[question.name]);
          }

          if (option === false || option === undefined) {
            return true;
          }

          else {
            return !_.includes(Object.keys(options), question.name);
          }
        });

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {
          var choices = _.merge({}, options, answers);
          return terminus.getSiteAliases()
          .then(function() {
            return pushCode(
              pantheonConf.site,
              pantheonConf.env,
              choices.message
            );
          })
          .then(function() {
            if (choices.database) {
              return pushDB(pantheonConf.site, pantheonConf.env);
            }
          })
          .then(function() {
            if (choices.files) {
              return pushFiles(pantheonConf.site, pantheonConf.env);
            }
          })
          .nodeify(done);
        });

      };
    });
  });
};
