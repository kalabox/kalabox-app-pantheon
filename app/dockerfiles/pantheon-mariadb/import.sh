#!/bin/bash

# Grab arguments
# mysql -u pantheon -pPASS -h dbserver.ENV.UUID.drush.in -P 13459 pantheon
DB_HOST="$1"
DB_PASSWORD="$2"
DB_PORT="$3"
ARCHIVE="$4"

# @todo: Handle different DBs?
echo "Importing ${ARCHIVE} to ${DB_HOST}"

# Use password option if password is specified.
OPT_DB_PASSWORD=""
if [ ! -z "$DB_PASSWORD" ]; then
  OPT_DB_PASSWORD="-p${DB_PASSWORD} "
fi

MYSQL_OPTS="-u pantheon ${OPT_DB_PASSWORD}-h ${DB_HOST} -P ${DB_PORT} pantheon"

# "Switch" on file extension
# @todo: Handle different formats?
if [[ $ARCHIVE == *gz ]]; then
  gzip -cd "${ARCHIVE}" | mysql $MYSQL_OPTS
elif [[ $ARCHIVE == *sql ]]; then
  mysql $MYSQL_OPTS < "${ARCHIVE}"
fi

rm -f "${ARCHIVE}"
