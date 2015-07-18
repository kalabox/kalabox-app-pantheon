# Kalabox Pantheon App
## Overview

By default Kalabox can pull apps from and push apps to Pantheon... but this is much more than basic push/pull integration. Kalabox will build out a local Pantheon environment for each app. This means `solr`, `redis`, `ssl` and `terminus` all work just like they do on Pantheon. You can also use `drush`, `wp-cli`, `ssl` and toggle `php` version. YAY!

## Creating and starting a Pantheon app

This will spin up a Pantheon-on-Kalabox environment, set up relevant tools like `terminus`, `drush` and `wp-cli` and pull down the site and environment that you choose.

```bash
cd /dir/i/want/my/app/to/live (usually ~/kalabox/apps)
kbox create pantheon
? Pantheon dashboard email: mike@kalamuna.com
? Pantheon dashboard password: **********
? What do you want to do? Pull a pre-existing site from Pantheon
? Which site? greenbiz
? Which environment? gbz-870
? What will you call this monster you have created: greenbiz
? Php version? 5.3.29
? Git username? Mike Pirog
? Git email? mike@kalamuna.com
cd greenbiz
kbox start # Site is available at http(s)://greenbiz.kbox
```

## Tools and working with your code

You can run various Pantheon-helpful took like terminus.

```bash
Usage: kbox <command> [-- <options>]

Examples:
  kbox drush -- --drush-version=5
  kbox terminus -- --h
  kbox wp
  kbox git
  kbox rsync

Commands:
  drush           Run drush commands.
  git             Run git commands.
  rsync           Run rsync commands.
  terminus        Run terminus commands.
  wp              Run wp-cli commands.

```

## Pulling from Pantheon

You can refresh your local code and even your database and files by running `kbox pull` from inside of your Pantheon app. This will pull from the environment you specify during `kbox create`.

```
kbox pull -- -h
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  --database     Import latest database backup.                        [boolean]
  --files        Import latest files.                                  [boolean]
```

## Pushing to Pantheon

You can easily push up code and even your database and files by running `kbox push`. This will push to the environment you specified during `kbox create`.

```bash
kbox push -- -h
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  --message      Tell us about your change                              [string]
  --database     Push local database up.                               [boolean]
  --files        Push local files up.                                  [boolean]
```

## SSL

You can use `https` by just typing in `https://myapp.kbox` in your browser. We self-sign the certs so you will need to allow this in your browser.

## SOLR

Apache Solr comes in each local Pantheon environment. You can use it the exact same way as you do on Pantheon. Reference the [Pantheon docs](https://pantheon.io/docs/articles/sites/apache-solr/) for more information.

**Currently you will need to use [this patch](https://github.com/pantheon-systems/drops-7/pull/64) to get this to work out of the box. To apply this patch, simply replace the contents of your modules/pantheon/pantheon_apachesolr/pantheon_apachesolr.module file with [this file](https://github.com/kalabox/drops-7/blob/schema-post-box/modules/pantheon/pantheon_apachesolr/pantheon_apachesolr.module). This will be rolled into the `pantheon_apachesolr` module on the next Drupal release.**

## Redis

Just follow the same instructions from Pantheon to get redis to work locally.
https://pantheon.io/docs/articles/sites/redis-as-a-caching-backend/

The TL;DR for Drupal 7 here is

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

## Current limitations

This app is still somewhat experimental and a number of improvements are coming. The biggest things still being worked out are

1. Better support for Wordpress, Drupal 8 and Backdrop
2. Emulation of pantheon's binding info (for things like the CiviCRM starter kit)
3. Importing new sites into Pantheon from start states.

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

