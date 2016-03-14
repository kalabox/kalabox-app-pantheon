#!/bin/bash

# Grab arguments
# mysql -u pantheon -pPASS -h dbserver.ENV.UUID.drush.in -P 13459 pantheon
MYSQL_CMD="$1"
SQL_FILE="$2"

echo "Exporting ${SQL_FILE} to Pantheon"
${MYSQL_CMD} < "${SQL_FILE}"

rm -f "${SQL_FILE}"
