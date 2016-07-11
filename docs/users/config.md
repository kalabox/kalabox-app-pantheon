Configuration
=============

"Pantheon on Kalabox" will add a new custom `pantheon` section to your app's `kalabox.yml` file. Most of this information is added during the initial creation of your app but some configuration options can be changed. You can also alter the config provided by the [core Kalabox plugins](http://docs.kalabox.io/en/stable/sers/config)

!!! attention "Why is my file syncing so slow?"
    File sharing is a notoriously hard problem for local development environments. Luckily, we've provided a few settings to optimize the performance of your sync in the event that our default file sharing settings are not sufficient. For info on how to do that and for more background on this FML problem check out our section on [file sharing](http://docs.kalabox.io/en/stable/users/config/#sharing)

Sharing
-------

"Pantheon on Kalabox" will slightly alter the functionality of the [default sharing plugin](http://docs.kalabox.io/en/stable/users/config/#sharing) so that it ignores the `filemount` for your CMS. Your Drupal, WordPress and Backdrop files are shared via a differnet mechanism and should be accessible in the `files` directory of your app root. Here are the directories we ignore given the CMS:

```yaml
drupal: 'sites/default/files'
drupal8: 'sites/default/files'
wordpress: 'wp-content/uploads'
backdrop: 'files'
```

!!! attention "Where is my files directory?"
    We will sync the above directories to `/media` inside of your data container. This directory is then shared out automatically to the `files` directory in your app root.

Pantheon
--------

Here is an example of a normal `pantheon` section in your `kalabox.yml` file.

```yaml
pantheon:
  email: mike@kalamuna.com
  site: playbox
  env: dev
  images: v0.13.0-alpha.1
  framework: drupal
  php: 53
  upstream:
    url: 'https://github.com/populist/panopoly-drops-7.git'
    branch: master
  uuid: f0072597-f475-4513-af94-13a33b630923
  name: Mike Pirog
```

### Changing the following is NOT CURRENTLY RECOMMENDED

**email** - The account used to spin up this site.
**site** - This is the machine name of your site used by Pantheon.
**dev** - This is the machine name of the Pantheon environment you pulled.
**images (pending deprecation)** - Docker tag to be used for images.
**framework** - Either `drupal`, `drupal8`, `backdrop` or `wordpress`
**upstream** - The Pantheon upstream from which your site gets updates.
**uuid** - The Pantheon user `UUID` associated with your email.
**name** - The name associated with your Pantheon account.

### Changing the following should be considered SAFE FOR THE PUBLIC

**php** - Either `53` or `55`. Change and run `kbox rebuild` to switch php versions.
