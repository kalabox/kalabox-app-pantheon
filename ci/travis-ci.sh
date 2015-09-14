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
  echo $TRAVIS_TAG
  echo $TRAVIS_BRANCH
  echo $TRAVIS_PULL_REQUEST
  echo $TRAVIS_REPO_SLUG
  echo $TRAVIS_NODE_VERSION
  echo $TRAVIS_BUILD_DIR
  # Add our key
  if [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ -z "$TRAVIS_TAG" ] &&
    [ $TRAVIS_REPO_SLUG == $PLUGIN_REPO ] &&
    [ $TRAVIS_NODE_VERSION == "0.12" ]; then
    openssl aes-256-cbc -K $encrypted_a3de5a85a96e_key -iv $encrypted_a3de5a85a96e_iv -in ci/travis.id_rsa.enc -out $HOME/.ssh/travis.id_rsa -d
  fi
}

# before-script
#
# Setup Drupal to run the tests.
#
before-script() {
  # Global install some npm
  npm install -g grunt-cli
  npm install -g npm
}

# script
#
# Run the tests.
#
script() {
  # Code l/hinting and standards
  run_command grunt test
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
    [ $TRAVIS_NODE_VERSION == "0.12" ]; then

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

    if [ "$TRAVIS_BRANCH" === "master"]; then
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

    # Only do stuff if
    #   1. DISCO_TAG is non-empty
    #   2. Our commit is a tagged commit
    #   3. Our branch name is contained within the tag
    # If this is all true then we want to roll a new package and push up other relevant
    # versioned thing. This gaurantees that we can still tag things without setting off a build/deploy
    if [ ! -z "$DISCO_TAG" ] && [[ ! "$DISCO_TAG" =~ "~" ]] && [[ "$DISCO_TAG" =~ "$TRAVIS_BRANCH" ]]; then

      # Split our package version and tag into arrays so we can make sure our tag is larger
      # than the package version
      IFS='.' read -a BUILD_ARRAY <<< "$BUILD_VERSION"
      IFS='.' read -a DISCO_ARRAY <<< "$DISCO_TAG"

      # Build and deploy packages only in the two scenarios
      #   1. If our minor versions are the same and the tag patch version is larger
      #   2. If this is a new minor version and that minor version is larger than previous minor versions
      if [ "${DISCO_ARRAY[1]}" -gt "${BUILD_ARRAY[1]}" ] ||
        ([ "${DISCO_ARRAY[1]}" -eq "${BUILD_ARRAY[1]}" ] && [ "${DISCO_ARRAY[2]}" -gt "${BUILD_ARRAY[2]}" ]); then

        # DEFINE SOME FUN COMMIT MESSAGE VERBS
        COMMIT_MSG[0]='TWERKING'
        COMMIT_MSG[1]='BUILDING'
        COMMIT_MSG[2]='HYPERSPLICING'
        COMMIT_MSG[3]='RICK ROLLIN'
        COMMIT_MSG[4]='CONSTRUCTING'
        COMMIT_MSG[5]='DECREEING'
        COMMIT_MSG[6]='MOLECULARLY REASSEMBLING'
        COMMIT_MSG[7]='SCRIBING'
        COMMIT_MSG[8]='ROUGH RIDING'
        COMMIT_MSG[9]='LIBERATING'
        MODULUS=${#COMMIT_MSG[@]}
        COMMIT_RANDOM=$((${DISCO_ARRAY[2]}%${MODULUS}))
        COMMIT_MSG=${COMMIT_MSG[COMMIT_RANDOM]}

        # PUSH BACK TO OUR GIT REPO
        # Bump our things and reset tags
        grunt bump-patch

        # Reset upstream tags so we can push our changes to it
        # We need to re-add this in because our clone was originally read-only
        git tag -d $DISCO_TAG
        git push origin :$DISCO_TAG

        # Add all our new code and push reset tag with ci skipping on
        git add --all
        git commit -m "${COMMIT_MSG} VERSION ${DISCO_TAG} [ci skip]" --author="Kala C. Bot <kalacommitbot@kalamuna.com>" --no-verify
        git tag $DISCO_TAG

        # NODE PACKAGES
        # Deploy to NPM
        $HOME/npm-config.sh > /dev/null
        npm publish ./
      fi
    fi

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
