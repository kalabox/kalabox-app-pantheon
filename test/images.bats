#!/usr/bin/env bats

#
# Tests to build/pull the docker images we ship with this app
#

# Load up environment
load env

#
# Setup some things
#
setup() {
  echo
}

#
# Function to rety docker builds if they fail
#
kbox-retry-build() {

  # Get args
  IMAGE=$1
  TAG=$2
  DOCKERFILE=$3

  # Try a few times
  NEXT_WAIT_TIME=0
  until $DOCKER build -t $IMAGE:$TAG $DOCKERFILE || [ $NEXT_WAIT_TIME -eq 10 ]; do
    sleep $(( NEXT_WAIT_TIME++ ))
  done

  # If our final try has been met we assume failure
  #
  # @todo: this can be better since this could false negative
  #        on the final retry
  #
  if [ $NEXT_WAIT_TIME -eq 10 ]; then
    exit 666
  fi

}

# Array of images to build
#
# @todo: sadly i guess you can't do loops in BATS but keeping this here
# to prevent people from trying this in the future
# PANTHEON_IMAGES=( "pantheon-appserver" "pantheon-edge" "pantheon-solr" "terminus" )
#
# See: https://github.com/sstephenson/bats/issues/136
#

# Check that we can build the data image without an error.
@test "Check that we can build the data image without an error." {
  run kbox-retry-build busybox latest $PANTHEON_DOCKERFILES_DIR/data
  [ "$status" -eq 0 ]
}

# Check that we can build the db image without an error.
@test "Check that we can build the db image without an error." {
  run kbox-retry-build mariadb 5.5 $PANTHEON_DOCKERFILES_DIR/db
  [ "$status" -eq 0 ]
}

# Check that we can build the redis image without an error.
@test "Check that we can build the redis image without an error." {
  run kbox-retry-build redis 2.8 $PANTHEON_DOCKERFILES_DIR/redis
  [ "$status" -eq 0 ]
}

# Check that we can build the cli image without an error.
@test "Check that we can build the cli image without an error." {
  IMAGE=cli
  run kbox-retry-build kalabox/$IMAGE stable $PANTHEON_DOCKERFILES_DIR/$IMAGE
  [ "$status" -eq 0 ]
}

# Check that we can build the nginx image without an error.
@test "Check that we can build the nginx image without an error." {
  IMAGE=nginx
  run kbox-retry-build kalabox/$IMAGE stable $PANTHEON_DOCKERFILES_DIR/$IMAGE
  [ "$status" -eq 0 ]
}

# Check that we can build 5.3 appserver without an error.
@test "Check that we can build the php 5.3 appserver image without an error." {
  IMAGE=pantheon-appserver
  TAG=53
  run kbox-retry-build kalabox/$IMAGE $TAG $PANTHEON_DOCKERFILES_DIR/$IMAGE/$TAG
  [ "$status" -eq 0 ]
}

# Check that the he php 5.3 image has the correct PHP extensions.
@test "Check that the php 5.3 image has the correct PHP extensions." {
  IMAGE=pantheon-appserver
  TAG=53
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "apc" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "curl" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "gd" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imagick" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "ldap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mbstring" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mcrypt" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mysqli" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "pdo_mysql" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "redis" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "xdebug" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "zip"
}

# Check that the php 5.3 image has the convert binary.
@test "Check that the php 5.3 image has the convert binary." {
  IMAGE=pantheon-appserver
  TAG=53
  $DOCKER run kalabox/$IMAGE:$TAG which convert
}

# Check that we can build appserver without an error.
@test "Check that we can build the php 5.5 appserver image without an error." {
  IMAGE=pantheon-appserver
  TAG=55
  run kbox-retry-build kalabox/$IMAGE $TAG $PANTHEON_DOCKERFILES_DIR/$IMAGE/$TAG
  [ "$status" -eq 0 ]
}

# Check that the he php 5.5 image has the correct PHP extensions.
@test "Check that the php 5.5 image has the correct PHP extensions." {
  IMAGE=pantheon-appserver
  TAG=55
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "curl" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "gd" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imagick" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "ldap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mbstring" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mcrypt" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mysqli" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "OAuth" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "pdo_mysql" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "redis" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "xdebug" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "Zend OPcache" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "zip"
}

# Check that the he php 5.5 image has the convert binary.
@test "Check that the php 5.5 image has the convert binary." {
  IMAGE=pantheon-appserver
  TAG=55
  $DOCKER run kalabox/$IMAGE:$TAG which convert
}

# Check that we can build appserver without an error.
@test "Check that we can build the php 5.6 appserver image without an error." {
  IMAGE=pantheon-appserver
  TAG=56
  run kbox-retry-build kalabox/$IMAGE $TAG $PANTHEON_DOCKERFILES_DIR/$IMAGE/$TAG
  [ "$status" -eq 0 ]
}

# Check that the he php 5.6 image has the correct PHP extensions.
@test "Check that the php 5.6 image has the correct PHP extensions." {
  IMAGE=pantheon-appserver
  TAG=56
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "curl" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "gd" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imagick" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "ldap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mbstring" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mcrypt" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mysqli" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "OAuth" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "pdo_mysql" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "redis" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "xdebug" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "Zend OPcache" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "zip"
}

# Check that the he php 5.6 image has the convert binary.
@test "Check that the php 5.6 image has the convert binary." {
  IMAGE=pantheon-appserver
  TAG=56
  $DOCKER run kalabox/$IMAGE:$TAG which convert
}

# Check that we can build appserver without an error.
@test "Check that we can build the php 7.0 appserver image without an error." {
  IMAGE=pantheon-appserver
  TAG=70
  run kbox-retry-build kalabox/$IMAGE $TAG $PANTHEON_DOCKERFILES_DIR/$IMAGE/$TAG
  [ "$status" -eq 0 ]
}

# Check that the he php 7.0 image has the correct PHP extensions.
@test "Check that the php 7.0 image has the correct PHP extensions." {
  IMAGE=pantheon-appserver
  TAG=70
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "curl" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "gd" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imagick" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "imap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "ldap" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mbstring" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mcrypt" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "mysqli" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "OAuth" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "pdo_mysql" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "redis" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "xdebug" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "Zend OPcache" && \
  $DOCKER run kalabox/$IMAGE:$TAG php-fpm -m | grep "zip"
}

# Check that the he php 7.0 image has the convert binary.
@test "Check that the php 7.0 image has the convert binary." {
  IMAGE=pantheon-appserver
  TAG=70
  $DOCKER run kalabox/$IMAGE:$TAG which convert
}

# Check that we can build the edge image without an error.
@test "Check that we can build the edge image without an error." {
  IMAGE=pantheon-edge
  run kbox-retry-build kalabox/$IMAGE stable $PANTHEON_DOCKERFILES_DIR/$IMAGE
  [ "$status" -eq 0 ]
}

# Check that we can build the solr image without an error.
@test "Check that we can build the solr image without an error." {
  IMAGE=pantheon-solr
  run kbox-retry-build kalabox/$IMAGE stable $PANTHEON_DOCKERFILES_DIR/$IMAGE
  [ "$status" -eq 0 ]
}

# Check that we can build $PANTHOEN_TERMINUS without an error.
@test "Check that we can build the terminus image without an error." {
  IMAGE=terminus
  run kbox-retry-build kalabox/$IMAGE 0.11.2 $PANTHEON_DOCKERFILES_DIR/$IMAGE
  [ "$status" -eq 0 ]
}

#
# BURN IT TO THE GROUND!!!!
# Add a small delay before we run other things
#
teardown() {
  sleep 1
}
