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
     * Pull down our sites code
     */
    var pullCode = function(site, env, type) {

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
                pullCode(site, env);
              });
          }
        })
        // Grab the sites UUID from teh machinename
        .then(function() {
          return terminus.getUUID(site)
          .then(function(uuid) {
            siteid = uuid.trim();
          });
        })
        // Wake the site
        .then(function() {
          return terminus.wakeSite(site, env);
        })
        // Generate our code repo URL and CUT THAT MEAT!
        // errr PULL THAT CODE!
        .then(function() {
          // @todo: better way to generate this?
          // @todo: is 'dev' the only thing that
          var build = {
            protocol: 'ssh',
            slashes: true,
            auth: ['codeserver', 'dev', siteid].join('.'),
            hostname: ['codeserver', 'dev', siteid, 'drush', 'in'].join('.'),
            port: 2222,
            pathname: ['~', 'repository.git'].join('/')
          };
          repo = url.format(build);
          if (type === 'clone') {
            return git.cmd(['clone', repo, './'], [])
              .then(function() {
                if (env !== 'dev') {
                  return git.cmd(['fetch', 'origin'], []);
                }
              })
              .then(function() {
                if (env !== 'dev') {
                  return git.cmd(['checkout', env], []);
                }
              });
          }
          else {
            var branch = (env === 'dev') ? 'master' : env;
            return git.cmd(['pull', 'origin', branch], []);
          }
        });
    };

    /*
     * Pull down our sites database
     */
    var pullDB = function(site, env) {
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

      return engine.isRunning(dbID)
        .then(function(status) {
          wasRunning = status;
          if (!wasRunning) {
            return engine.start(dbID, defaults);
          }
        })
        .then(function() {
          return terminus.getUUID(site);
        })
        .then(function(uuid) {
          return terminus.hasDBBackup(uuid.trim(), env);
        })
        .then(function(hasBackup) {
          // @todo: might want to always create a new backup?
          // @todo: maybe if latest backup is old?
          if (!hasBackup) {
            return terminus.createDBBackup(site, env);
          }
        })
        .then(function() {
          return terminus.downloadDBBackup(site, env);
        })
        .then(function(data) {
          var downloadSplit = data.split('Downloaded');
          var dbFile = downloadSplit[1].trim();
          // Perform a container run.
          var payload = ['import-mysql', 'localhost', null, '3306', dbFile];
          return engine.queryData(dbID, payload);
        })
        .then(function(data) {
          // @todo: use real logger
          console.log(data);
        })
        // Stop the DB
        .then(function() {
          if (!wasRunning) {
            return engine.stop(dbID);
          }
        });
    };

    /*
     * Pull down our sites database
     */
    var pullFiles = function(site, env) {
      // the pantheon site UUID
      var siteid = null;
      // Get our UUID
      // @todo: cache this
      return terminus.getUUID(site)
        .then(function(uuid) {
          siteid = uuid.trim();
        })
        // Generate our code repo URL and CUT THAT MEAT!
        // errr PULL THAT CODE!
        .then(function() {
          // @todo: lots of cleanup here
          // /kbox rsync -rlvz --size-only --ipv4 --progress -e 'ssh -p 2222'
          var envSite = [env, siteid].join('.');
          var fileBox = envSite + '@appserver.' + envSite + '.drush.in:files/';
          var fileMount = '/media';
          var opts = '-rlvz --size-only --ipv4 --progress -e \'ssh -p 2222\'';

          return rsync.cmd([opts, fileBox, fileMount], true);
        });
    };

    // Events
    // Install the terminus container for our things and also
    // pull down a site or create a new site
    events.on('post-install', function(app, done) {
      // Make sure we install the terminus container for this app
      var opts = {
        name: 'terminus',
        srcRoot: path.resolve(__dirname, '..', '..', '..'),
      };
      // Our pantheon config for later on
      var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];
      // @todo: fs.existsSync is not recommended and pending deprecation
      var firstTime = !fs.existsSync(app.config.codeRoot);
      // Install the terminus container and then do install things if
      // this is the first time
      return engine.build(opts)
        .then(function() {
          return terminus.getSiteAliases();
        })
        .then(function() {
          if (firstTime) {
            return pullCode(pantheonConf.site, pantheonConf.env, 'clone');
          }
        })
        .then(function() {
          if (firstTime && pantheonConf.action === 'pull') {
            return pullDB(pantheonConf.site, pantheonConf.env);
          }
        })
        .then(function() {
          if (firstTime && pantheonConf.action === 'pull') {
            return pullFiles(pantheonConf.site, pantheonConf.env);
          }
        })
        .nodeify(done);
    });

    // kbox appname pull COMMAND
    kbox.tasks.add(function(task) {

      var pantheonConf = app.config.pluginConf['kalabox-plugin-pantheon'];
      // @todo: notions of this for start states?
      // no files/db options, just a git pull?
      task.path = [app.name, 'pull'];
      task.category = 'appAction';
      task.description = 'Pull down new code and optionally data and files.';
      task.kind = 'delegate';

      // Only want these options for pull sites
      if (pantheonConf.action === 'pull') {
        task.options.push({
          name: 'database',
          kind: 'boolean',
          description: 'Import latest database backup.'
        });
        task.options.push({
          name: 'files',
          kind: 'boolean',
          description: 'Import latest files.'
        });
      }

      task.func = function(done) {

        // Grab the CLI options that are available
        var options = this.options;
        var questions = [
          {
            type: 'confirm',
            name: 'database',
            message: 'Also refresh from latest database backup?',
          },
          {
            type: 'confirm',
            name: 'files',
            message: 'Also grab latest files?',
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
            return pullCode(pantheonConf.site, pantheonConf.env, 'pull');
          })
          .then(function() {
            if (choices.database) {
              return pullDB(pantheonConf.site, pantheonConf.env);
            }
          })
          .then(function() {
            if (choices.files) {
              return pullFiles(pantheonConf.site, pantheonConf.env);
            }
          })
          .nodeify(done);
        });

      };
    });
  });
};
