#!/bin/bash

set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}
: ${KALABOX_SSH_KEY:='pantheon.kalabox.id_rsa'}

# If we don't have an SSH key already let's create one
if [ ! -f "$HOME/keys/${KALABOX_SSH_KEY}" ]; then
  ssh-keygen -t rsa -N "" -C "${TERMINUS_USER}.kbox" -f "$HOME/keys/${KALABOX_SSH_KEY}"
fi

# Post that key to pantheon
# NOTE: Pantheon is smart and will not add the same key twice
terminus ssh-keys add --file="$HOME/keys/${KALABOX_SSH_KEY}.pub"

# Move the SSH key to ROOT just incase we need it
if [ -f "$HOME/keys/${KALABOX_SSH_KEY}" ]; then
  mkdir -p "/root/.ssh"
  cp -rf "$HOME/keys/${KALABOX_SSH_KEY}" "/root/.ssh/$KALABOX_SSH_KEY"
  chmod 700 "/root/.ssh"
  chmod 600 "/root/.ssh/$KALABOX_SSH_KEY"
fi

# Non interctive our SSH usage against pantheon
cat > "/root/.ssh/config" <<EOF
Host *drush.in
  User root
  StrictHostKeyChecking no
  IdentityFile /root/.ssh/pantheon.kalabox.id_rsa
EOF

# If we don't have our dev certs already let's get them
if [ ! -f "/certs/binding.pem" ] || [ ! -f "/certs/binding.crt" ] || [ ! -f "/certs/binding.key" ]; then
  $(terminus site connection-info --field=sftp_command):certs/* /certs
fi
