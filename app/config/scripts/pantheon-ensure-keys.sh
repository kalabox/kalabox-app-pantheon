#!/bin/bash

set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}
: ${KALABOX_SSH_KEY:='pantheon.kalabox.id_rsa'}

# If we don't have an SSH key already let's create one
if [ ! -f "$HOME/.ssh/$KALABOX_SSH_KEY" ]; then
  ssh-keygen -t rsa -N "" -C "${TERMINUS_USER}.kbox" -f "${HOME}/.ssh/$KALABOX_SSH_KEY"
fi

# Post that key to pantheon
# NOTE: Pantheon is smart and will not add the same key twice
terminus ssh-keys add --file="${HOME}/.ssh/${KALABOX_SSH_KEY}.pub"
