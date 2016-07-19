#!/usr/bin/env bats

#
# Local Dev Helpers
#

#
# If we are not on travis we want to emulate
# You will want to set these to values that make sense for your local setup although
# it probably makes the most sense to just do this
#
# before you run tests.
#

# Set some defaults if we are LOCAL
if [ ! $TRAVIS ]; then
  : ${TRAVIS_BUILD_DIR:=$(pwd)}
  : ${TRAVIS_COMMIT:=LOCAL}
fi

# Check to see if we are on Darwin
if [[ $(uname) == "Darwin" ]]; then
  : ${PLATFORM:=Darwin}
elif [[ $(uname) == "Linux" ]]; then
  : ${PLATFORM:=Linux}
else
  : ${PLATFORM:=Windows}
fi

#
# Kbox helpers
#

# Use `kbox.dev` if it exists, else use the normal `kbox` binary
: ${KBOX:=$(which kbox.dev || which kbox)}
: ${KBOX_APP_DIR:=$HOME/kbox_testing/apps}

#
# Docker helpers
#

# The "docker" binary, use `docker-machine ssh Kalabox2` on non-linux
# Check to see if we are on Darwin
if [[ $(uname) == "Darwin" ]]; then
  : ${DOCKER:="/Applications/Kalabox.app/Contents/MacOS/bin/docker-machine ssh Kalabox2 docker"}
elif [[ $(uname) == "Linux" ]]; then
  : ${DOCKER:="/usr/share/kalabox/bin/docker"}
else
  : ${DOCKER:="C:\Program Files\Kalabox\bin\docker"}
fi

#
# Pantheon helpers
#

#
# Uncomment to set a local creds
# It probably makes the most sense to just do this
#
# `export PANTHEON_TOKEN=mytoken`
#
#: ${PANTHEON_TOKEN:=mytoken}

# Location of our dockerfiles
: ${PANTHEON_DOCKERFILES_DIR:=${TRAVIS_BUILD_DIR}/app/dockerfiles/}

# Drupal7
: ${PANTHEON_DRUPAL7_NAME:=pantheonseven}
: ${PANTHEON_DRUPAL7_SITE:=kalabox-drupal7}
: ${PANTHEON_DRUPAL7_ENV:=dev}

# Drupal8
: ${PANTHEON_DRUPAL8_NAME:=pantheoneight}
: ${PANTHEON_DRUPAL8_SITE:=kalabox-drupal8}
: ${PANTHEON_DRUPAL8_ENV:=dev}

# Backdrop
: ${PANTHEON_BACKDROP_NAME:=pantheonbackdrop}
: ${PANTHEON_BACKDROP_SITE:=kalabox-backdrop}
: ${PANTHEON_BACKDROP_ENV:=dev}

# Wordpress
: ${PANTHEON_WORDPRESS_NAME:=pantheonwordpress}
: ${PANTHEON_WORDPRESS_SITE:=kalabox-wordpress}
: ${PANTHEON_WORDPRESS_ENV:=dev}
