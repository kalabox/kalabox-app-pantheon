#!/usr/bin/env bats

#
# Basic tests to verify basic Drupal 7 app actions
#

# Load up environment
load ../env

#
# Setup some things
#
setup() {
  # Create a directory to put our test builds
  mkdir -p "$KBOX_APP_DIR"
}

#
# Basic destroy action verification
#
@test "Check that we can run '$KBOX rebuild' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME rebuild
}
@test "Check that the app's directory exists before destroy is run." {
  run ls -l $KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME
  [ "$status" -eq 0 ]
}
@test "Check that we can run '$KBOX destroy' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
}
@test "Check that the app's directory was removed." {
  run ls -l $KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME
  [ "$status" -eq 1 ]
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
