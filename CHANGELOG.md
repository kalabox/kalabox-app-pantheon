v0.12.0-beta1
=============

### New Features

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
