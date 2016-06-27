v0.13.0-unstable.1
=============

v0.12.0-beta2
=============

#### New Features

* Upgraded to terminus to `0.11.1`. [#1318](https://github.com/kalabox/kalabox/issues/1318)
* Refactored app to include connectors previously found in core. [#1223](https://github.com/kalabox/kalabox/issues/1223)

#### Bug Fixes

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
* Switched mysql user to handle changes in upstream official mariadb container [#1358](https://github.com/kalabox/kalabox/issues/1358)

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
