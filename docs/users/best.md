Best Practices
==============

Pushing to Pantheon
-------------------

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

**Important:** To avoid slow pulls on larger sites, Kalabox pulls from Pantheon's database backups, instead of the active database. If you would like to retrieve the most recent version of your database, you will need to indicate y when asked Retrieve latest DB instead of most recent backup? (y/N) or use the --newbackup flag.
