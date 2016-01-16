'use strict';

/**
 * A simple function to check whether we need to reauth or not
 * this is intended to be called before terminus requests and terminus
 * cli actions
 */

module.exports = function(kbox) {

  // Node modules.
  var fs = require('fs-extra');
  var path = require('path');
  var _ = require('lodash');

  // Kalabox mods
  var Promise = kbox.Promise;

  /*
   * Helper function for reading specific file cache.
   */
  var getSessionFile = function(email) {

    // The directory in which our sessions live
    var homeDir = kbox.core.deps.lookup('globalConfig').home;
    var sessionDir = path.join(homeDir, '.kalabox', 'pantheon', 'session');
    var sessionFile = path.join(sessionDir, email);
    var data = fs.readFileSync(sessionFile, 'utf8');
    var session = JSON.parse(data);

    // If file cache was loaded, parse the contents and set the session.
    if (!_.isEmpty(session)) {
      return session;
    } else {
      return undefined;
    }

  };

  /*
   * Make sure our session is still 100% 2legit2quit
   */
  var validateSession = function(session) {

    // Session is false, session is tricksy if it is undefined
    if (session === undefined) {
      return false;
    }

    /*
     * Session is illegitimate if its expired
     *
     * Date.now uses miliseconds, while session_expire_time seems to use
     * seconds, so converting them to match is needed. So here I'm just
     * multiplying session_expire_time by 1000 to be in miliseconds.
     */
    // jshint camelcase:false
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    if (session && Date.now() > (session.session_expire_time * 1000)) {
      return false;
    }
    // jshint camelcase:true
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

    // Session is lookin MIGHTY FINE! MIGHTY FINE INDEED!
    return true;

  };

  /*
   * Returns the session if it exists and is valid
   */
  var getSession = function(email) {

    // Get session from file
    var session = getSessionFile(email);

    // If we have a valid session we return it
    if (validateSession(session)) {
      return session;
    }

    // Otherwise return undefined
    return undefined;

  };

  /*
   * If our session is not valid lets try to get a new one
   */
  var reAuthCheck = function(email) {

    // Get the inquirer
    var inquirer = require('inquirer');

    // Prompt question
    var questions = [{
      name: 'password',
      type: 'password',
      message: 'Pantheon dashboard password (' + email + ')'
    }];

    /*
     * Helper method to promisify inquiries
     */
    var askIt = function(questions) {
      return new kbox.Promise(function(answers) {
        console.log('Your Pantheon session has expired. We need to reauth!');
        inquirer.prompt(questions, answers);
      });
    };

    // Run the prompt and return the password
    if (!getSession(email)) {
      return askIt(questions);
    }
    else {
      return Promise.resolve();
    }

  };

  // Return the reauth func
  return {
    reAuthCheck: reAuthCheck
  };

};
