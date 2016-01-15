#!/bin/bash

# Grab arguments
DUMPFILE="$1"

mysqldump -h db -u pantheon pantheon > ${DUMPFILE}
