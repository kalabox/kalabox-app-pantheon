#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Do this so our mounted VB volumes work
# @todo: silent fail perm setting?
echo "Remapping apache permissions for VB sharing compat..."
usermod -u "$KALABOX_UID" www-data
groupmod -g "$KALABOX_GID" www-data || usermod -G staff www-data
chown -Rf www-data:www-data /code
chown -Rf www-data:www-data /media

# Set up our certs for ssl termination with nginx
if [ ! -f "/certs/appserver.pem" ]; then
  openssl genrsa -out /certs/appserver.key 2048 && \
  openssl req -new -x509 -key /certs/appserver.key -out /certs/appserver.crt -days 365 -subj "/C=US/ST=California/L=San Francisco/O=Kalabox/OU=KB/CN=appserver" && \
  cat /certs/appserver.crt /certs/appserver.key > /certs/appserver.pem
fi

# Set up our solr certs
if [ ! -f "/certs/binding.pem" ]; then
  openssl genrsa -out /certs/binding.key 2048 && \
  openssl req -new -x509 -key /certs/binding.key -out /certs/binding.crt -days 365 -subj "/C=US/ST=California/L=San Francisco/O=Kalabox/OU=KB/CN=solr" && \
  cat /certs/binding.crt /certs/binding.key > /certs/binding.pem
fi

# Make sure our solr certs are whitelisted correctly
if [ ! -d "/usr/share/ca-certificates/solr" ]; then
  mkdir /usr/share/ca-certificates/solr && \
  cp /certs/binding.crt /usr/share/ca-certificates/solr/binding.crt && \
  echo "solr/binding.crt" >> /etc/ca-certificates.conf && \
  update-ca-certificates --fresh
fi

# Run all the services
cron
/root/.phpbrew/php/${PHPBREW_PHP}/sbin/php-fpm -R
nginx
