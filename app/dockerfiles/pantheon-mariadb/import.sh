#!/bin/bash

SQL_ARCHIVE="$1"
echo "Extracting ${SQL_ARCHIVE}"
gunzip -df ${SQL_ARCHIVE}

# @todo: Handle difference formats?
# @todo: Handle different DBs?
SUFFIX=".gz"
SQL_DUMP=${SQL_ARCHIVE%$SUFFIX}
echo "Importing ${SQL_DUMP}"
mysql -u pantheon pantheon < ${SQL_DUMP}
