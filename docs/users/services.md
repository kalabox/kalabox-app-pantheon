Services
========

Each Pantheon app runs a number of services (each in their own Docker container) to approximate the Pantheon environment.

If you are not already familiar with the basics of how Kalabox Apps work please take some time to [read about it](http://docs.kalabox.io/en/stable/users/started).

appserver
---------

The `appserver` service runs either [php-fpm 5.3](https://github.com/kalabox/kalabox-app-pantheon/tree/v0.13/app/dockerfiles/pantheon-appserver/53), [php-fpm 5.5](https://github.com/kalabox/kalabox-app-pantheon/tree/v0.13/app/dockerfiles/pantheon-appserver/55), [php-fpm 5.6](https://github.com/kalabox/kalabox-app-pantheon/tree/v0.13/app/dockerfiles/pantheon-appserver/56) or [php-fpm 7.0](https://github.com/kalabox/kalabox-app-pantheon/tree/v0.13/app/dockerfiles/pantheon-appserver/70). We will automatically use the same version of `php` you are running on your Pantheon site. The service is responsible for processing `php` files and returning the result to the `web` service for display to the user.

### Extensions

We try to [maintain parity](https://pantheon.io/docs/application-containers/) with the `php` extensions offered on Pantheon. That means that we install the following on your `appserver`...

  * apc **(php 5.3 only)**
  * curl
  * gd
  * imagick
  * imap
  * ldap
  * mbstring
  * mcrypt
  * mysqli
  * OAuth
  * pdo_mysql
  * redis
  * xdebug
  * Zend OPcache **(php 5.5+ only)**
  * zip

### Configuration

Inside your Pantheon app root you should see a `config` folder. This contains some files that you can use to customize the `appserver` service. Change the settings you want and then run `kbox restart` for them to take hold.

```bash
|-- config
  |-- php
    |-- php.ini       Contains basic `php` settings
    |-- prepend.php   Contains custom Pantheon environmental variables
    |-- www.conf      Contains `php-fpm` config
```

### Environment

We also set a number of common [Pantheon environmental variables](https://pantheon.io/docs/read-environment-config/) so that Pantheon-specific code also works on Kalabox. You can inspect these variables by running `phpinfo()`. They should appear both directly in the `appserver` environment and also in your `$_SERVER` global.

* `AUTH_SALT`: Needed for Wordpress. We set this automatically.
* `AUTH_KEY`: Needed for Wordpress. We set this automatically.
* `NONCE_SALT`: Needed for Wordpress. We set this automatically.
* `LOGGED_IN_SALT`: Needed for Wordpress. We set this automatically.
* `SECURE_AUTH_SALT`: Needed for Wordpress. We set this automatically.
* `LOGGED_IN_KEY`: Needed for Wordpress. We set this automatically.
* `SECURE_AUTH_KEY`: Needed for Wordpress. We set this automatically.
* `DRUPAL_HASH_SALT`: Needed for Drupal8. We set this automatically.
>
* `BACKDROP_SETTINGS`: JSON object of Backdrop config and settings.
* `PRESSFLOW_SETTINGS`: JSON object of Drupal config and settings.
>
* `CACHE_PASSWORD`:
* `CACHE_PORT`: `8161`
* `CACHE_HOST`: redis
>
* `PANTHEON_BINDING`: kalabox
* `PANTHEON_DATABASE_STATE`: `empty` or `undefined`
* `PANTHEON_ENVIRONMENT`: kalabox
* `PANTHEON_INDEX_PORT`: 449
* `PANTHEON_INDEX_HOST`: solr
* `PANTHEON_SITE_NAME`: Your Pantheon site name
* `PANTHEON_SITE UUID`: Your Panthen `UUID`
>
* `DB_NAME`: pantheon
* `DB_PASSWORD`: pantheon
* `DB_USER`: pantheon
* `DB_PORT`: 3306
* `DB_HOST`: database
>
* `FILEMOUNT`: The location of your files directory
* `DOCROOT`: /
* `FRAMEWORK`: Either `drupal`, `drupal8`, `backdrop`, or `wordpress`
>
* `USER`:  www-data
* `HOME`:  /srv/bindings/kalabox
>
* `HTTP_X_SSL`: `ON` or `undefined`
* `HTTPS`: `on` or `undefined`

!!! note "Where does this get set?"
    We set the Pantheon environment in two configuration files that you have control over: `config/php/prepend.php` and `config/php/www.conf`. You may edit these as you see fit.

data
----

The `data` service runs a [busybox](https://github.com/docker-library/busybox) container and exists so that valuable application data can persist between rebuilds and be shared amongst other containers.

The volumes of this container are shared with all the other containers which means that every container will have the following directories:

```bash
|-- /certs          Contains certificates to be shared among services
|-- /code           Contains the Drupal, Wordpress or Backdrop git repo
|-- /media          Contains your applications files, ie `sites/default/files` for Drupal 7
|-- /php            Contains the `php-fpm` socket
|-- /var/lib/mysql  Contains the `mariadb` database
```
* The `/media` directory should be synced to the `files` directory inside of your local app.

!!! note "Data service shows as not running"
    Data containers always show up as not running when inspected with Docker.

db
--

The `db` service runs a [mariadb 5.5](https://github.com/docker-library/mariadb/tree/master/5.5) container. This service stores your applications `sql` data.

### Configuration

Inside your Pantheon app root you should see a `config` folder. This contains some files that you can use to customize the `db` service. Change the settings you want and then run `kbox restart` for them to take hold.

```bash
|-- config
  |-- mysql
    |-- my.cnf        Contains basic `mysql` settings
```

### Accessing your database

You can access your database from an external or internal service by using the `kbox services` command. Please review the [services command](./cli/#services) to find out more.

edge
----

The `edge` service runs a [varnish 4.0](https://github.com/kalabox/kalabox-app-pantheon/tree/v0.13/app/dockerfiles/pantheon-edge) container with SSL termination. This service seeks to approximate the [Pantheon edge](https://pantheon.io/docs/varnish/) by serving up cached HTML of anonymous requests.

### Configuration

Inside your Pantheon app root you should see a `config` folder. This contains some files that you can use to customize the `edge` service. Change the settings you want and then run `kbox restart` for them to take hold.

```bash
|-- config
  |-- varnish
    |-- default.vcl        Contains Pantheon `varnish` settings
```

### Using the edge

Since caching requests are not ideal for local web development we do not route through the `edge` service by default. If you would like to test your code against the `edge` service you can try either of the two URLS:

  * `http://edge.MYAPP.kbox`
  * `https://edge.MYAPP.kbox`

!!! note "File sharing is delayed when you use the edge"
    Since varnish will be serving you back a cached page and not what is actually on your appserver, it may take a decent amount of time for code changes to manifest.

redis
-----

The `redis` service runs a [redis 2.8](https://github.com/docker-library/redis) container. This service provides a key-value caching solution [similar to Pantheon](https://pantheon.io/docs/redis/).

### Configuration

Inside your Pantheon app root you should see a `config` folder. This contains some files that you can use to customize the `redis` service. Change the settings you want and then run `kbox restart` for them to take hold.

```bash
|-- config
  |-- redis
    |-- redis.conf        Contains Pantheon `redis` settings
```

### Using Redis

Setup should be identical to Pantheon. See: [https://pantheon.io/docs/redis/](https://pantheon.io/docs/redis/)

!!! danger "Experimental Feature"
    We've only tested redis on Drupal 7 so YMMV on other frameworks.

You can access your Redis server using the redis-cli command-line client, or any other GUI Redis client by connecting to the port identified using the `kbox services` command. Please review the [services command](./cli/#services) to find out more.


solr
----

The `solr` service runs a [solr 3.6](https://github.com/kalabox/kalabox-app-pantheon/tree/v0.13/app/dockerfiles/pantheon-solr) container with a couple of customizations so that you can easily post your schema. This service provides a a search index [similar to Pantheon](https://pantheon.io/docs/solr/).

### Using SOLR

Setup should be identical to Pantheon. See: [https://pantheon.io/docs/articles/sites/apache-solr/](https://pantheon.io/docs/articles/sites/apache-solr/
)

!!! danger "Experimental Feature"
    We've only tested solr on Drupal 7 so YMMV on other frameworks. Some users have reported issues posting their schema and then attempting to index their sites. These issues seem to be resolved by restarting your app (possibly a few times).

web
---

The `web` service runs [nginx 1.8.1](https://github.com/nginxinc/docker-nginx). This service is responsible for serving your site to the outside world.

### Configuration

Inside your Pantheon app root you should see a `config` folder. This contains some files that you can use to customize the `web` service. Change the settings you want and then run `kbox restart` for them to take hold.

```bash
|-- config
  |-- nginx
    |-- backdrop.conf     Contains config for a Backdrop server
    |-- drupal.conf       Contains config for a Drupal 6/7 server
    |-- drupal8.conf      Contains config for a Drupal 8 server
    |-- nginx.conf        Contains the main nginx configuration
    |-- wordpress.conf    Contains config for a WordPress server
```

### Accessing your site

You should be able to access your Pantheon site either securely or non-securely using either...

  * `http://MYAPP.kbox`
  * `https://MYAPP.kbox`

!!! note "Self-signed certs"
    We self-sign certs since we are running locally. These means you will likely need to override browser warnings indicating this.
