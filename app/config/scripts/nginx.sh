#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Correctly map users
echo "Remapping permissions for VB sharing compat..."
usermod -u "$KALABOX_UID" www-data
groupmod -g "$KALABOX_GID" www-data || usermod -G staff www-data

# Make sure we have correct ownership
chown -Rf www-data:www-data /code
chown -Rf www-data:www-data /media
chown -Rf www-data:www-data /php

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "$HOME" || true

# Set up our certs for the appserver with nginx
if [ ! -f "/certs/appserver.pem" ]; then
  openssl genrsa -out /certs/appserver.key 2048 && \
  openssl req -new -x509 -key /certs/appserver.key -out /certs/appserver.crt -days 365 -subj "/C=US/ST=California/L=San Francisco/O=Kalabox/OU=KB/CN=appserver" && \
  cat /certs/appserver.crt /certs/appserver.key > /certs/appserver.pem
fi

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

# Run the NGINX
nginx "$@"
