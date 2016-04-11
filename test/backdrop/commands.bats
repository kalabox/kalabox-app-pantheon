#!/usr/bin/env bats

#
# Basic sanity checks for our commands
#

# Load up environment
load ../env

#
# Setup some things
#
# @todo: Do we want to make sure we create a D7 site if one doesn't already exist like we do in
# create.js? or should we just assume its there already?
#
setup() {

  # Create a directory to put our test builds
  mkdir -p "$KBOX_APP_DIR"

  # We need to actually go into this app dir until
  # https://github.com/kalabox/kalabox/issues/1221
  # is resolved
  cd $KBOX_APP_DIR/$PANTHEON_BACKDROP_NAME

  # Version to check
  BOWER_VERSION=1.7
  COMPOSER_VERSION=1.0
  DRUSH_VERSION=8.0
  GIT_VERSION=2.6
  GRUNT_VERSION=0.1
  GULP_VERSION=1.2
  MYSQL_CLIENT_VERSION=14.
  NODE_VERSION=4.4
  NPM_VERSION=2.14
  PHP_VERSION=5.6
  RSYNC_VERSION=3.1
  TERMINUS_VERSION=0.10
}

#
# Command sanity checks
#
#  bower            Run a bower command
#  composer         Run a composer cli command
#  drush            Run a drush 8 command on your codebase
#  git              Run a git command on your codebase
#  grunt            Run a grunt command
#  gulp             Run a gulp command
#  mysql            Drop into a mysql shell
#  node             Run a node command
#  npm              Run a npm command
#  php              Run a php cli command
#  rsync            Run a rsync command on your files directory
#  terminal         'ssh' into your appserver
#  terminus         Run a terminus command
#  wp               Run a wp-cli command on your codebase
@test "Check that '$KBOX bower' returns the correct major version without an error." {
  run $KBOX bower --version
  [ "$status" -eq 0 ]
  [[ $output == *"$BOWER_VERSION"* ]]
}
@test "Check that '$KBOX composer' returns the correct major version without an error." {
  run $KBOX composer --version
  [ "$status" -eq 0 ]
  [[ $output == *"$COMPOSER_VERSION"* ]]
}
@test "Check that '$KBOX drush' returns the correct major version without an error." {
  run $KBOX drush --version
  [ "$status" -eq 0 ]
  [[ $output == *"$DRUSH_VERSION"* ]]
}
@test "Check that '$KBOX git' returns the correct major version without an error." {
  run $KBOX git --version
  [ "$status" -eq 0 ]
  [[ $output == *"$GIT_VERSION"* ]]
}
@test "Check that '$KBOX grunt' returns the correct major version without an error." {
  run $KBOX grunt --version
  [ "$status" -eq 0 ]
  [[ $output == *"$GRUNT_VERSION"* ]]
}
@test "Check that '$KBOX gulp' returns the correct major version without an error." {
  run $KBOX gulp --version
  [ "$status" -eq 0 ]
  [[ $output == *"$GULP_VERSION"* ]]
}
@test "Check that '$KBOX mysql' returns the correct major version without an error." {
  run $KBOX mysql --version
  [ "$status" -eq 0 ]
  [[ $output == *"$MYSQL_CLIENT_VERSION"* ]]
}
@test "Check that '$KBOX node' returns the correct major version without an error." {
  run $KBOX node --version
  [ "$status" -eq 0 ]
  [[ $output == *"$NODE_VERSION"* ]]
}
@test "Check that '$KBOX npm' returns the correct major version without an error." {
  run $KBOX npm --version
  [ "$status" -eq 0 ]
  [[ $output == *"$NPM_VERSION"* ]]
}
@test "Check that '$KBOX php' returns the correct major version without an error." {
  run $KBOX php --version
  [ "$status" -eq 0 ]
  [[ $output == *"$PHP_VERSION"* ]]
}
@test "Check that '$KBOX rsync' returns the correct major version without an error." {
  run $KBOX rsync --version
  [ "$status" -eq 0 ]
  [[ $output == *"$RSYNC_VERSION"* ]]
}
@test "Check that '$KBOX terminus' returns the correct major version without an error." {
  run $KBOX terminus cli version
  [ "$status" -eq 0 ]
  [[ $output == *"$TERMINUS_VERSION"* ]]
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_BACKDROP_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
