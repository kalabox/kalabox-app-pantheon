#!/bin/bash

# Remove once terminus 0.9.4 is out

# Terminus requires 5.5.24 now
PHP_VERSION=5.5.24

# Use our custom terminus php.ini We want to use a custom ini here so we can
# set error reporting so that notices are not reported to stderr
if [ -f "/src/config/terminus/php.ini" ]; then
  rm ${HOME}/.phpbrew/php/php-${PHP_VERSION}/etc/php.ini
  cp /src/config/terminus/php.ini ${HOME}/.phpbrew/php/php-${PHP_VERSION}/etc/php.ini
fi

source /root/.phpbrew/bashrc > /dev/null
phpbrew -d switch ${PHP_VERSION} > /dev/null

mkdir -p /usr/local/src/terminus
cd /usr/local/src/terminus
git clone --depth 1 --branch 705-updateWaketoGuzz6 https://github.com/pirog/cli.git .
composer install --no-dev --optimize-autoloader
ln -s /usr/local/src/terminus/bin/terminus /usr/local/bin/terminus
