# Kalabox Pantheon App
## Overview 

By default Kalabox can pull apps from and push apps to Pantheon... but this is much more than basic push/pull integration. Kalabox will build out a local Pantheon environment for each app. This means `solr`, `redis`, `ssl` and `terminus` all work just like they do on Pantheon. You can also use `drush`, `wp-cli`, `ssl` and toggle `php` version. YAY!

## Creating and starting a Pantheon app

This will spin up a Pantheon-on-Kalabox environment, set up relevant tools like `terminus`, `drush` and `wp-cli` and pull down the site and environment that you choose. 

```bash
cd /dir/i/want/my/app/to/live (usually ~/Desktop/apps)
kbox create pantheon # and follow the prompts
kbox start
```

Or you can run non-interactively

```bash
cd /dir/i/want/my/app/to/live (usually ~/Desktop/apps)
kbox create pantheon -- --email=me@me.com --password=**** --site=pantheon-site --env=pantheon-env --name=myApp
kbox start
```

## Tools and working with your code

You can run various Pantheon-helpful tools like terminus. To see a list of all the things run `kbox` from inside of your app directory.

```bash
kbox

Global commands that can be run from anywhere
  apps             Display list of apps.
  create       
      pantheon     Creates a Pantheon app.
  update           Run this after you update your Kalabox code.
  version          Display the kbox version.

Actions that can be performed on this app
  config           Display the kbox application's configuration.
  containers       Display list of application's installed containers.
  destroy          Completely destroys and removes an app.
  pull             Pull down new code and optionally data and files.
  push             Push up new code and optionally data and files.
  rebuild          Rebuilds your app while maintaining your app data.
  restart          Stop and then start a running kbox application.
  start            Start an installed kbox application.
  stop             Stop a running kbox application.

Commands and tools this app can use
  drush            Run drush commands.
  git              Run git commands.
  rsync            Run rsync commands.
  terminus         Run terminus commands.
  wp               Run wp-cli commands.

```

## Pulling from Pantheon

You can refresh your local code and even your database and files by running `kbox pull` from inside of your Pantheon app. 

```
kbox pull -- -h
Options:
  -h, --help     Display help message.                                 
  -v, --verbose  Use verbose output.                                
  --database     Pull DB from an env. Options are dev, test, live and none
  --files        Pull files from an env. Options are dev, test, live and none
  --newbackup    True to generate a new DB backup                      
```

## Pushing to Pantheon

You can easily push up code and even your database and files by running `kbox push`. 

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -m, --message  Tell us about your change                              [string]
  --database     Push DB to specific env. Options are dev and none      [string]
  --files        Push files to a spefic env. Options are dev and none   [string]
```

## SSL

You can use `https` by just typing in `https://myapp.kbox` in your browser. We self-sign the certs so you will need to allow this in your browser.

## SOLR

Apache Solr comes in each local Pantheon environment. You can use it the exact same way as you do on Pantheon. Reference the [Pantheon docs](https://pantheon.io/docs/articles/sites/apache-solr/) for more information.

## Redis

Just follow the same instructions from Pantheon to get redis to work locally.
https://pantheon.io/docs/articles/sites/redis-as-a-caching-backend/

The TL;DR for Drupal 7 (on php 5.3) here is

1. Install the [redis module](http://drupal.org/project/redis).
2. Use this code snippet in settings.php

```php
// All Pantheon Environments.
if (defined('PANTHEON_ENVIRONMENT')) {
  // Use Redis for caching.
  $conf['redis_client_interface'] = 'PhpRedis';
  $conf['cache_backends'][] = 'sites/all/modules/redis/redis.autoload.inc';
  $conf['cache_default_class'] = 'Redis_Cache';
  $conf['cache_prefix'] = array('default' => 'pantheon-redis');
  // Do not use Redis for cache_form (no performance difference).
  $conf['cache_class_cache_form'] = 'DrupalDatabaseCache';
  // Use Redis for Drupal locks (semaphore).
  $conf['lock_inc'] = 'sites/all/modules/redis/redis.lock.inc';
}
```

## Xdebug

xdebug is set up on your php appserver. Here is an example SublimeText 2 config (similar settings have been tested on Codebug, Eclipse, and other debugging tools). Note that you may need to launch it in the browser the first time using XDEBUG_SESSION_START=1 as a query parameter (ex: http://my-app.kbox/some-page?XDEBUG_SESSION_START=1). If breakpoints aren't working in your debugger, try inserting xdebug_break() in your code.

```json
{
  "folders":
  [
    {
      "path": "/local/path/to/my/code"
    }
  ],
  "settings":
  {
    "xdebug":
    {
      "max_children": 32,
      "max_depth": 16,
      "pretty_output": true,
      "path_mapping":
      {
        "/code/": "/local/path/to/my/code/"
      },
      "port": 9000,
      "url": "http://mysite.kbox/"
    }
  }
}
```

## Other Resources

* [API docs](http://api.kalabox.me/)
* [Test coverage reports](http://coverage.kalabox.me/)
* [Kalabox CI dash](http://ci.kalabox.me/)
* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
* [Boot2Docker](https://github.com/boot2docker/boot2docker)
* [Syncthing](https://github.com/syncthing/syncthing)
* [Docker](https://github.com/docker/docker)

-------------------------------------------------------------------------------------
(C) 2015 Kalamuna and friends
