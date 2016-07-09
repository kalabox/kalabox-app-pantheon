Best Practices
==============

We try to enforce as many best practices as possible. Particulary those that reinforce the Pantheon workflow. Here are a few things that we restrict **FOR YOUR OWN GOOD**.

* We do not allow direct pushes to either the `test` or `live` environment. This both respects Pantheon's preferred workflow and conventional development best practices.
* We force you to create a commit and message even if you are just pushing database and files.

!!! tip "Level up your FLOWZZZ"
    If you're looking for a solution to bypass dev/test environments, examine Pantheon's [Quicksilver Platform Hooks](https://pantheon.io/docs/quicksilver).

Recommended Practices
---------------------

Here are some things you should **strongly consider** doing if you are not doing them already:

* Put everything in code and never push your database.

Working with Pantheon Multidev
------------------------------

We've definitely gotten a lot of questions and had many discussions around the best way to use multidev with Kalabox. Basically the two camps are "Create one app per environment" or "Create the dev environment and then switch branches". Both approaches have their benefits and these are the circumstances we recommend using one vs the other.

**Creating one app per multidev environment**

* I am working on a **BIG** feature that requires a sandboxed database.
* I require the database maintain its integrity.

**Pulling the dev environment and switcthing branches**

* I am working on a small in-code-only feature.
* I am working on a feature that does not rely on interaction with the database.
