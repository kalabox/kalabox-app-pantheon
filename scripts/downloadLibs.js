/**
 * Download vendor deps
 */

'use strict';

// Intrinsic mods
var path = require('path');
var https   = require('https');

// Npm mods
var _ = require('lodash');
var fs = require('fs-extra');

// Pkg.json
var pkgJson = require('./../package.json');

// Files we need and the projects from whence they came.
// @todo: check whether this actually is set?
var assets = pkgJson.postInstallAssets;

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
    callback('master');
  }
  // If not we need to do some exploration on the github API
  else {
    // Request opts to find the github tags for a project
    var options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/repos/kalabox/' + project + '/tags',
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

/*
 * Get the minor version for a kalabox github project based on the
 * minor version of this project
 */
var writeInternetFile = function(project, location, callback) {

  // Get version we are going to use before we start
  getProjectVersion(project, function(version) {

    // This protects against the use case where you aren't in dev mode
    // but you also have no published packages for the minor version
    if (version === undefined) {
      callback(false);
    }
    else {
      // this should be the github path
      var urlPath = path.join('kalabox', project, version, location);

      // Request opts for RAW github content
      var options = {
        hostname: 'raw.githubusercontent.com',
        port: 443,
        path: '/' + urlPath,
        method: 'GET',
        headers: {'User-Agent': 'Kalabox'}
      };

      // Create our vendor dirs if needed
      var filePath = path.join('vendor', project, path.dirname(location));
      fs.mkdirsSync(filePath);

      // Construct the file object
      var fileName = path.basename(location);
      var file = fs.createWriteStream(path.join(filePath, fileName));

      // Make the request and write the stream to file
      var req = https.request(options, function(res) {

        // Wrtie stream to disk
        res.on('data', function(d) {
          file.write(d);
        });

        // Return some stuff
        res.on('end', function() {
          callback(urlPath, filePath);
        });

      });

      // Fin
      req.end();

      // Errors
      req.on('error', function(err) {
        console.error(err);
      });
    }
  });

};

// Downlaod our files and put them in their place
_.forEach(assets, function(files, project) {
  _.forEach(files, function(file, purpose) {

    var options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/repos/kalabox/' + project + '/tags',
      method: 'GET',
      json: true,
      headers: {'User-Agent': 'Kalabox'}
    };

    writeInternetFile(project, file, function(url, loc) {
      var msg;
      if (url === false) {
        msg = 'No latest package for this version. Try running in devMode';
      }
      else {
        msg = 'Grabbed a file from ' + url + ' doth put it hither: ' + loc;
      }
      console.log(msg);
    });

  });
});
