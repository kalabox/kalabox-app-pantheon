# retry-bluebird

Utility function for retrying promises if they reject.

## Install

```bash
npm install --save retry-bluebird
```
## Usage

`retry(opts, callback)`

`callback` function that returns a Promise

`opts` [optional] options object

`opts.max` maximum number of retries (default: `5`)

`opts.backoff` time interval in ms between retries (default: `500`)

The time between retries is (`attempt number * backoff`) so that time between
retries becomes progressively longer.

## Example
```javascript
var Promise = require('bluebird');
var retry = require('retry-bluebird');
var database = require(...);
var config = require(...);

Promise.try(function() {
  return config.load();
})
.then(function(config) {
  return retry({max: 5}, function() {
    return Promise.fromNode(database.connect);
  })
})
.then(function() {
  console.log('Connected to DB!');
}, function(err) {
  throw err;
});
```
