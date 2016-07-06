Kalabox CLI for Pantheon Apps
=====================

The Pantheon App exposes a number of commands via the CLI to help you pull down Pantheon 
sites, push changes back to them, and much more. With the exception of `kbox create pantheon`,
all of these commands must be run from inside of an existing Pantheon site that you've
previously pulled.

## create pantheon

Pulls down one of your Pantheon sites.

`kbox create pantheon`

```
Options:
  -h, --help     Display help message.                                      [boolean]
  -v, --verbose  Use verbose output.                                        [boolean]
  --debug        Use debug output.                                          [boolean]
  --email        Pantheon dashboard email.                                  [string]
  --password     Pantheon dashboard password.                               [string]
  --site         Pantheon site machine name.                                [string]
  --env          Pantheon site environment.                                 [string]
  --name         The name of your app.                                      [string]
  --nofiles      Skip pulling my files directory.                           [boolean]
  --nodb         Skip pulling my database.                                  [boolean]
  --dir          Creates the app in this directory. Defaults to CWD.        [string]
  --from         Local path to override app skeleton (be careful with this) [string]
```

Simply executing the above command will start a series of CLI prompts that will
guide you through the site creation process.

Once the app creation is finished, the app should start automatically.

Note that you can choose any multi-dev environment to pull your code, database,
and files from. Pulling files and database is optional. After pulling down your
code, you can switch between the git branches on your Pantheon git repository as
normal, or use [kbox git].

## pull

Refreshes an existing site by pulling code, database, and files.

```
cd ~/pantheon-app
kbox pull
```

```
Options:
  -h, --help     Display help message.                                        [boolean]
  -v, --verbose  Use verbose output.                                          [boolean]
  --debug        Use debug output.                                            [boolean]
  --database     Pull DB from an env. Options are dev, test, live and none    [string]
  --files        Pull files from an env. Options are dev, test, live and none [string]
```

Running `kbox pull` will start a series of command prompts that ask you if you want to
pull down your code/database/files, and if you do, what environment you'd like to
pull them from.

## push

Pushes your code (and optionally your database and files) up to your original
Pantheon site.

```
cd ~/pantheon-app
kbox push
```

```
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  --debug        Use debug output.                                     [boolean]
  -m, --message  Tell us about your change                              [string]
  --database     Push DB to specific env. Options are dev and none      [string]
  --files        Push files to a spefic env. Options are dev and none   [string]
```

Running `kbox push` will start a series of command prompts that allow you to
push up a new code commit, and optionally your database and files, to the
dev environment or one of your multi-dev environments.

Note that the Test and Live environments are not listed as options. This both
respects Pantheon's normal workflow and conventional best practices. If you're
looking for a solution to bypass dev/test environments, examine either 
Pantheon's [Quicksilver Platform Hooks](https://pantheon.io/docs/quicksilver).

If your site is in "SFTP" mode on Pantheon and a commit already exists, you
will receive a warning that the push operation was not able to be completed.
You'll need to commit that code on Pantheon before the push operation can
be ran successfully.

Even if you don't have code changes, kbox push will still ask for a commit
message. This will leave you a commit message to record what database or file
changes you have deployed. We discourage a workflow that relies on deploying
database and file changes to Pantheon; if you're dependent on this workflow for
your day-to-day operations, consider the options available to you to store
configuration as code and deploy it via Git.

## services

Displays connection information for your database, Redis, and Solr.

```
cd ~/pantheon-app
kbox services
```

```
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  --debug        Use debug output.                                     [boolean]
```

If you want to connect to your database, Redis, or Solr from a browser like
[PHPMyAdmin](https://www.phpmyadmin.net), [SQLPro](http://www.sequelpro.com/),
[Redis Desktop Manager](http://redisdesktop.com), or another client, use these 
credentials.
