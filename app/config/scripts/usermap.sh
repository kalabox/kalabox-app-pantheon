#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Add local user to match host
addgroup --force-badname --gecos "" "$KALABOX_GID" > /dev/null || true
adduser --force-badname --gecos "" --disabled-password --home "/config" --gid "$KALABOX_GID" "$KALABOX_UID" > /dev/null

# Move any config over and git correct perms
export HOME=/config
chown -Rf $KALABOX_UID:$KALABOX_UID /config

# Run the command
echo "$KALABOX_UID ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
su -s "/bin/bash" -m -c "$(echo $@)" "$KALABOX_UID"
