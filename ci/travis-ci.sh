#!/bin/bash

COMMAND=$1
EXIT_VALUE=0
PLUGIN_REPO="kalabox/kalabox-app-pantheon"

##
# SCRIPT COMMANDS
##

# before-install
#
# Do some stuff before npm install
#
before-install() {

  # Gather intel
  echo "TRAVIS_TAG: ${TRAVIS_TAG}"
  echo "TRAVIS_BRANCH: ${TRAVIS_BRANCH}"
  echo "TRAVIS_PULL_REQUEST: ${TRAVIS_PULL_REQUEST}"
  echo "TRAVIS_REPO_SLUG: ${TRAVIS_REPO_SLUG}"
  echo "TRAVIS_BUILD_DIR: ${TRAVIS_BUILD_DIR}"
  echo "TRAVIS_OS_NAME: ${TRAVIS_OS_NAME}"

  echo "PATH: ${PATH}"

  echo "DOCKER_HOST: ${DOCKER_HOST}"

}

# before-script
#
#
before-script() {

  # Global install some npm
  npm install -g grunt-cli
  npm install -g npm

  # Install the app deps
  cd ${TRAVIS_BUILD_DIR}/app
  npm install --production
  cd ${TRAVIS_BUILD_DIR}

  # Install kalabox
  sudo apt-get -y update
  sudo apt-get -y install iptables cgroup-bin bridge-utils curl git
  curl -fsSL -o /tmp/kalabox.deb "http://installer.kalabox.io/kalabox-latest.deb"
  sudo dpkg -i /tmp/kalabox.deb

  # Download latest cli
  sudo curl -fsSL -o /usr/local/bin/kbox "http://cli.kalabox.io/kbox-linux-x64-latest-dev"
  sudo chmod +x /usr/local/bin/kbox

  # Download latest ui
  git clone https://github.com/kalabox/kalabox-ui.git ${TRAVIS_BUILD_DIR}/kalabox-ui
  cd ${TRAVIS_BUILD_DIR}/kalabox-ui
  npm install
  cd ${TRAVIS_BUILD_DIR}
}

# script
#
# Run the tests.
#
script() {

  #
  # Run code tests
  #
  run_command grunt test:code

  #
  # Run all our functional tests
  #

  # Verify install
  run_command grunt test:install
  # Ensure images
  run_command grunt test:images

  # Do the KALABOX_TEST_GROUP
  run_command grunt test:$KALABOX_TEST_GROUP

  # Run protractor tests
  cd ${TRAVIS_BUILD_DIR}/kalabox-ui
  DISPLAY=:99.0 grunt e2e --verbose

}

# after-script
#
# Clean up after the tests.
#
after-script() {
  echo
}

# after-success
#
# Clean up after the tests.
#
after-success() {
  echo
}

# before-deploy
#
# Clean up after the tests.
#
before-deploy() {

  # THis is a production release!
  if [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ ! -z "$TRAVIS_TAG" ] &&
    [ $TRAVIS_REPO_SLUG == "$PLUGIN_REPO" ]; then

    # Do a production build
    grunt pkg
    mkdir -p prod_build
    mv dist/kalabox-app-pantheon* prod_build/kalabox-app-pantheon-$TRAVIS_TAG.tar.gz

  fi

  # Do the build again for our dev releases
  grunt pkg --dev

  # Rename our build and produce a latest build
  mkdir -p dev_build

  # Rename the build
  cp dist/kalabox-app-pantheon* dev_build/kalabox-app-pantheon-latest.tar.gz

}

# after-deploy
#
# Clean up after the tests.
#
after-deploy() {
  echo
}

##
# UTILITY FUNCTIONS:
##

# Sets the exit level to error.
set_error() {
  EXIT_VALUE=1
  echo "$@"
}

# Runs a command and sets an error if it fails.
run_command() {
  set -xv
  if ! $@; then
    set_error
  fi
  set +xv
}

##
# SCRIPT MAIN:
##

# Capture all errors and set our overall exit value.
trap 'set_error' ERR

# We want to always start from the same directory:
cd $TRAVIS_BUILD_DIR

case $COMMAND in
  before-install)
    run_command before-install
    ;;

  before-script)
    run_command before-script
    ;;

  script)
    run_command script
    ;;

  after-script)
    run_command after-script
    ;;

  after-success)
    run_command after-success
    ;;

  before-deploy)
    run_command before-deploy
    ;;

  after-deploy)
    run_command after-deploy
    ;;
esac

exit $EXIT_VALUE
