Kalabox CLI for Pantheon Apps
=============================

"Pantheon on Kalabox" adds and extends a number of commands beyond the [core command set](http://docs.kalabox.io/en/stable/users/cli/) to help you pull down Pantheon sites, push changes back to them, and much more. With the exception of `kbox create pantheon`, all of these commands must be run from inside of an existing Pantheon site.

If you are not already familiar with the basic Kalabox commands or how the Kalabox CLI works in general please take some time to [read about it](http://docs.kalabox.io/en/stable/users/cli).

create pantheon
---------------

Pulls down one of your Pantheon sites and creates it locally on Kalabox. You will need a Pantheon machine token to authenticate correctly. [Creating one from your Pantheon dashboard is fairly easy](https://dashboard.pantheon.io/machine-token/create/Kalabox).

`kbox create pantheon`

```
Options:
  -h, --help     Display help message.                                      [boolean]
  -v, --verbose  Use verbose output.                                        [boolean]
  -d, --debug    Use debug output.                                          [boolean]
  --token        Pantheon machine token                                     [string]
  --site         Pantheon site machine name                                 [string]
  --env          Pantheon site environment                                  [string]
  --name         The name of your app.                                      [string]
  --nodb         Skip pulling my database.                                  [boolean]
  --nofiles      Skip pulling my files directory.                           [boolean]
  --dir          Creates the app in this directory. Defaults to CWD.        [string]
  --from         Local path to override app skeleton (be careful with this) [string]
```

```bash
# Create a pantheon site with interactive prompts
kbox create pantheon

# Completely non-interactively create a site from pantheon
kbox create pantheon -- \
  --token=myniftytoken
  --site=borgcollective \
  --env=dev \
  --name=borg

# Create a site but specify an alternate directory to create it in
kbox create pantehon -- --dir=~/test/testapp
```

!!! danger "Must run `create` from your `USERS` directory"
    Because of a file sharing restriction placed on us by [Boot2Docker](http://github.com/boot2docker/boot2docker) you **must** create your app inside of the `USERS` directory for your OS. Those directories are...

      * **OSX** - `/Users`
      * **Linux** - `/home`
      * **Windows** - `C:\Users`

pull
----

Refreshes an existing site by pulling code and optionally the database, and files.

`kbox pull`

```
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
  --database     Pull DB from a supported env or none                   [string]
  --files        Pull files from a supported env or none                [string]
```

```bash
# Pull updates from my site using interactive prompts
kbox pull

# Non-interactively pull my sites code, database and files
kbox pull -- --database=dev --files=dev

# Just pull my code
kbox pull -- --database=none --files=none
```

!!! note "Options also apply to multidev"
    If you originally pulled from a multidev environment named `bob` instead of from `dev` you should see the name `bob` instead of `dev` in your `--database` and `--files` options.

push
----

Pushes your code and optionally your database and files back up to your original Pantheon site.

`kbox push`

```
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
  -m, --message  Tell us about your change                              [string]
  --database     Push DB to a supported env or none                     [string]
  --files        Push files to a supported env or none                  [string]
```

```bash
# Push updates from my site using interactive prompts
kbox push

# Non-interactively push back to a multidev named bob
kbox push -- --database=bob --files=bob -m "I love this song"

# Just push my code, will prompt for a commit message
kbox push -- --database=none --files=none
```

!!! note "Options also apply to multidev"
    If you originally pulled from a multidev environment named `bob` instead of from `dev` you should see the name `bob` instead of `dev` in your `--database` and `--files` options.

If your site is in "SFTP" mode on Pantheon and a commit already exists, you will receive a warning that the push operation was not able to be completed. You'll need to commit that code on Pantheon before the push operation can be ran successfully.

rebuild
-------

Completely rebuilds your Pantheon site. This command is identical to the [core rebuild command](http://docs.kalabox.io/en/stable/users/cli/#rebuild) except that it is slightly extended here so that the rebuild preserves your applications data.

`kbox rebuild`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

```bash
# Rebuild my app with verbose mode on so I can see WTF is happening!
kbox rebuild -- -v
```

services
--------

Displays relevant connection information for your Pantheon services. You can use this information to connect to your database from an external DB client like [SQLPro](http://www.sequelpro.com/).

`kbox services`

```
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```
