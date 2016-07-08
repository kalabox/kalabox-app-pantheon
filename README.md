Pantheon on Kalabox
===================

**"Pantheon on Kalabox"** is a [Kalabox](http://kalabox.io) plugin that allows users to authenticate with their Pantheon account and then...

  1. Pull down sites they have spun up on their Pantheon dashboard.
  2. Achieve parity with the Pantheon environment locally, including access to power services like Solr and Redis.
  3. Push changes back up to their Pantheon site.
  4. Get Pantheon specific power tools such as Terminus, Drush and WP-CLI.

While **"Pantheon on Kalabox"** is an external Kalabox plugin we actually include it as part of the default Kalabox offering along with the [**"PHP on Kalabox"**](http://github.com/kalabox/kalabox-app-php) plugin.

**We highly recommend you read the main [Kalabox docs](http://docs.kalabox.io) before continuing.**

Getting Started
---------------

Your best bet to learn more about the various aspects of **"Pantheon on Kalabox"** is to check out [our documentation](http://pantheon.kalabox.io). Here are some good topics to get you started:

  * [Introduction to Pantheon Apps](http://pantheon.kalabox.io/users/started)
  * [Using the Kalabox CLI with Pantheon apps](http://pantheon.kalabox.io/users/cli)
  * [Using the Kalabox GUI with Pantheon apps](http://pantheon.kalabox.io/users/gui)
  * [The Pantheon Services & Environment](http://pantheon.kalabox.io/users/services)
  * [The Pantheon tooling with which we ship](http://pantheon.kalabox.io/users/tooling)

Support
-------

To get help...

  1. Make sure your question isn't answered in either the [core docs](http://support.kalabox.io/solution/categories), the [Pantheon app docs](http://pantheon.kalabox.io/), or the [PHP docs](http://php.kalabox.io/).
  2. Thoroughly search the [Github issue queue](https://github.com/kalabox/kalabox/issues) for any existing issues similar to yours.
  3. If all else fails, create an issue and follow the pre-populated guidelines and the [CONTRIB.MD](https://raw.githubusercontent.com/kalabox/kalabox-app-pantheon/v0.13/CONTRIBUTING.md) as best as possible.

Some examples of good issue reporting:

  - [https://github.com/kalabox/kalabox/issues/565](https://github.com/kalabox/kalabox/issues/565)
  - [https://github.com/kalabox/kalabox/issues/557](https://github.com/kalabox/kalabox/issues/557)

Kalabox is an open-source project. As such, support is a community-lead effort. Please help us keep issue noise to a minimum and be patient with the Kalabox community members who donate time to help out.

**If you are interested in dedicated support or customizations, check out [our support offerings.](http://kalabox.io/support)**

Development Releases
--------------------

**Not For General Use**
These builds are intended primarily for developers working on Kalabox and those who are experienced enough with the Kalabox framework and want to test apps before they are released. Most users won't be interested.

We produce development releases for every commit merged into our `v0.13` branch. **These releases are not officially supported** but we have made them available to intrepid users who want to try the bleeding edge or are interested in trying out a recent bug fix before an official release is rolled.

  * **Windows** - [http://apps.kalabox.io/kalabox-app-pantheon-latest.zip](http://apps.kalabox.io/kalabox-app-pantheon-latest.zip)
  * **POSIX** - [http://apps.kalabox.io/kalabox-app-pantheon-latest.tar.gz](http://apps.kalabox.io/kalabox-app-pantheon-latest.tar.gz)

**NOTE:** Releases can take some time to build after we merge in commits. For that reason you might want to check the time of the last commit and if it is within a few hours you might want to hold off a bit before trying the new latest release.

You can also easily verify that the release you downloaded matches the latest commit. All development releases look something like `0.13.0-alpha.1-4-g63b0db0`. This means 4 commits after the `0.13.0-alpha.1` tag and with commit hash `g63b0db0`. You should make sure this commit hash matches or comes before the latest commit.

Check out for help on [installing Kalabox plugins manually](http://docs.kalabox.io/developers/advanced/plugins)

Other Resources
---------------

* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
