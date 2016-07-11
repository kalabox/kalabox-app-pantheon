#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Correctly map users
echo "Remapping permissions for VB sharing compat..."
usermod -u "$KALABOX_UID" www-data
usermod -G staff www-data || groupmod -g "$KALABOX_GID" www-data || true

# Make sure we have correct ownership
chown -Rf www-data:www-data /code
chown -Rf www-data:www-data /media
chown -Rf www-data:www-data /php

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "$HOME" || true

# Additional setup
mkdir -p /src/logs

# Run fpm with command options
php-fpm "$@"
