#!/usr/bin/env bats

#
# Let's load up our ENV
#

#
# Local Dev helpers
#

# Uncomment to override $TRAVIS_BUILD_DIR, useful for local testing
#: ${TRAVIS_BUILD_DIR:=/Users/pirog/Desktop/work/kalabox/node_modules/kalabox-app-pantheon/app}

# Uncomment to set a local $PANTHEON_PASSWORD
#: ${PANTHEON_PASSWORD:=changeme}

# Use `kbox.dev` if it exists, else use the normal `kbox` binary
KBOX=$(which kbox.dev || which kbox)
