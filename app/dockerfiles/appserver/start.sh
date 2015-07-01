#!/bin/sh

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
