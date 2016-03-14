#!/bin/bash

# Grab arguments
# mysql -u pantheon -pPASS -h dbserver.ENV.UUID.drush.in -P 13459 pantheon
ARCHIVE="$1"

if [[ $ARCHIVE == *gz ]]; then
  echo "Extracting ${ARCHIVE}"
  gunzip -df "${ARCHIVE}"
  SUFFIX=".gz"
  SQL=${ARCHIVE%$SUFFIX}
elif [[ $ARCHIVE == *sql ]]; then
  echo "USING EXISTING ${ARCHIVE}"
  SQL=${ARCHIVE}
fi

echo "Importing ${SQL} to db"
mysql -u pantheon -p pantheon -h db -P 3306 pantheon < "${SQL}"

rm -f "${SQL}"
rm -f "${ARCHIVE}"
