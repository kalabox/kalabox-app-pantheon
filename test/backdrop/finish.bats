#!/usr/bin/env bats

#
# Basic tests to verify basic Backdrop app actions
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
# Basic destroy action verification
#
@test "Check that we can run '$KBOX rebuild' without an error." {
  $KBOX $PANTHEON_BACKDROP_NAME rebuild
}
@test "Check that the app's directory exists before destroy is run." {
  if [ ! -d "$KBOX_APP_DIR/$PANTHEON_BACKDROP_NAME" ]; then
    run foo
    [ "$status" -eq 0 ]
  else
    skip "OK"
  fi
}
@test "Check that we can run '$KBOX destroy' without an error." {
  $KBOX $PANTHEON_BACKDROP_NAME destroy -- -y
}
@test "Check that the app's directory was removed." {
  if [ -d "$KBOX_APP_DIR/$PANTHEON_BACKDROP_NAME" ]; then
    run foo
    [ "$status" -eq 0 ]
  else
    skip "OK"
  fi
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_BACKDROP_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
