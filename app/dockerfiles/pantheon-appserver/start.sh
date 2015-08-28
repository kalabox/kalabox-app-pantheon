#!/bin/sh

# Set up our solr certs
# @todo: lots of clean up to do here
if [ ! -f "/certs/binding.pem" ]; then
  openssl genrsa -out /certs/binding.key 2048 && \
  openssl req -new -x509 -key /certs/binding.key -out /certs/binding.crt -days 365 -subj "/C=US/ST=California/L=Oakland/O=Kalabox/OU=KB/CN=solr.${APPDOMAIN}" && \
  cat /certs/binding.crt /certs/binding.key > /certs/binding.pem && \
  mkdir /usr/share/ca-certificates/solr.${APPDOMAIN} && \
  cp /certs/binding.crt /usr/share/ca-certificates/solr.${APPDOMAIN}/binding.crt && \
  echo "solr.${APPDOMAIN}/binding.crt" >> /etc/ca-certificates.conf && \
  update-ca-certificates --fresh
fi

# Set up our appserver certs
# @todo: lots of clean up to do here
if [ ! -f "/certs/appserver.pem" ]; then
  openssl genrsa -out /certs/appserver.key 2048 && \
  openssl req -new -x509 -key /certs/appserver.key -out /certs/appserver.crt -days 365 -subj "/C=US/ST=California/L=Oakland/O=Kalabox/OU=KB/CN=${APPDOMAIN}" && \
  cat /certs/appserver.crt /certs/appserver.key > /certs/appserver.pem
fi

# Use the correct site.conf for the framework
# /src/config/nginx/site.conf /etc/nginx/sites-enabled/default
if [ -f "/src/config/nginx/${FRAMEWORK}.conf" ]; then
  rm /etc/nginx/sites-enabled/default
  cp /src/config/nginx/${FRAMEWORK}.conf /etc/nginx/sites-enabled/default
fi

# Move in our custom config files if they exist
# Use our custom www.conf pool for fpm
if [ -f "/src/config/php/www.conf" ]; then
  rm ${HOME}/.phpbrew/php/php-${PHP_VERSION}/etc/php-fpm.conf
  cp /src/config/php/www.conf ${HOME}/.phpbrew/php/php-${PHP_VERSION}/etc/php-fpm.conf
fi

# Use our custom php.ini
if [ -f "/src/config/php/php.ini" ]; then
  rm ${HOME}/.phpbrew/php/php-${PHP_VERSION}/etc/php.ini
  cp /src/config/php/php.ini ${HOME}/.phpbrew/php/php-${PHP_VERSION}/etc/php.ini
fi

# Use our custom apc.ini
if [ -f "/src/config/php/apc.ini" ]; then
  rm ${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/apc.ini
  cp /src/config/php/apc.ini ${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/apc.ini
fi

# Add some xdebug things
# todo: actually check and add lines only if needed
if [ -f "${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/xdebug.ini" ]; then
  sed -i '$a xdebug.remote_host="10.13.37.1"' ${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/xdebug.ini
  sed -i '$a xdebug.remote_enable = 1' ${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/xdebug.ini
  # you need to turn this on if you are not using fpm with a unix socket
  #sed -i '$a xdebug.remote_port = 9001' /root/.phpbrew/php/php-${PHP_VERSION}/var/db/xdebug.ini
fi

# Add some opcache things
# todo: actually check and add lines only if needed
if [ -f "${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/opcache.ini" ]; then
  sed -i '$a opcache.max_accelerated_files = 16229' ${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/opcache.ini
  sed -i '$a opcache.memory_consumption = 256' ${HOME}/.phpbrew/php/php-${PHP_VERSION}/var/db/opcache.ini
fi

/root/.phpbrew/php/php-${PHP_VERSION}/sbin/php-fpm -R
nginx
