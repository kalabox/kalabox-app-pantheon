#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}
: ${KALABOX_SSH_KEY:='pantheon.kalabox.id_rsa'}

# Add local user to match host
addgroup "$KALABOX_GID" || true
adduser -D -h "$HOME" -G "$KALABOX_GID" "$KALABOX_UID"

# Make sure we explicitly set the default ssh key to be used for all SSH commands to Pantheon endpoints
cat > "$HOME/.ssh/config" <<EOF
Host *drush.in
  User root
  StrictHostKeyChecking no
  IdentityFile $HOME/.ssh/pantheon.kalabox.id_rsa
EOF

# Check for an SSH key and make it has the correc permissions
# We need to do this because VB SHARING ON WINDOZE may set the key as
# 777
if [ -f "$HOME/.ssh/$KALABOX_SSH_KEY" ]; then
  chmod 700 $HOME/.ssh
  chmod 600 $HOME/.ssh/$KALABOX_SSH_KEY
  chown -Rf $KALABOX_UID:$KALABOX_UID $HOME/.ssh
fi

# Run the command
echo "$KALABOX_UID ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
su -m "$KALABOX_UID" -s "/bin/bash" -c "$(echo $@)"
