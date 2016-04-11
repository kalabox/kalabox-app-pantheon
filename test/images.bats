#!/usr/bin/env bats

#
# Tests to build/pull the docker images we ship with this app
#

# Load up environment
load env

# Location of our dockerfiles
PANTHEON_DOCKERFILES_DIR=${TRAVIS_BUILD_DIR}/app/dockerfiles/

# Array of images to build
#
# @todo: sadly i guess you can't do loops in BATS but keeping this here
# to prevent people from trying this in the future
# PANTHEON_IMAGES=( "pantheon-appserver" "pantheon-edge" "pantheon-solr" "terminus" )
#
# See: https://github.com/sstephenson/bats/issues/136
#

# Map build services to image names
PANTHEON_APPSERVER="pantheon-appserver"
PANTHEON_EDGE="pantheon-edge"
PANTHEON_SOLR="pantheon-solr"
PANTHEON_TERMINUS="terminus"

# Map pull services to repo/image:tag names
#
# @todo: eventually we want to build these as well
#
# See: https://github.com/kalabox/kalabox/issues/1174
#
PANTHEON_DATA="busybox"
PANTHEON_DB="mariadb:5.5"
PANTHEON_REDIS="redis:2.8"
PANTHEON_CLI="kalabox/cli:stable"

# Check that we can pull the $PANTHEON_DATA image without an error.
@test "Check that we can pull the busybox image without an error." {
  run $DOCKER pull $PANTHEON_DATA
  [ "$status" -eq 0 ]
}

# Check that we can pull the $PANTHEON_DB image without an error.
@test "Check that we can pull the db image without an error." {
  run $DOCKER pull $PANTHEON_DB
  [ "$status" -eq 0 ]
}

# Check that we can pull the $PANTHEON_REDIS image without an error.
@test "Check that we can pull the redis image without an error." {
  run $DOCKER pull $PANTHEON_REDIS
  [ "$status" -eq 0 ]
}

# Check that we can pull the $PANTHEON_CLI image without an error.
@test "Check that we can pull the cli image without an error." {
  run $DOCKER pull $PANTHEON_CLI
  [ "$status" -eq 0 ]
}

# Check that we can build $PANTHEON_APPSERVER without an error.
@test "Check that we can build the appserver image without an error." {
  run $DOCKER build -t kalabox/$PANTHEON_APPSERVER:dev $PANTHEON_DOCKERFILES_DIR/$PANTHEON_APPSERVER
  [ "$status" -eq 0 ]
}

# Check that we can build $PANTHEON_EDGE without an error.
@test "Check that we can build the edge image without an error." {
  run $DOCKER build -t kalabox/$PANTHEON_EDGE:dev $PANTHEON_DOCKERFILES_DIR/$PANTHEON_EDGE
  [ "$status" -eq 0 ]
}

# Check that we can build $PANTHEON_SOLR without an error.
@test "Check that we can build the solr image without an error." {
  # skip "https://archive.apache.org/dist/lucene/solr/3.6.2/apache-solr-3.6.2.tgz is currently down for maintenance."
  run $DOCKER build -t kalabox/$PANTHEON_SOLR:dev $PANTHEON_DOCKERFILES_DIR/$PANTHEON_SOLR
  [ "$status" -eq 0 ]
}

# Check that we can build $PANTHOEN_TERMINUS without an error.
@test "Check that we can build the terminus image without an error." {
  run $DOCKER build -t kalabox/$PANTHEON_TERMINUS:dev $PANTHEON_DOCKERFILES_DIR/$PANTHEON_TERMINUS
  [ "$status" -eq 0 ]
}
