#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Correctly map users
echo "Remapping permissions for VB sharing compat..."
usermod -u "$KALABOX_UID" www-data
groupmod -g "$KALABOX_GID" www-data || usermod -G staff www-data || true

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "/srv/bindings/$PANTHEON_BINDING" || true
ln -s /media "/srv/bindings/$PANTHEON_BINDING/files" || true

# Make sure we have correct ownership
chown -Rf www-data:www-data /code || true
chown -Rf www-data:www-data /media || true
chown -Rf www-data:www-data /php || true

# Run the NGINX
nginx "$@"
