# Kalabox Plugin Rsync

A simple plugin to let you run rsync commands on your apps. This plugin will also forward in and load your ssh key so you can pull files that are key-protected.

## Installation

You can install this plugin by going into your app directory and running the normal

```
npm install kalabox-plugin-rsync --save
```

In order for your app to use the plugin you will also need to inform the app of its existence. This can be done in the `kalabox.json` file in your app root. Just add the plugin name to the `appPlugins` key.

```json
{
  "appName": "drupal7",
  "appPlugins": [
    "my-hot-plugin",
    "kalabox-plugin-dbenv",
    "kalabox-plugin-git",
    "kalabox-plugin-rsync"
  ],
}

```

## Usage

Run any rsync command you normally would but start it with `kbox`. Run it from inside directory that contains the app you want to run it against or pass in the appname first if you are outside that directory like `kbox appname rysnc ...`.

### Examples

#### Drupal 6/7

**For Drupal 8 you will want to use `files` instead of `sites/default/files`.**

#### UNIX
```

# Download Drupal files directory from pantheon
export ENV=dev
# Usually dev, test, or live
export SITE=[YOUR SITE UUID]
# Site UUID from dashboard URL: https://dashboard.pantheon.io/sites/<UUID>

# To Download
kbox rsync -rlvz --size-only --ipv4 --progress -e 'ssh -p 2222' $ENV.$SITE@appserver.$ENV.$SITE.drush.in:files/ sites/default/files

```

#### Windows
```

# Download Drupal files directory from pantheon
set ENV=dev
# Usually dev, test, or live
set SITE=[YOUR SITE UUID]
# Site UUID from dashboard URL: https://dashboard.pantheon.io/sites/<UUID>

# To Download
kbox rsync -rlvz --size-only --ipv4 --progress -e "ssh -p 2222" %ENV%.%SITE%@appserver.%ENV%.%SITE%.drush.in:files/ sites/default/files

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


