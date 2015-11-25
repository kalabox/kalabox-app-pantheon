Kalabox Pantheon toolz
===================

Add commands to run terminus, drush and wp-cli

```

# docker build -t kalabox/terminus .
FROM kalabox/pantheon-appserver:v0.10.0

# Remove once terminus 0.9.4 is out
COPY install-terminus.sh /usr/local/bin/install-terminus.sh

# Install all the CLI magic
RUN \
  git clone --depth 1 --branch 5.11.0 https://github.com/drush-ops/drush.git /usr/local/src/drush5 && \
  git clone --depth 1 --branch 6.6.0 https://github.com/drush-ops/drush.git /usr/local/src/drush6 && \
  ln -s /usr/local/src/drush5/drush /usr/bin/drush5 && \
  ln -s /usr/local/src/drush6/drush /usr/bin/drush6 && \
  curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
  chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp && \
  # We are going to roll our own terminus until 0.9.4 is out.
  # curl https://github.com/pantheon-systems/cli/releases/download/0.9.3/terminus.phar -L -o /usr/local/bin/terminus && \
  # chmod +x /usr/local/bin/terminus && \
  chmod +x /usr/local/bin/install-terminus.sh && sleep 5 && \
  /usr/local/bin/install-terminus.sh && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

# Set up our kalabox specific stuff
COPY kdrush /usr/local/bin/kdrush
COPY kterminus /usr/local/bin/kterminus
COPY kwp /usr/local/bin/kwp
COPY ssh-config /root/.ssh/config

# Set default env
ENV PHP_VERSION 5.3.29
ENV DRUSH_VERSION drush6
ENV SSH_KEY id_rsa

# Set up and link our roots for persistence
RUN \
  chmod +x /usr/local/bin/kterminus && \
  chmod +x /usr/local/bin/kdrush && \
  chmod +x /usr/local/bin/kwp && \
  mkdir -p /root/.ssh && mkdir -p /usr/share/drush/commands && \
  ln -s /src/config/drush /root/.drush && \
  ln -s /src/config/terminus /root/.terminus

# Install some extra goodies
RUN \
  cd /usr/share/drush/commands && \
  curl -L "http://ftp.drupal.org/files/projects/registry_rebuild-7.x-2.2.tar.gz" | tar -zvx && \
  curl -O "https://raw.githubusercontent.com/drush-ops/config-extra/1.0.1/config_extra.drush.inc"

ENTRYPOINT ["/usr/local/bin/kterminus"]

```
