v2.0.1
======

* Altered `nginx` to prevent `PORT` being added to redirects. [#1612](https://github.com/kalabox/kalabox/issues/1612)
* Added `client_max_body_size 100MB` to all frameworks.
* Provided a fallback of `drupal` for when there is no `framework` specified. [#1608](https://github.com/kalabox/kalabox/issues/1608)

v2.0.0
======

* No changes! Bumped for version parity across major projects.

v0.13.0-rc.2
============

* Switched to newest Pantheon screenshot endpoint. [#1571](https://github.com/kalabox/kalabox/issues/1571)
* Added push/pull methods to the app object and deleted integrations code. [#1574](https://github.com/kalabox/kalabox/issues/1574)
* Fixed issue where `solr` was complaining about a `self-signed certificate`. [#1364](https://github.com/kalabox/kalabox/issues/1364)

v0.13.0-rc.1
============

* Made sure we also installed the `convert` binary for `imagemagick`. [#548](https://github.com/kalabox/kalabox/issues/548)
* Added organization sites to list of sites. [#1264](https://github.com/kalabox/kalabox/issues/1264)
* Added basic support for `php 5.6` and `php 7.0`. [#1438](https://github.com/kalabox/kalabox/issues/1438)

v0.13.0-beta.4
==============

* Restricted Drupal database pull optimization to only `drush 7+` enabled sites. [#1532](https://github.com/kalabox/kalabox/issues/1532)

v0.13.0-beta.3
==============

* Added `$_SERVER['HTTP_X_SSL']` to improve support for distributions like Webspark. [#1504](https://github.com/kalabox/kalabox/issues/1504)
* Changed `php` version to be set automatically with site environment value instead of site default value. [#1500](https://github.com/kalabox/kalabox/issues/1500)
* Provided fallback (until [#1438](https://github.com/kalabox/kalabox/issues/1438))) to php `5.5` for sites using php `7.0` or `5.6`[#1500](https://github.com/kalabox/kalabox/issues/1500)
* Added `mysqli` to `terminus` container to stop `kbox wp` from reporting `Your PHP installation appears to be missing the MySQL extension which is required by WordPress` [#1500](https://github.com/kalabox/kalabox/issues/1500)
* Optimized pulling `drupal` and `backdrop` databases by skipping data for `cache, cache_*, history, sessions, watchdog` [#1180](https://github.com/kalabox/kalabox/issues/1180)
* Provided `skipdata` config option for users to skip data for additional `drupal` or `backdrop` tables database. [#1180](https://github.com/kalabox/kalabox/issues/1180)

v0.13.0-beta.2
==============

* Rebooted documentation. [#1322](https://github.com/kalabox/kalabox/issues/1322)
* Fixed `unison` file sharing to ignore the correct `FILEMOUNT`. [#1440](https://github.com/kalabox/kalabox/issues/1440)
* Provided better support for Pantheon's `/srv/bindings/` convention. [#1384](https://github.com/kalabox/kalabox/issues/1384) [#1349](https://github.com/kalabox/kalabox/issues/1349)
* Changed to a more robust PhantomJS download URL provided by Medium within their wrapper for installing via npm on github. [#1359](https://github.com/kalabox/kalabox/issues/1359)
* Fixed broken DNS tests. [#1429](https://github.com/kalabox/kalabox/issues/1429)
* Added a tests to verify `kbox services` returns correctly. [#1351](https://github.com/kalabox/kalabox/issues/1351)
* Switched authentication to use Pantheon machine tokens. [#1452](https://github.com/kalabox/kalabox/issues/1452)
* Moved `ssh` creation and management to the container level. Now uses `terminus` directly. [#1396](https://github.com/kalabox/kalabox/issues/1396)
* Fixed issue where `ssh` keys were not working on Windows causing the GUI to stall and CLI to prompt continuously for a password. [#1338](https://github.com/kalabox/kalabox/issues/1338)
* Enforced `*.sh` files to retain `LF` line endings on `git` checkouts. [#1437](https://github.com/kalabox/kalabox/issues/1437)
* Updated docs to reflect new machine token based authentication. [#1454](https://github.com/kalabox/kalabox/issues/1454)
* Fixed issue where older WordPress sites were siltently failing on DB import. [#1329](https://github.com/kalabox/kalabox/issues/1329)

v0.13.0-alpha.1
==================

* Upgraded to terminus to `0.11.2`. [#1369](https://github.com/kalabox/kalabox/issues/1369)
* Added `ldap` to appserver. [#1328](https://github.com/kalabox/kalabox/issues/1328)
* Fixed php extension to include `imagick`. [#1333](https://github.com/kalabox/kalabox/issues/1333)
* Upgraded terminus to `0.11.2` and downgraded CLI php `5.6`. [#1369](https://github.com/kalabox/kalabox/issues/1369)
* Refactored app to include connectors previously found in core. [#1223](https://github.com/kalabox/kalabox/issues/1223)
* Fixed bug where you couldn't read properties `git_url` and `id` [#1318](https://github.com/kalabox/kalabox/issues/1318)
* Improved deployment [#1223](https://github.com/kalabox/kalabox/issues/1223)
* Added tests to make sure we remove testing SSH keys from Pantheon. [#1321](https://github.com/kalabox/kalabox/issues/1321)
* Fixed a redis typo in kalabox-compose.yml
* Fixed an issue where the build process was not perserving script executable permissions [#1341](https://github.com/kalabox/kalabox/issues/1341)

v0.12.0-beta1
=============

### Bug Fixes

* Fixed bug where `kbox drush up` was not able to create a backups directory [#1297](https://github.com/kalabox/kalabox/issues/1297)
* Upped APC memory limit to handle out of memory errors on larger
sites. [#585](https://github.com/kalabox/kalabox/issues/585)
* Fixed bug where `kbox drush uli` was returning `http://default` instead of the correct hostname. [#1287](https://github.com/kalabox/kalabox/issues/1287)
* Added tests to verify drush is customizable at `config/drush` [#1298](https://github.com/kalabox/kalabox/issues/1298)

v0.12.0-alpha12
===============

#### Enhancements

* Improved testing framework to minimize Travis noise [#1275](https://github.com/kalabox/kalabox/issues/1275)
* Removed problematic `kbox terminal` command [#1174](https://github.com/kalabox/kalabox/issues/1174)

#### New Features

* Added more Dockerfiles to help extend existing services [#1174](https://github.com/kalabox/kalabox/issues/1174)
* Updated our development process with new contribution guidelines and standards [#1236](https://github.com/kalabox/kalabox/issues/1236)
* Added tests to make sure redis works with `kbox drush` commands [#1259](https://github.com/kalabox/kalabox/issues/1259)

#### Bug fixes

* Fixed `Class 'Redis' not found` error when running `kbox drush` commands with redis enabled [#1259](https://github.com/kalabox/kalabox/issues/1259)
* Fixed testing to use new `cgroup-bin` pkg instead of `cgroup-lite`
