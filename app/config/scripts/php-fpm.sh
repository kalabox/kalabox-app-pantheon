#!/bin/bash
set -e

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "/srv/bindings/$PANTHEON_BINDING" || true
ln -s /media "/srv/bindings/$PANTHEON_BINDING/files" || true

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
