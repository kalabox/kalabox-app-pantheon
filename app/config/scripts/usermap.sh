#!/bin/bash
set -e

# Set defaults
: ${KALABOX_SSH_KEY:='pantheon.kalabox.id_rsa'}

# Add local user to match host
mkdir -p "/home/root/.ssh"
mkdir -p "/root/.ssh"

# Emulate /srv/binding
mkdir -p /srv/bindings
ln -s / "/srv/bindings/$PANTHEON_BINDING" || true
ln -s /media "/srv/bindings/$PANTHEON_BINDING/files" || true

# Make sure we explicitly set the default ssh key to be used for all SSH commands to Pantheon endpoints
cat > "/root/.ssh/config" <<EOF
Host *drush.in
  User root
  StrictHostKeyChecking no
  IdentityFile /root/.ssh/pantheon.kalabox.id_rsa
EOF

# Check for our ssh key and move it over to the correct location
# We need to do this because VB SHARING ON WINDOZE sets the original key to have
# 777 permissions since it is in a shared directory
if [ -f "/home/root/keys/${KALABOX_SSH_KEY}" ]; then
  cp -rf "/home/root/keys/${KALABOX_SSH_KEY}" "/root/.ssh/$KALABOX_SSH_KEY"
  chmod 700 "/root/.ssh"
  chmod 600 "/root/.ssh/$KALABOX_SSH_KEY"
  chown -Rf root:root "/root/.ssh"
fi

# If we have a composer installed drush lets symlink that to a common path
if [ -f "/composer/vendor/drush/drush/drush" ]; then
  ln -sf /composer/vendor/drush/drush/drush /usr/local/bin/drush
fi

# Wait until our solr crt is ready and then whitelist it
# @todo: i wish we had a better way to do this
if [[ "$@" == *"drush search-api"* ]] || [[ "$@" == *"drush solr-"* ]]; then
  NEXT_WAIT_TIME=0
  until [ -f /certs/solr.crt ] || [ $NEXT_WAIT_TIME -eq 5 ]; do
    sleep $(( NEXT_WAIT_TIME++ ))
  done
  mkdir -p /usr/share/ca-certificates/solr
  cp /certs/solr.crt /usr/share/ca-certificates/solr/solr.crt
  echo "solr/solr.crt" >> /etc/ca-certificates.conf
  update-ca-certificates > /dev/null
fi

# Run the command
su -s "/bin/bash" -m -c "$(echo $@)" root
