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

# Wait until our solr crt is ready and then whitelist it
NEXT_WAIT_TIME=0
until [ -f /certs/binding.crt ] || [ $NEXT_WAIT_TIME -eq 5 ]; do
  echo "Waiting for solr certs to be set up..."
  sleep $(( NEXT_WAIT_TIME++ ))
done
mkdir -p /usr/share/ca-certificates/solr
cp /certs/binding.crt /usr/share/ca-certificates/solr/binding.crt
echo "solr/binding.crt" >> /etc/ca-certificates.conf
update-ca-certificates --fresh

# Run fpm with command options
php-fpm "$@"
