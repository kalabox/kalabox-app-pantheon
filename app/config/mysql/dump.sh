#!/bin/bash

# Grab arguments
DUMPFILE="$1"

mysqldump -h db -u pantheon -ppantheon pantheon > ${DUMPFILE}
