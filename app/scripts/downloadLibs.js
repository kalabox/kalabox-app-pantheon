/**
 * Download vendor deps
 */

'use strict';

// Intrinsic mods
var path = require('path');
var https = require('https');
var url = require('url');

// Npm mods
var _ = require('lodash');
var fs = require('fs-extra');

// Pkg.json
var pkgJson = require('./../package.json');

// Files we need and the projects from whence they came.
// @todo: check whether this actually is set?
var pkgs = pkgJson.postInstallPkgs;

/*
 * Get the minor version of the current project
 */
var getMinorVersion = function() {

  // Should already be loaded but just in case
  if (!pkgJson) {
    pkgJson = require('./../package.json');
  }

  // Split the version and send back the minor part
  var parts = pkgJson.version.split('.');
  return parts[1];

};

/*
 * Simple function to make a github api request
 */
var request = function(options, callback) {

  // Request object
  var req = https.request(options, function(res) {

    // Need a string not a buffer
    res.setEncoding('utf8');

    // Collector
    var responseString = '';

    // Collect the stream
    res.on('data', function(data) {
      responseString += data;
    });

    // Return the JSON parsed stream
    res.on('end', function() {
      callback(JSON.parse(responseString));
    });

  });

  // Handle errors
  req.on('error', function(err) {
    console.error(err);
  });

  // End request
  req.end();

};

/*
 * We can't rely on Kalabox stuff in this file so we need to do this
 * to get the users home dir
 */
var getHomeDir = function() {

  // Check the env for the home path
  var platformIsWindows = process.platform === 'win32';
  var envKey = platformIsWindows ? 'USERPROFILE' : 'HOME';

  // Homeward bound
  return process.env[envKey];

};

/*
 * We can't rely on Kalabox stuff in this file so we need to do this
 * to get dev mod
 */
var getDevMode = function() {

  // Set for usage later
  var devMode;

  // If the environment is a no go try to load from custom kalabox.json
  if (process.env.KALABOX_DEV === undefined) {

    // Construct kbox.json path
    var kboxJsonFile = path.join(getHomeDir(), '.kalabox', 'kalabox.json');

    // Check it kbox json exists
    if (fs.existsSync(kboxJsonFile)) {

      // Load it
      var kboxJson = require(kboxJsonFile);

      // Use its dev mode if its set
      devMode = (kboxJson.devMode) ? kboxJson.devMode : false;

    }
  }

  // Use the envvar if its set
  else {

    // Set it
    devMode = (process.env.KALABOX_DEV) ? process.env.KALABOX_DEV : false;

  }

  // Return something
  return devMode;

};

/*
 * Get the project tag/branch we should be pulling from
 */
var getProjectVersion = function(project, callback) {

  // If we are in dev mode this is trivial
  if (getDevMode() === true || getDevMode() === 'true') {
    callback('v' + ['0', getMinorVersion()].join('.'));
  }
  // If not we need to do some exploration on the github API
  else {
    // Request opts to find the github tags for a project
    var projectParts = project.split('@');
    var options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/repos/kalabox/' + projectParts[0] + '/tags',
      method: 'GET',
      json: true,
      headers: {'User-Agent': 'Kalabox'}
    };

    // Make teh request
    request(options, function(data) {

      // Get the minor version of the current project
      var projectVer = getMinorVersion();

      // Grab the first tag that shares the minor version
      // we assume this lists the most recent tags first
      var minorVersion = _.result(_.find(data, function(release) {
        if (release.name) {
          var minorVersionParts = release.name.split('.');
          return projectVer.toString() === minorVersionParts[1];
        }
        // @todo: What happens if we have no project releases for this version?
      }), 'name');

      callback(minorVersion);

    });
  }

};

/**
 * Returns a string with the url of the dev branch
 * tarball. The package must be on github and have a repository
 * field in its pacakge.json. It must also have a dev branch that is
 * considered the development branch on github.
 */
var getTarball = function(pkg, version) {

  // Build our tarball URL
  // https://github.com/kalabox/kalabox-plugin-dbenv/tarball/master
  var tarUrl = {
    protocol: 'https:',
    host: 'github.com',
    pathname: ['kalabox', pkg, 'tarball', version].join('/')
  };

  // Return the formatted tar URL
  return url.format(tarUrl);

};

/*
 * Replaces the version part of a npm pkg@version string with
 * the master branch tarball from github if that package is a kalabox
 * plugin
 *
 * If you are using your own external app or plugin it needs to live on github
 * and have a master branch or this is not going to work.
 *
 */
var pkgToDev = function(pkg, version) {

  // Split our package so we can reassemble later
  var parts = pkg.split('@');

  // Grab the dev tarball if ths is a kalabox plugin
  if (_.includes(pkg, 'kalabox-')) {

    // Get the tarball location
    var tar = getTarball(parts[0], version);
    return [parts[0], tar].join('@');

  }
  // Otherwise just return what we have
  else {
    return pkg;
  }

};

// Downlaod our files and put them in their place
_.forEach(pkgs, function(pkg) {
  getProjectVersion(pkg, function(version) {

    if (version.charAt(0) === 'v') {
      pkg = pkgToDev(pkg, version);
    }

    var spawn = require('child_process').spawn;
    var npm = spawn('npm', ['install', pkg]);

    npm.stdout.on('data', function(data) {
      console.log('stdout: ' + data);
    });

    npm.stderr.on('data', function(data) {
      console.log('stderr: ' + data);
    });

    npm.on('close', function(code) {
      console.log('child process exited with code ' + code);
    });

  });
});
