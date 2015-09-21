var Promise = require('bluebird');

/*
 * Retry a function and return a promise.
 */
module.exports = function(opts, fn) {

  // Do some arugment shuffling.
  if (!fn && typeof opts === 'function') {
    fn = opts;
    opts = null;
  }

  // Validate callback function.
  if (!fn || typeof fn !== 'function') {
    return Promise.reject(new Error('Invalid callback function.'));
  }

  // Default options.
  opts = opts || {};
  opts.max = opts.max || 5;
  opts.backoff = opts.backoff || 500;

  // Recursive function.
  var rec = function(counter) {

    // Try callback function.
    return Promise.try(function() {
      return fn(counter);
    })
    // Catch errors.
    .catch(function(err) {
      if (counter < opts.max) {
        // If we have retries left then wait and retry.
        return Promise.delay(opts.backoff * counter)
        .then(function() {
          return rec(counter + 1);
        });
      } else {
        // We are out of retries, so throw the error.
        throw err;
      }
    });

  };

  // Init recursive function.
  return rec(1);

};
