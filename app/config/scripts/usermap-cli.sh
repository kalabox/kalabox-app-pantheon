#!/bin/bash
set -e

# Set defaults
: ${KALABOX_SSH_KEY:='pantheon.kalabox.id_rsa'}

# Add local user to match host
mkdir -p "/home/root/.ssh"
mkdir -p "/root/.ssh"

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "/srv/bindings/$PANTHEON_BINDING" || true
ln -s /media "/srv/bindings/$PANTHEON_BINDING/files" || true

# Make sure we explicitly set the default ssh key to be used for all SSH commands to Pantheon endpoints
cat > "/root/.ssh/config" <<EOF
Host *drush.in
  User root
  StrictHostKeyChecking no
  IdentityFile /root/.ssh/pantheon.kalabox.id_rsa
EOF

# Check for our ssh key and move it over to the correct location
# We need to do this because VB SHARING ON WINDOZE sets the original key to have
# 777 permissions since it is in a shared directory
if [ -f "/home/root/keys/${KALABOX_SSH_KEY}" ]; then
  cp -rf "/home/root/keys/${KALABOX_SSH_KEY}" "/root/.ssh/$KALABOX_SSH_KEY"
  chmod 700 "/root/.ssh"
  chmod 600 "/root/.ssh/$KALABOX_SSH_KEY"
  chown -Rf root:root "/root/.ssh"
fi

# Run the command
su -m root -s "/bin/bash" -c "$(echo $@)"
