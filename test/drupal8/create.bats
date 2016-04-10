#!/usr/bin/env bats

#
# Basic tests to verify Drupal 8 creates
#
# NOTE: Let's not use any `kbox` commands here if we can. This way
# we aren't getting failed tests because the kbox part of the commands are
# failing vs the actual passed through commands aka
#
# BAD   : $KBOX git status
# GOOD  :
#

# Load up environment
load ../env

# Check to see if our site exists already
EXISTS=$("$KBOX" list | grep "$PANTHEON_DRUPAL8_NAME" > /dev/null && echo $? || true)

#
# Setup some things
#
setup() {
  # Create a directory to put our test builds
  mkdir -p "$KBOX_APP_DIR"
}

#
# Create test
#

# Create a drupal7 site
@test "Create a Pantheon Drupal 8 site without an error." {

  # Run the create command if our site doesn't already exist
  if [ ! $EXISTS ]; then

    # Create a Drupal 8 site
    run $KBOX create pantheon \
      -- \
      --email $PANTHEON_EMAIL \
      --password $PANTHEON_PASSWORD \
      --site $PANTHEON_DRUPAL8_SITE \
      --env $PANTHEON_DRUPAL8_ENV \
      --name $PANTHEON_DRUPAL8_NAME \
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
# Verify that services are all in the correct state
#

# Check that the data container exists and is in the correct state.
@test "Check that the data container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_data_1 | grep "\"Status\": \"exited\""
}

# Check that the terminus container exists and is in the correct state.
@test "Check that the terminus container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_terminus_1 | grep "\"Status\": \"exited\""
}

# Check that the terminus container exists and is in the correct state.
@test "Check that the cli container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_cli_1 | grep "\"Status\": \"exited\""
}

# Check that the appserver container exists and is in the correct state.
@test "Check that the appserver container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_appserver_1 | grep "\"Status\": \"running\""
}

# Check that the db container exists and is in the correct state.
@test "Check that the db container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_db_1 | grep "\"Status\": \"running\""
}

# Check that the edge container exists and is in the correct state.
@test "Check that the edge container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_edge_1 | grep "\"Status\": \"running\""
}

# Check that the solr container exists and is in the correct state.
@test "Check that the solr container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_solr_1 | grep "\"Status\": \"running\""
}

# Check that the redis container exists and is in the correct state.
@test "Check that the redis container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL8_NAME}_redis_1 | grep "\"Status\": \"running\""
}

#
# Verify some basic things about the install
#

# Check that we have a git repo and its in a good spot
@test "Check that site shows up in $KBOX list with correct properties" {

  # Grep a bunch of things
  $KBOX list | grep "\"name\": \"$PANTHEON_DRUPAL8_NAME\""
  $KBOX list | grep "\"url\": \"http://${PANTHEON_DRUPAL8_NAME}.kbox\""
  $KBOX list | grep "\"type\": \"pantheon\""
  $KBOX list | grep "\"version\": \"0.12\""
  $KBOX list | grep "\"location\": \"${KBOX_APP_DIR}/${PANTHEON_DRUPAL8_NAME}\""
  $KBOX list | grep "\"running\": true"

}

# Check that we have a git repo and its in a good spot
@test "Check that we have a git repo and it is in a good state." {
  cd $KBOX_APP_DIR/$PANTHEON_DRUPAL8_NAME/code
  git status
}

# Check that we have drupal tables in our database
@test "Check that we have tables in our pantheon database." {

  # SKip this test on OSX
  if [ $ON_OSX == true ]; then
    skip "This test currently fails on OSX"
  fi

  # See if we have tables in the PANTHEON database
  $DOCKER exec ${PANTHEON_DRUPAL8_NAME}_appserver_1 mysql -e 'SHOW TABLES;' pantheon

}

# Check that files symlink is correct.
@test "Check that the files -> /media symlink is correct." {
  $DOCKER exec ${PANTHEON_DRUPAL8_NAME}_appserver_1 ls -lsa /code/sites/default | grep /media
}

# Check that our files directory is non-empty
@test "Check that our files directory is non-empty." {
  $DOCKER exec ${PANTHEON_DRUPAL8_NAME}_appserver_1 find "/media" -type f;
}

# Check that we have the correct DNS entries
@test "Check that we have the correct DNS entries." {
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:http://${PANTHEON_DRUPAL8_NAME}.kbox 0 5 | grep 10.13.37.100
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:https://${PANTHEON_DRUPAL8_NAME}.kbox 0 5 | grep 10.13.37.100
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:http://edge.${PANTHEON_DRUPAL8_NAME}.kbox 0 5 | grep 10.13.37.100
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:https://edge.${PANTHEON_DRUPAL8_NAME}.kbox 0 5 | grep 10.13.37.100
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_DRUPAL8_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
