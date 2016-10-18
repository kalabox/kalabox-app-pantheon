#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}
: ${KALABOX_SSH_KEY:='pantheon.kalabox.id_rsa'}

# Add local user to match host
addgroup "$KALABOX_GID" || true
adduser -D -h "$HOME" -G "$KALABOX_GID" "$KALABOX_UID"
mkdir -p "$HOME/.ssh"

# Make sure we explicitly set the default ssh key to be used for all SSH commands to Pantheon endpoints
cat > "$HOME/.ssh/config" <<EOF
Host *drush.in
  User root
  StrictHostKeyChecking no
  IdentityFile $HOME/.ssh/pantheon.kalabox.id_rsa
EOF

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "/srv/bindings/$PANTHEON_BINDING" || true
ln -s /media "/srv/bindings/$PANTHEON_BINDING/files" || true

# Sync up git perms
/usr/local/bin/ensure-git-dir

# Check for our ssh key and move it over to the correct location
# We need to do this because VB SHARING ON WINDOZE sets the original key to have
# 777 permissions since it is in a shared directory
if [ -f "$HOME/keys/${KALABOX_SSH_KEY}" ]; then
  cp -rf "$HOME/keys/${KALABOX_SSH_KEY}" "$HOME/.ssh/$KALABOX_SSH_KEY"
  chmod 700 "$HOME/.ssh"
  chmod 600 "$HOME/.ssh/$KALABOX_SSH_KEY"
  chown -Rf $KALABOX_UID:$KALABOX_UID "$HOME/.ssh"
fi

# Run the command
echo "$KALABOX_UID ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
su -m "$KALABOX_UID" -s "/bin/bash" -c "$(echo $@)"
