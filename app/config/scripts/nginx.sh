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

# Set up our certs for the appserver with nginx
if [ ! -f "/certs/appserver.pem" ]; then
  openssl genrsa -out /certs/appserver.key 2048 && \
  openssl req -new -x509 -key /certs/appserver.key -out /certs/appserver.crt -days 365 -subj "/C=US/ST=California/L=San Francisco/O=Kalabox/OU=KB/CN=appserver" && \
  cat /certs/appserver.crt /certs/appserver.key > /certs/appserver.pem
fi

# Run the NGINX
nginx "$@"
