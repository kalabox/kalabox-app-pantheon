#!/usr/bin/env bats

#
# Basic tests to verify Drupal7 creates
#

# Load up environment
load env

#
# Setup some things
#
setup() {

  # Create a directory to put our test builds
  mkdir -p "$KBOX_APP_DIR"

  # We need to actually go into this app dir until
  # https://github.com/kalabox/kalabox/issues/1221
  # is resolved
  if [ -d "$KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME" ]; then
    cd $KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME
  fi
}

#
# Create a D7 Site for our purposes
#
@test "Create a Pantheon Drupal 7 site without an error." {

  # Check to see if our site exists already
  D7_SITE_EXISTS=$("$KBOX" list | grep "$PANTHEON_DRUPAL7_NAME" > /dev/null && echo $? || true)

  # Run the create command if our site doesn't already exist
  if [ ! $D7_SITE_EXISTS ]; then

    # Create a D7 site
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
    skip "Looks like we already have a D7 site ready to go!"
  fi

}

#
# Redis tests
#

#
# Check that the redis ext exists in the terminus container
#
@test "Check that the redis php extension exists in the terminus container." {
  $DOCKER run --entrypoint php kalabox/terminus:dev -m | grep redis
}

#
# Check that the redis class exists in the terminus container
#
@test "Check that the redis php class exists in the terminus container." {

  # SKip this test on OSX
  if [ $ON_OSX == true ]; then
    skip "This test currently fails on OSX"
  fi

  $DOCKER run --entrypoint php kalabox/terminus:dev -r "new Redis();"
}

#
# Check that we can run a drush command with redis enabled
#
@test "Check that we can run a drush command with redis enabled." {

  # Install redis
  $KBOX drush dl redis-7.x-2.15 -y

  # Move over the settings file
  cp -f $TRAVIS_BUILD_DIR/test/fixtures/drupal7-redis-settings.php $KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME/code/sites/default/settings.php

  # Enable Redis
  $KBOX drush en redis -y

  # Run another drush command
  run $KBOX drush status

  # Check status code
  [ "$status" -eq 0 ]
  [[ $output != *"Fatal error: Class 'Redis' not found"* ]]

}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  sleep 1
}
