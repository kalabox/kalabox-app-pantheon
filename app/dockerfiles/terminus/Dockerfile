# Pantheon terminus mock for Kalabox
# docker build -t kalabox/terminus .
# docker run -d -e PHP_VERSION=55 -e FRAMEWORK=backdrop kalabox/pantheon-appserver

FROM drush/drush:8

# Install all the CLI magic
RUN \
  apt-get update -y && apt-get install -y kdiff3-qt curl && \
  curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
  chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp && \
  curl https://github.com/pantheon-systems/cli/releases/download/0.10.6/terminus.phar -L -o /usr/local/bin/terminus && \
  chmod +x /usr/local/bin/terminus && \
  mkdir -p /usr/share/drush/commands && mkdir -p /root/.terminus/cache && \
  cd /usr/share/drush/commands && \
  curl -L "http://ftp.drupal.org/files/projects/registry_rebuild-7.x-2.3.tar.gz" | tar -zvx && \
  curl -O "https://raw.githubusercontent.com/drush-ops/config-extra/1.0.1/config_extra.drush.inc" && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf && rm -rf /var/lib/cache/* && \
  rm -rf /var/lib/log/* && rm -rf /tmp/*

# Set up our kalabox specific stuff
COPY ssh-config /root/.ssh/config

ENTRYPOINT ["/bin/bash"]
CMD ["true"]
