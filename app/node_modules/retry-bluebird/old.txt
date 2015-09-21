# retry-promise

Small utility function to automatically retry bluebird Promises.

## Install

```bash
npm install --save retry-promise
```

## Usage

`retry(opts, promise)`

`opts.max` max number of retries (default: `10`)
`opts.backoff` time in ms between retries (default: `1000`)

Time between retries is actually attempt_number * backoff.
Every retry waits longer.

## Example

```javascript
var retry = require('retry-promise');

retry({ max: 3, backoff: 1000 }, function (attempt) {
  console.log('Attempt', attempt, 'at creating user');
  return User
    .forge({ email: 'some@email.com' })
    .createOrLoad();
})
.then(function (user) {
  req.user = user;
  next();
})
.catch(next);
```
