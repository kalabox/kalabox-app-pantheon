For Developers
==============

!!! warning "For Developers Working on Kalabox Only"
    If you're looking for documentation on how to use Kalabox, see the "For Users" section.

You should be able to use this guide to...

1. Install "Kalabox on Pantheon" from source
2. Learn where all the things are
3. Learn about testing
4. Learn about shipping

Installation
------------

Please use the [plugin installation guide](http://docs.kalabox.io/en/stable/developers/plugins/#installation) to learn how to install the source version of this plugin.

Code locations
--------------

Here is a general breakdown of where things live inside the plugin.

```bash
./
|-- app             Contains a skeleton of an app we can copy to get started
|-- docs            Source markdown files for the documentation you are reading
|-- lib             Modules needed to implement `kbox create`
|-- scripts         Scripts to help with CI
|-- test            BATS functional tets
```

Running Tests
-------------

### Code linting and standards

This plugin implements some basic linting and code standards to make sure things remain consistent between developers and to prevent syntax errors. You can easily check whether your code matches these standards using grunt.

```bash
grunt test:code
```

### Functional tests

The installer tests use the [BATS framework](https://github.com/sstephenson/bats).

```bash
grunt test:func
```

Writing Tests
-------------

Tests reside in the "test" folder. For examples of functional tests look for ".bats" files in the "test" folder.

Looking at existing tests will give you a good idea of how to write your own, but if you're looking for more tips, we recommend:

* [BATS wiki](https://github.com/sstephenson/bats)
* [BATS tutorial](https://blog.engineyard.com/2014/bats-test-command-line-tools)

Building
--------

```bash
# Package the the plugin into a distributable archive
grunt pkg
cd dist
```

Rolling a release
-----------------

If you are an administrator of the plugin repo you can push various releases using the following...

```bash
# Do a minor ie 0.x.0 bump and push a release
grunt release --dry-run
grunt release

# Do a patch ie 0.0.x bump and push a release
grunt patch --dry-run
grunt patch

# Do a prerelease ie 0.0.0-alpha.x bump and push a release
grunt prerelease --dry-run
grunt prerelease
```
