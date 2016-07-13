#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}
: ${KALABOX_SSH_KEY:='pantheon.kalabox.id_rsa'}

# Move any config over and git correct perms
chown -Rf $KALABOX_UID:$KALABOX_GID $HOME

# Add local user to match host
addgroup --force-badname --gecos "" "$KALABOX_GID" > /dev/null || true
adduser --force-badname --quiet --gecos "" --disabled-password --home "$HOME" --gid "$KALABOX_GID" "$KALABOX_UID" > /dev/null

# Make sure we explicitly set the default ssh key
echo -e "Host *\n\tIdentityFile $HOME/.ssh/$KALABOX_SSH_KEY\n" >> "$HOME/.ssh/config"

# Check for an SSH key and make it has the correc permissions
# We need to do this because VB SHARING ON WINDOZE may set the key as
# 777
if [ -f "$HOME/.ssh/$KALABOX_SSH_KEY" ]; then
  chmod 700 $HOME/.ssh
  chmod 600 $HOME/.ssh/$KALABOX_SSH_KEY
  chown -Rf $KALABOX_UID:$KALABOX_UID $HOME/.ssh
fi

# Wait until our solr crt is ready and then whitelist it
# @todo: i wish we had a better way to do this
if [[ "$@" == *"drush search-api"* ]] || [[ "$@" == *"drush solr-"* ]]; then
  NEXT_WAIT_TIME=0
  until [ -f /certs/binding.crt ] || [ $NEXT_WAIT_TIME -eq 5 ]; do
    sleep $(( NEXT_WAIT_TIME++ ))
  done
  mkdir -p /usr/share/ca-certificates/solr
  cp /certs/binding.crt /usr/share/ca-certificates/solr/binding.crt
  echo "solr/binding.crt" >> /etc/ca-certificates.conf
  update-ca-certificates > /dev/null
fi

# Run the command
echo "$KALABOX_UID ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
su -s "/bin/bash" -m -c "$(echo $@)" "$KALABOX_UID"
