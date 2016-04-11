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
@test "Check that we can run '$KBOX services' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME services
}

#
# Basic interactive action verification
#
#   pull             Pull down new code and optionally data and files.
#   push             Push up new code and optionally data and files.
#
@test "Check that we can run '$KBOX pull' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME pull -- --database $PANTHEON_DRUPAL7_ENV --files $PANTHEON_DRUPAL7_ENV
}
@test "Check that we can run '$KBOX push' without an error." {
  $KBOX $PANTHEON_DRUPAL7_NAME push -- --message "Pushing test commit from build $TRAVIS_COMMIT" --database $PANTHEON_DRUPAL7_ENV --files $PANTHEON_DRUPAL7_ENV
}

#
# Do a deeper dive on some commands
#
#    restart          Stop and then start a running kbox application.
#
# Verify DNS
#
@test "Check that after '$KBOX restart' DNS is set correctly." {
  run \
  $KBOX $PANTHEON_DRUPAL7_NAME restart && \
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:http://${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100 && \
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:https://${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100 && \
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:http://edge.${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100 && \
  $DOCKER exec kalabox_proxy_1 redis-cli -p 8160 lrange frontend:https://edge.${PANTHEON_DRUPAL7_NAME}.kbox 0 5 | grep 10.13.37.100
  [ "$status" -eq 0 ]
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo;
  #$KBOX $PANTHEON_DRUPAL7_NAME destroy -- -y
  #rm -rf $KBOX_APP_DIR
}
