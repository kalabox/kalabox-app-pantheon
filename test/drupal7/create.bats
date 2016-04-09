#!/usr/bin/env bats

#
# Basic tests to verify Drupal7 creates
#

# Load up environment
load ../env

# Check to see if our site exists already
NOT_THERE=$("$KBOX" list | grep "$PANTHEON_DRUPAL7_NAME" > /dev/null && echo $? || true)

#
# Setup some things
#
setup() {
  # Create a directory to put our test builds
  mkdir -p "$KBOX_APP_DIR"
}

#
# General create tests
#

# Create a drupal7 site
@test "Create a Pantheon Drupal 7 site without an error." {

  # Run the create command if our site doesn't already exist
  if [ $NOT_THERE != 0 ]; then

    # Create a drupal 7 site
    run $KBOX create pantheon \
      -- \
      --email $PANTHEON_EMAIL \
      --password $PANTHEON_PASSWORD \
      --site $PANTHEON_DRUPAL7_SITE \
      --env $PANTHEON_DRUPAL7_ENV \
      --name $PANTHEON_DRUPAL7_NAME \
      --dir $KBOX_APP_DIR \
      --from $TRAVIS_BUILD_DIR/app

    # Check status code
    [ "$status" -eq 0 ]

  # We already have what we need so lets skip
  else
    skip
  fi

}

# Check that this pantheon site contains the correct containers and they
# are in the correct state
#@test "Check that $PANTHEON_DRUPAL7_SITE_appserver_1 is in the correct state." {
  #$DOCKER inspect "${PANTHEON_DRUPAL7_SITE}_appserver_1"
#}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
