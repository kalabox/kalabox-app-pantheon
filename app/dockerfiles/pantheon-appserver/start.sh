#!/bin/bash

# Run all the services
cron
/root/.phpbrew/php/${PHPBREW_PHP}/sbin/php-fpm -R
nginx
