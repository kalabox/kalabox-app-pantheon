#!/bin/bash

# Grab arguments
# mysql -u pantheon -pPASS -h dbserver.ENV.UUID.drush.in -P 13459 pantheon
DB_HOST="$1"
DB_PASSWORD="$2"
DB_PORT="$3"
ARCHIVE="$4"

# @todo: Handle difference formats?
# [[ $a == z* ]]
if [[ $ARCHIVE == *gz ]]; then
  echo "Extracting ${ARCHIVE}"
  gunzip -df "${ARCHIVE}"
  SUFFIX=".gz"
  SQL=${ARCHIVE%$SUFFIX}
elif [[ $ARCHIVE == *sql ]]; then
  echo "USING EXISTING ${ARCHIVE}"
  SQL=${ARCHIVE}
fi

# @todo: Handle different DBs?

echo "Importing ${SQL} to ${DB_HOST}"
if [ -z "$DB_PASSWORD" ]; then
  mysql -u pantheon -h "${DB_HOST}" -P "${DB_PORT}" pantheon < "${SQL}"
else
  mysql -u pantheon -p"${DB_PASSWORD}" -h "${DB_HOST}" -P "${DB_PORT}" pantheon < "${SQL}"
fi

rm -f "${SQL}"
