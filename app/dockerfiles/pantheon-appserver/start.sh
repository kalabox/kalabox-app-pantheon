#!/bin/bash

# Set default PHP version for appserver
source /root/.phpbrew/bashrc > /dev/null
phpbrew -d switch ${PHP_VERSION} > /dev/null

# Set up our solr certs
if [ ! -f "/certs/binding.pem" ]; then
  openssl genrsa -out /certs/binding.key 2048 && \
  openssl req -new -x509 -key /certs/binding.key -out /certs/binding.crt -days 365 -subj "/C=US/ST=California/L=Oakland/O=Kalabox/OU=KB/CN=solr.${APPDOMAIN}" && \
  cat /certs/binding.crt /certs/binding.key > /certs/binding.pem
fi

# Make sure our solr certs are whitelisted correctly
if [ ! -d "/usr/share/ca-certificates/solr.${APPDOMAIN}" ]; then
  mkdir /usr/share/ca-certificates/solr.${APPDOMAIN} && \
  cp /certs/binding.crt /usr/share/ca-certificates/solr.${APPDOMAIN}/binding.crt && \
  echo "solr.${APPDOMAIN}/binding.crt" >> /etc/ca-certificates.conf && \
  update-ca-certificates --fresh
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

# Inject dynamic ENV things for our crontab
if [ ! -f "/etc/cron.hourly/drush-cron" ] && [ $FRAMEWORK != "wordpress" ]; then
  cp /src/config/cron/drush-cron /etc/cron.hourly/drush-cron
  sed -i -e "s|REPLACE_HOME|$HOME|g" /etc/cron.hourly/drush-cron
  sed -i -e "s|REPLACE_PATH|$PATH|g" /etc/cron.hourly/drush-cron
  sed -i -e "s|REPLACE_PRESSFLOW_SETTINGS|$PRESSFLOW_SETTINGS|g" /etc/cron.hourly/drush-cron
  sed -i -e "s|REPLACE_DRUSH_VERSION|$DRUSH_VERSION|g" /etc/cron.hourly/drush-cron
  sed -i -e "s|REPLACE_PHP_VERSION|$PHP_VERSION|g" /etc/cron.hourly/drush-cron
  sed -i -e "s|REPLACE_PHPBREW_PATH|$PHPBREW_PATH|g" /etc/cron.hourly/drush-cron
  chmod +x /etc/cron.hourly/drush-cron
fi

# Run all the services
cron
/root/.phpbrew/php/php-${PHP_VERSION}/sbin/php-fpm -R
nginx
