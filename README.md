# Kalabox Pantheon App
## Overview

By default Kalabox can pull apps from and push apps to Pantheon... but this is much more than basic push/pull integration. Kalabox will build out a local Pantheon environment for each app. This means `solr`, `redis`, `ssl` and `terminus` all work just like they do on Pantheon. You can also use `drush`, `wp-cli`, `ssl` and toggle `php` version. YAY!

## Creating and starting a Pantheon app

This will spin up a Pantheon-on-Kalabox environment, set up relevant tools like `terminus`, `drush` and `wp-cli` and pull down the site and environment that you choose.

```bash
cd ~/dir/i/want/my/app/to/live (usually ~/Desktop/apps)
kbox create pantheon # and follow the prompts
```

Or you can run non-interactively

```bash
cd ~/dir/i/want/my/app/to/live (usually ~/Desktop/apps)
kbox create pantheon -- --email=me@me.com --password=**** --site=pantheon-site --env=pantheon-env --name=myApp
```

**NOTE:** You **must** issue your `kbox create pantheon` from somewhere inside your `HOME` directory.
**NOTE:** This 'create' functionality actually comes from the core kalabox-pantheon plugin.

## Tools and working with your code

You can run various Pantheon-helpful tools like terminus. To see a list of all the things run `kbox` from inside of your app directory.

```bash
Usage: kbox <command> [-- <options>]

Global commands that can be run from anywhere
  create
      pantheon     Creates a Pantheon app.
  env              Print Kalabox environmental vars.
  list             Display list of apps.
  update           Run this after you update your Kalabox code.
  version          Display the kbox version.

Actions that can be performed on this app
  config           Display the kbox application's configuration.
  destroy          Completely destroys and removes an app.
  pull             Pull down new code and optionally data and files.
  push             Push up new code and optionally data and files.
  rebuild          Rebuilds your app while maintaining your app data.
  restart          Stop and then start a running kbox application.
  services         Display connection info for services.
  start            Start an installed kbox application.
  stop             Stop a running kbox application.

Commands and tools this app can use
  bower            Run a bower command
  composer         Run a php cli command
  drush            Run a drush 8 command on your codebase
  git              Run a git command on your codebase
  grunt            Run a grunt command
  gulp             Run a gulp command
  mysql            Drop into a mysql shell
  node             Run a node command
  npm              Run a npm command
  php              Run a php cli command
  rsync            Run a rsync command on your files directory
  terminal         'ssh' into your appserver
  terminus         Run a terminus command
  wp               Run a wp-cli command on your codebase

Some things that are useful for development
  down             Bring kbox container engine down.
  status           Display status of kbox container engine.
  up               Bring kbox container engine up.

Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]

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

## Connecting to your database

You can connect to your database using a third-party tool such as SequelPro
or SqlWorkbench. To get the connection info run `kbox services` from inside a running pantheon app.

```
kbox services
[
  {
    "name": "edge",
    "project": "playbox",
    "url": [
      "http://edge.playbox.kbox",
      "https://edge.playbox.kbox"
    ]
  },
  {
    "name": "appserver",
    "project": "playbox",
    "url": [
      "http://playbox.kbox",
      "https://playbox.kbox"
    ]
  },
  {
    "name": "db",
    "project": "playbox",
    "credentials": {
      "database": "pantheon",
      "user": "pantheon",
      "password": "",
      "host": "10.13.37.100",
      "port": "32783"
    }
  },
  {
    "name": "solr",
    "project": "playbox"
  },
  {
    "name": "redis",
    "project": "playbox"
  }
]
```

Your connection info will be listed in the DB object. This information
may change between restarts.

```json
  {
    "name": "db",
    "project": "playbox",
    "credentials": {
      "database": "pantheon",
      "user": "pantheon",
      "password": "",
      "host": "10.13.37.100",
      "port": "32783"
    }
  }
```

## Using CLI tools

We package a lot of common CLI tools into your app. You can use most of these
more or less like you would if you had them natively installed. Here is a
brief example of doing an `npm install` on a theme.

```bash
cd /path/to/my/pantheon/app
cd code/sites/all/themes/kalatheme
kbox npm install
```

## Edge

To see what your site is like/how it behaves hitting the pantheon varnish
edge you can go to `http(s)://edge.myapp.kbox`. **Note that this
will likely interfere with your code sharing since varnish will be serving
you back a cached page and not what is actually on your appserver.**

## SSL

You can use `https` by just typing in `https://myapp.kbox` in your browser. We self-sign the certs so you will need to allow this in your browser.

Pantheon's ssl layer is at the edge so if you want to test SSL in a more
realistica way you should route your traffic through our edgeserver at https://edge.myapp.kbox.

## SOLR

Apache Solr comes in each local Pantheon environment. You can use it the exact same way as you do on Pantheon.

https://pantheon.io/docs/articles/sites/apache-solr/

## Redis

Just follow the same instructions from Pantheon to get redis to work locally.

https://pantheon.io/docs/articles/sites/redis-as-a-caching-backend/

The TL;DR for Drupal 7 (on php 5.3) here is

1. Install the [redis module](http://drupal.org/project/redis) (only 2.x supported)
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
(C) 2016 Kalabox Inc and friends
