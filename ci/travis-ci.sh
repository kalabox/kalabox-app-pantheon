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
  # Add our key
  if ([ $TRAVIS_BRANCH == "master" ] || [ ! -z "$TRAVIS_TAG" ]) &&
    [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ $TRAVIS_REPO_SLUG == $PLUGIN_REPO ]; then
    openssl aes-256-cbc -K $encrypted_a2b557c750ea_key -iv $encrypted_a2b557c750ea_iv -in ci/travis.id_rsa.enc -out $HOME/.ssh/travis.id_rsa -d
  fi
}

#$ node -pe 'JSON.parse(process.argv[1]).foo' "$(cat foobar.json)"

# before-script
#
# Setup Drupal to run the tests.
#
before-script() {
  npm install -g grunt-cli
  # Upgrade to lastest NPM
  npm install -g npm
}

# script
#
# Run the tests.
#
script() {
  # Code l/hinting and standards
  grunt test
  # @todo clean this up
  EXIT_STATUS=$?
  if [[ $EXIT_STATUS != 0 ]] ; then
    exit $EXIT_STATUS
  fi
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
  if ([ $TRAVIS_BRANCH == "master" ] || [ ! -z "$TRAVIS_TAG" ]) &&
    [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ $TRAVIS_REPO_SLUG == $PLUGIN_REPO ]; then

    # Only do our stuff on the latest node version
    if [ $TRAVIS_NODE_VERSION == "0.12" ] ; then
      # DO VERSION BUMPING FOR KALABOX/KALABOX
      COMMIT_MESSAGE=$(git log --format=%B -n 1)
      BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
      # BUMP patch but only on master and not a tag
      if [ -z "$TRAVIS_TAG" ] && [ $TRAVIS_BRANCH == "master" ] && [ "${COMMIT_MESSAGE}" != "Release v${BUILD_VERSION}" ] ; then
        grunt bump-patch
      fi
      # Get updated build version
      BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")
      chmod 600 $HOME/.ssh/travis.id_rsa

      # SET UP SSH THINGS
      eval "$(ssh-agent)"
      ssh-add $HOME/.ssh/travis.id_rsa
      git config --global user.name "Kala C. Bot"
      git config --global user.email "kalacommitbot@kalamuna.com"

      # RESET UPSTREAM SO WE CAN PUSH VERSION CHANGES TO IT
      # We need to re-add this in because our clone was originally read-only
      git remote rm origin
      git remote add origin git@github.com:$TRAVIS_REPO_SLUG.git
      git checkout $TRAVIS_BRANCH
      git add -A
      if [ -z "$TRAVIS_TAG" ]; then
        git commit -m "KALABOT TWERKING VERSION ${BUILD_VERSION} [ci skip]" --author="Kala C. Bot <kalacommitbot@kalamuna.com>" --no-verify
      fi
      git push origin $TRAVIS_BRANCH

      # DEPLOY OUR BUILD TO NPM
      $HOME/npm-config.sh > /dev/null
      npm publish ./
    fi
  else
    exit $EXIT_VALUE
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
