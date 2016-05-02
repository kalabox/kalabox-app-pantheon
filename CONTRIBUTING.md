Contributing to the Kalabox App Pantheon
========================================

Creating Issues
---------------

**ALL ISSUES** for the Kalabox should be created on the main Kalabox
project page: https://github.com/kalabox/kalabox/issues

Once you create an issue please follow the guidelines that are posted as the
first comment on your.

Issue tags
----------

Here is a list of the tags we use on our issues and what each means.

#### Issue tags

* **bug fix** - The issue indicates a buggy feature that needs to be fixed.
* **duplicate** - The issue is expressed already elsewhere.
* **enhancement** - The issue wishes to improve a pre-existing feature.
* **feature** - The issue contains new proposed functionality.
* **task** - The issue is a non-development related task such as documentation.

#### Kalabox tags

* **cli** - The issue manifested using the cli.
* **gui** - The issue manifested using the gui.
* **installer** - The issue manifested using the installer.

#### Additional tags

* **sprint ready** - The issue is in a good state for action.
* **blocker** - The issue is currently blocking the completion of other issues.
* **Epic** - The issue acts as a container for other issues.

Epic Guidelines
---------------

An issue should be expressed as an epic if it satisfies the following two
critera

1. A feature which is best expressed as more than one issue.
2. Each sub-issue is shippable by itself.

Contributing to other Kalabox projects
--------------------------------------

The rest of this guide is dedicated to working on the CLI portion of
Kalabox. If you are actually interesting in working on other Kalabox projects
please check out their respective CONTRIBUTION.mds.

* [kalabox](https://github.com/kalabox/kalabox/blob/HEAD/CONTRIBUTING.md)
* [kalabox-cli](https://github.com/kalabox/kalabox-cli/blob/HEAD/CONTRIBUTING.md)
* [kalabox-ui](https://github.com/kalabox/kalabox-ui/blob/HEAD/CONTRIBUTING.md)
* [kalabox-app-php](https://github.com/kalabox/kalabox-app-php/blob/HEAD/CONTRIBUTING.md)

Setting Up for Development
--------------------------

#### 1. Install Kalabox CLI and GUI for development

1. [Follow the instructions](https://github.com/kalabox/kalabox-cli/blob/HEAD/CONTRIBUTING.md) to set up the Kalabox CLI
2. [Follow the instructions](https://github.com/kalabox/kalabox-ui/blob/HEAD/CONTRIBUTING.md) to set up the Kalabox GUI

#### 2. Install dev dependencies

You'll need to get node, npm and grunt setup to start
development.

**On OSX**

NOTE: You might want to make sure you get npm set up so you can install global modules without sudo. Agree to install command line tools if it prompts you when you run the git step.

```
cd /path/to/kalabox-cli/node_modules
rm -rf kalabox-app-php
git clone https://github.com/kalabox/kalabox-app-php.git
cd kalabox-app-php
npm install
```

#### 3. Testing out changes

Inside of `kalabox-app-php` you will see an `app` folder. This contains
the "template" for all apps created for Pantheon. Make a change in the template
and then `kbox create pantheon` to see the changes in a running app.

Sometimes its generally easier to create an app and work there first before
merging your changes back into the template. Here are a few good workflows.

```
# Testing config changes
kbox create pantheon -- --name=myapp
cd myapp
#
# 1. Edit config files
#
kbox restart

# Testing dockerfile changes
kbox create pantheon -- --name=myapp
cd myapp
#
# 1. Edit `kalabox-compose.yml` or `kalabox-cli.yml` so you are building from
#    the local dockerfile (see inline documentation in these files)
# 2. Edit the dockerfile with your changes
#
kbox rebuild
```

Testing
-------

We have code linting and functional testing for kalabox-app-php.
The linting uses jshint and jscs. The functional testing uses BATS.

#### Running Tests

Run code linting and standards:

`grunt test:code`

Run functional tests:

Set up the build environment
```
# Specify the Pantheon credentials you want to use
export PANTHEON_EMAIL=me@thing.com
export PANTHEON_PASSWORD=changeme

# Specify the Drupal 7 site you want to test
export PANTHEON_DRUPAL7_NAME=seven
export PANTHEON_DRUPAL7_SITE=kalabox-drupal7
export PANTHEON_DRUPAL7_ENV=dev

# Specify the Drupal 8 site you want to test
export PANTHEON_DRUPAL8_NAME=eight
export PANTHEON_DRUPAL8_SITE=kalabox-drupal8
export PANTHEON_DRUPAL8_ENV=dev

# Specify the Backdrop site you want to test
export PANTHEON_BACKDROP_NAME=backdrop
export PANTHEON_BACKDROP_SITE=kalabox-backdrop
export PANTHEON_BACKDROP_ENV=dev

# Specify the Wordpress site you want to test
export PANTHEON_WORDPRESS_NAME=wordpress
export PANTHEON_WORDPRESS_SITE=kalabox-wordpress
export PANTHEON_WORDPRESS_ENV=dev
```

Run the tests
```
# Run install tests
grunt test:install
# Run images tests
grunt test:images

# Run framework tests
grunt test:frameworks

# Run tests for a specfic framework
grunt test:drupal7
grunt test:drupal8
grunt test:backdrop
grunt test:wordpress

# Run tests for drush
grunt test:drush
```

#### Writing Tests

Tests are included in the "test" folders. The tests are written using
the BATS testing framework.

Looking at existing tests will give you a good idea of how to write your own,
but if you're looking for more tips, we recommend:

- [BATS wiki](https://github.com/sstephenson/bats)
- [BATS tutorial](https://blog.engineyard.com/2014/bats-test-command-line-tools)

Note that, since we've done most of the heavy lifting via the grunt tast you
shouldn't have to setup bats or perform any of the other
setup tasks in the tutorial.

Submitting Fixes
----------------

Perform all of your work in a forked branch of kalabox, preferably named in the
convention `[issue number]-some-short-desc`. Please also prefix your commits
with a relevant issue number if applicable ie

`#314: Adding pi to list of known trancendental numbers`

When you feel like your code is ready for review open a pull request against
the kalabox repository. The pull request will auto-generate a checklist
of things you need to do before your code will be considered merge-worthy.

Please always reference the main Kalabox issue in your commit messages and pull
requests using the kalabox/kalabox#[issue number] syntax.
