#!/usr/bin/env bats

#
# Local Dev Helpers
#

# Uncomment to override $TRAVIS_BUILD_DIR, useful for local testing
: ${TRAVIS_BUILD_DIR:=/Users/pirog/Desktop/work/kalabox-cli/node_modules/kalabox-app-pantheon}

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
if [ -f "$HOME/.kalabox/bin/docker-machine" ]; then
  : ${DOCKER:="$HOME/.kalabox/bin/docker-machine ssh Kalabox2 docker"}
else
  : ${DOCKER:="/usr/share/kalabox/bin/docker"}
fi

#
# Pantheon helpers
#

# Uncomment to set a local $PANTHEON_PASSWORD
# This is set automatically in travis
#: ${PANTHEON_PASSWORD:=changeme}
: ${PANTHEON_EMAIL:=mike@kalabox.io}

# Drupal7
: ${PANTHEON_DRUPAL7_NAME=seven}
: ${PANTHEON_DRUPAL7_SITE=kalabox-drupal7}
: ${PANTHEON_DRUPAL7_ENV=dev}

# Drupal8
: ${PANTHEON_DRUPAL8_NAME=eight}
: ${PANTHEON_DRUPAL8_SITE=kalabox-drupal8}
: ${PANTHEON_DRUPAL8_ENV=dev}

# Backdrop
: ${PANTHEON_BACKDROP_NAME=backdrop}
: ${PANTHEON_BACKDROP_SITE=kalabox-backdrop}
: ${PANTHEON_BACKDROP_ENV=dev}

# Wordpress
: ${PANTHEON_WORDPRESS_NAME=backdrop}
: ${PANTHEON_WORDPRESS_SITE=kalabox-wordpress}
: ${PANTHEON_WORDPRESS_ENV=dev}
