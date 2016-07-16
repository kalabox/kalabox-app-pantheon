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

  # Versions to check
  BOWER_VERSION=1.7
  COMPOSER_VERSION=1.1
  DRUSH_VERSION=8.
  GIT_VERSION=2.6
  GRUNT_VERSION=0.1
  GULP_VERSION=1.2
  MYSQL_CLIENT_VERSION=14.
  NODE_VERSION=4.4
  NPM_VERSION=2.14
  PHP_VERSION=5.6
  RSYNC_VERSION=3.1
  TERMINUS_VERSION=0.11.2

  # We need to actually go into this app dir until
  # https://github.com/kalabox/kalabox/issues/1221
  # is resolved
  if [ -d "$KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME" ]; then
    cd $KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME
  fi

}

#
# Create tests
#
# NOTE: Let's not use any `kbox` commands here if we can. This way
# we aren't getting failed tests because the kbox part of the commands are
# failing vs the actual passed through commands aka
#
# BAD   : $KBOX git status
# GOOD  : $DOCKER exec ${PANTHEON_DRUPAL7_NAME}_appserver_1 mysql -e 'SHOW TABLES;' pantheon
#

#
# Create a drupal7 site
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
# Verify that services are all in the correct state
#

#
# Check that the data container exists and is in the correct state.
#
@test "Check that the data container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_data_1 | grep "\"Status\": \"exited\""
}

#
# Check that the terminus container exists and is in the correct state.
#
@test "Check that the terminus container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_terminus_1 | grep "\"Status\": \"exited\""
}

#
# Check that the terminus container exists and is in the correct state.
#
@test "Check that the cli container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_cli_1 | grep "\"Status\": \"exited\""
}

#
# Check that the appserver container exists and is in the correct state.
#
@test "Check that the appserver container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_appserver_1 | grep "\"Status\": \"running\""
}

#
# Check that the db container exists and is in the correct state.
#
@test "Check that the db container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_db_1 | grep "\"Status\": \"running\""
}

#
# Check that the edge container exists and is in the correct state.
#
@test "Check that the edge container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_edge_1 | grep "\"Status\": \"running\""
}

#
# Check that the solr container exists and is in the correct state.
#
@test "Check that the solr container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_solr_1 | grep "\"Status\": \"running\""
}

#
# Check that the redis container exists and is in the correct state.
#
@test "Check that the redis container exists and is in the correct state." {
  $DOCKER inspect ${PANTHEON_DRUPAL7_NAME}_redis_1 | grep "\"Status\": \"running\""
}

#
# Verify some basic things about the install
#

#
# Check that we have a git repo and its in a good spot
#
@test "Check that site shows up in $KBOX list with correct properties" {

  # Grep a bunch of things
  $KBOX list | grep "\"name\": \"$PANTHEON_DRUPAL7_NAME\""
  $KBOX list | grep "\"url\": \"http://${PANTHEON_DRUPAL7_NAME}.kbox\""
  $KBOX list | grep "\"type\": \"pantheon\""
  $KBOX list | grep "\"version\": \"0.13"
  $KBOX list | grep "\"location\": \"${KBOX_APP_DIR}/${PANTHEON_DRUPAL7_NAME}\""
  $KBOX list | grep "\"running\": true"

}

#
# Check that we have a git repo and its in a good spot
#
@test "Check that we have a git repo and it is in a good state." {
  cd $KBOX_APP_DIR/$PANTHEON_DRUPAL7_NAME/code
  git status
}

#
# Check that we have drupal tables in our database
#
@test "Check that we have tables in our pantheon database." {

  # SKip this test on OSX
  if [ $ON_OSX == true ]; then
    skip "This test currently fails on OSX"
  fi

  # See if we have tables in the PANTHEON database
  $DOCKER exec ${PANTHEON_DRUPAL7_NAME}_appserver_1 mysql -e 'SHOW TABLES;' pantheon

}

#
# Check that files symlink is correct.
#
@test "Check that the files -> /media symlink is correct." {
  $DOCKER exec ${PANTHEON_DRUPAL7_NAME}_appserver_1 ls -lsa /code/sites/default | grep /media
}

#
# Check that our files directory is non-empty
#
@test "Check that our files directory is non-empty." {
  $DOCKER exec ${PANTHEON_DRUPAL7_NAME}_appserver_1 find "/media" -type f;
}

#
# Check that we have the correct DNS entries
#
@test "Check that we have the correct DNS entries." {
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:http://${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:https://${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:http://edge.${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:https://edge.${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100
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

#
# Run `kbox config`
#
@test "Check that we can run '$KBOX config' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME config
}

#
# Run `kbox stop`
#
@test "Check that we can run '$KBOX stop' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME stop
}

#
# Run `kbox start`
#
@test "Check that we can run '$KBOX start' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME start
}

#
# Run `kbox restart`
#
@test "Check that we can run '$KBOX restart' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME restart
}

#
# Run `kbox rebuild`
#
@test "Check that we can run '$KBOX services' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME services
}

#
# Basic interactive action verification
#
#   pull             Pull down new code and optionally data and files.
#   push             Push up new code and optionally data and files.
#

#
# Run `kbox pull`
#
@test "Check that we can run '$KBOX pull' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME pull -- --database $PANTHEON_DRUPAL7_ENV --files $PANTHEON_DRUPAL7_ENV
}

#
# Run `kbox push`
#
@test "Check that we can run '$KBOX push' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME push -- --message "Pushing test commit from build $TRAVIS_COMMIT" --database $PANTHEON_DRUPAL7_ENV --files $PANTHEON_DRUPAL7_ENV
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

#
# BOWER
#
@test "Check that '$KBOX bower' returns the correct major version without an error." {
  run $KBOX bower --version
  [ "$status" -eq 0 ]
  [[ $output == *"$BOWER_VERSION"* ]]
}

#
# COMPOSER
#
@test "Check that '$KBOX composer' returns the correct major version without an error." {
  run $KBOX composer --version
  [ "$status" -eq 0 ]
  [[ $output == *"$COMPOSER_VERSION"* ]]
}

#
# DRUSH
#
@test "Check that '$KBOX drush' returns the correct major version without an error." {
  run $KBOX drush --version
  [ "$status" -eq 0 ]
  [[ $output == *"$DRUSH_VERSION"* ]]
}

#
# GIT
#
@test "Check that '$KBOX git' returns the correct major version without an error." {
  run $KBOX git --version
  [ "$status" -eq 0 ]
  [[ $output == *"$GIT_VERSION"* ]]
}

#
# GRUNT
#
@test "Check that '$KBOX grunt' returns the correct major version without an error." {
  run $KBOX grunt --version
  [ "$status" -eq 0 ]
  [[ $output == *"$GRUNT_VERSION"* ]]
}

#
# GULP
#
@test "Check that '$KBOX gulp' returns the correct major version without an error." {
  run $KBOX gulp --version
  [ "$status" -eq 0 ]
  [[ $output == *"$GULP_VERSION"* ]]
}

#
# MYSQL
#
@test "Check that '$KBOX mysql' returns the correct major version without an error." {
  run $KBOX mysql --version
  [ "$status" -eq 0 ]
  [[ $output == *"$MYSQL_CLIENT_VERSION"* ]]
}

#
# NODE
#
@test "Check that '$KBOX node' returns the correct major version without an error." {
  run $KBOX node --version
  [ "$status" -eq 0 ]
  [[ $output == *"$NODE_VERSION"* ]]
}

#
# NPM
#
@test "Check that '$KBOX npm' returns the correct major version without an error." {
  run $KBOX npm --version
  [ "$status" -eq 0 ]
  [[ $output == *"$NPM_VERSION"* ]]
}

#
# PHP
#
@test "Check that '$KBOX php' returns the correct major version without an error." {
  run $KBOX php --version
  [ "$status" -eq 0 ]
  [[ $output == *"$PHP_VERSION"* ]]
}

#
# RSYNC
#
@test "Check that '$KBOX rsync' returns the correct major version without an error." {
  run $KBOX rsync --version
  [ "$status" -eq 0 ]
  [[ $output == *"$RSYNC_VERSION"* ]]
}

#
# TERMINUS
#
@test "Check that '$KBOX terminus' returns the correct major version without an error." {
  run $KBOX terminus cli version
  [ "$status" -eq 0 ]
  [[ $output == *"$TERMINUS_VERSION"* ]]
}

#
# Basic destroy action verification
#

#
# Try rebuild
#
@test "Check that we can run '$KBOX rebuild' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME rebuild
}

#
# Verify the SSH key and then remove
#
@test "Check that we can remove the SSH key we posted." {

  # Get the fingerprint
  SSH_KEY_FINGERPRINT=$(ssh-keygen -l -f ~/.ssh/pantheon.kalabox.id_rsa.pub | awk -F' ' '{print $2}' | sed 's/://g')

  # Delete the SSH key
  $KBOX terminus ssh-keys delete --fingerprint=$SSH_KEY_FINGERPRINT --yes

}

#
# Attempt the destroy
#
@test "Check that we can run '$KBOX destroy' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  sleep 1
}
