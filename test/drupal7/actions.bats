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
# Create test
#

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
