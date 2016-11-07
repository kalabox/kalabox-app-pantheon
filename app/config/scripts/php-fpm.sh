#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Correctly map users
echo "Remapping permissions for VB sharing compat..."
usermod -u "$KALABOX_UID" www-data
usermod -G staff www-data || groupmod -g "$KALABOX_GID" www-data || true

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "/srv/bindings/$PANTHEON_BINDING" || true
ln -s /media "/srv/bindings/$PANTHEON_BINDING/files" || true

# Make sure we have correct ownership
chown -Rf www-data:www-data /code || true
chown -Rf www-data:www-data /media || true
chown -Rf www-data:www-data /php || true

# Additional setup
mkdir -p /src/logs

# Wait until our solr crt is ready and then whitelist it
NEXT_WAIT_TIME=0
until [ -f /certs/solr.crt ] || [ $NEXT_WAIT_TIME -eq 5 ]; do
  echo "Waiting for solr certs to be set up..."
  sleep $(( NEXT_WAIT_TIME++ ))
done
mkdir -p /usr/share/ca-certificates/solr
cp /certs/solr.crt /usr/share/ca-certificates/solr/solr.crt
echo "solr/solr.crt" >> /etc/ca-certificates.conf
update-ca-certificates --fresh

# Run fpm with command options
php-fpm "$@"
