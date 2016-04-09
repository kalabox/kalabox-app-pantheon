#!/usr/bin/env bats

#
# Basic tests to verify Drupal7 creates
#

# Load up environment
load ../env

#
# Setup some things
#
setup() {
  mkdir -p "$KBOX_APP_DIR"
}

#
# General create tests
#

# Create a drupal7 site
@test "Create a Pantheon Drupal 7 site without an error." {

  # Run the create command
  $KBOX create pantheon \
    -- \
    --email $PANTHEON_EMAIL \
    --password $PANTHEON_PASSWORD \
    --site $PANTHEON_DRUPAL7_SITE \
    --env $PANTHEON_DRUPAL7_ENV \
    --name $PANTHEON_DRUPAL7_NAME \
    --dir $KBOX_APP_DIR \
    --from $TRAVIS_BUILD_DIR/app

}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
