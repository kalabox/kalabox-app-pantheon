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

  # Add our key
  if [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ -z "$TRAVIS_TAG" ] &&
    [ $TRAVIS_REPO_SLUG == $PLUGIN_REPO ] &&
    [ $TRAVIS_NODE_VERSION == "4.2" ]; then
    openssl aes-256-cbc -K $encrypted_a3de5a85a96e_key -iv $encrypted_a3de5a85a96e_iv -in ci/travis.id_rsa.enc -out $HOME/.ssh/travis.id_rsa -d
  fi
}

# before-script
#
#
before-script() {

  # Global install some npm
  npm install -g grunt-cli
  npm install -g npm

  # Install kalabox
  sudo apt-get -y update
  sudo apt-get -y install iptables cgroup-lite bridge-utils curl
  curl -fsSL -o /tmp/kalabox.deb "http://installer.kalabox.io/kalabox-latest.deb"
  sudo dpkg -i /tmp/kalabox.deb

  # Download latest cli
  sudo curl -fsSL -o /usr/local/bin/kbox "http://cli.kalabox.io/kbox-linux-x64-latest-dev"
  sudo chmod +x /usr/local/bin/kbox

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

  # Do basic tests for each framework
  run_command grunt test:drupal7

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
  # Check for correct travis conditions aka
  # 1. Is not a pull request
  # 2. Is not a "travis" tag
  # 3. Is correct slug
  # 4. Is latest node version
  if [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ -z "$TRAVIS_TAG" ] &&
    [ $TRAVIS_REPO_SLUG == $PLUGIN_REPO ] &&
    [ $TRAVIS_NODE_VERSION == "4.2" ]; then

    # Try to grab our git tag
    DISCO_TAG=$(git describe --contains HEAD)
    echo $DISCO_TAG
    # Grab our package.json version
    BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
    echo $BUILD_VERSION

    # SET UP SSH THINGS
    eval "$(ssh-agent)"
    chmod 600 $HOME/.ssh/travis.id_rsa
    ssh-add $HOME/.ssh/travis.id_rsa
    git config --global user.name "Kala C. Bot"
    git config --global user.email "kalacommitbot@kalamuna.com"

    # Reset upstream so we can push our changes to it
    # We need to re-add this in because our clone was originally read-only
    git remote rm origin
    git remote add origin git@github.com:$TRAVIS_REPO_SLUG.git
    git checkout $TRAVIS_BRANCH

    if [ -z "$DISCO_TAG" ]; then
      # If we are on the master branch then we need to grab the dev
      # releases of packages when we build our app deps later on
      export KALABOX_DEV=true
      echo $KALABOX_DEV
    fi

    # Go into app and build out the deps so all kalabox needs to do is grab the
    # package and extract without doing messy things like npm install frmo kbox
    cd $TRAVIS_BUILD_DIR/app
    rm -rf node_modules
    npm install --production
    cd $TRAVIS_BUILD_DIR

    # Commit our new app deps
    git add --all
    git commit -m "BUILT OUT APP DEPS [ci skip]" --author="Kala C. Bot <kalacommitbot@kalamuna.com>" --no-verify

    # Push up our generated app deps plus a tag if we also have a new version
    git push origin $TRAVIS_BRANCH --tags

  fi
}

# before-deploy
#
# Clean up after the tests.
#
before-deploy() {
  echo
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
