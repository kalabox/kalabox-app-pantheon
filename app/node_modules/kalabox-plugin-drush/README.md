# Kalabox Plugin Drush

A nice drush plugin you can add to your app so you can do lots of fun drush things. It also will forward in your ssh key so you can run commands that need ssh access. You can also set a default drush version in your app config or specify a different version with the `--drush-version` flag.

## Installation

You can install this plugin by going into your app directory and running the normal

```
npm install kalabox-plugin-drush --save
```

In order for your app to use the plugin you will also need to inform the app of its existence. This can be done in the `kalabox.json` file in your app root. Just add the plugin's name to the `appPlugins` key.

```json
{
  "appName": "pressflow7",
  "appPlugins": [
    "kalabox-plugin-pressflow7-env",
    "kalabox-plugin-util",
    "kalabox-plugin-drush"
  ],
}

```
## Usage

Run any drush command you normally would but start it with `kbox`. Run it from the directory that contains the app you want to run it against or pass in the appname.

Examples

```
# List my extensions
kbox drush pml

# Get a user login link for root user with drush 7 on a specific app
kbox myappname drush uli --drush-version=drush7

# Enable the Konami Code module
kbox drush en konamicode -y
```

## Configuration 

In your apps kalabox.json add the following to the pluginConf key to set the default drush version

```json
    "kalabox-plugin-drush": {
      "drush-version": "drush6"
    },
```

Current available versions are `drush5`, `drush6`, `drush7` and `backdrush`.

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


