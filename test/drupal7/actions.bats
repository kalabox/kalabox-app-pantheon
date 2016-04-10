#!/usr/bin/env bats

#
# Basic tests to verify basic Drupal 7 app actions
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
}

#
# Basic non-interactive action verification
#
#   config           Display the kbox application's configuration.
#   rebuild          Rebuilds your app while maintaining your app data.
#   restart          Stop and then start a running kbox application.
#   services         Display connection info for services.
#   start            Start an installed kbox application.
#   stop             Stop a running kbox application.
#
@test "Check that we can run '$KBOX config' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME config
}
@test "Check that we can run '$KBOX stop' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME stop
}
@test "Check that we can run '$KBOX start' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME start
}
@test "Check that we can run '$KBOX restart' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME restart
}
#
# We should find a better place to test this because we don't want to
# replace the services we built from local dockerfiles in images.bats with
# the ones from docker hub.
#
@test "Check that we can run '$KBOX rebuild' without an error." {
  skip "Find a better place to test this."
  $KBOX $PANTHEON_DRUPAL7_NAME rebuild
}
@test "Check that we can run '$KBOX services' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME services
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
