#!/bin/bash

set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Set potentially rooted perms back to the correct owner
sudo chown $KALABOX_UID:$KALABOX_GID -R /code/.git
