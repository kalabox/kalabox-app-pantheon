Kalabox Pantheon appserver
===================

A container that approximates the appserver used on Pantheon.

```

# Pantheon appserver mock for Kalabox
# docker build -t kalabox/pantheon-appserver .
# docker run -d -e PHP_VERSION=55 -e FRAMEWORK=backdrop kalabox/pantheon-appserver

FROM kalabox/nginx:v0.10.0

# Set our customization options
ENV PHP_VERSION 53
ENV FRAMEWORK drupal
ENV DOMAIN kbox

# Install basic packages
RUN \
  apt-get -y update && \
  apt-get -y install php5-cli libgmp10 libpng12-0 libltdl7 libmcrypt4 libpq5 libicu48 libxslt1.1 && \
  apt-get -y install imagemagick libmagickwand5 libmagickcore5 && \
  apt-get -y install mysql-client php5-mysql php5-json postgresql-client-common sqlite php5-curl && \
  apt-get -y install kdiff3-qt cron xfonts-base xfonts-75dpi && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

# Get our phpbrew artifacts
RUN \
  cd /tmp && curl -L -O https://github.com/phpbrew/phpbrew/raw/master/phpbrew && \
  mv /tmp/phpbrew /usr/bin/phpbrew && \
  chmod +x /usr/bin/phpbrew && phpbrew init && \
  phpbrew init && \
  cd /root/.phpbrew && \
  curl -L "http://github.com/kalabox/phpbrewer/releases/download/pantheon-2/php.tar.gz" | tar -zvx && \
  rm /root/start.sh && \
  rm -rf /tmp/*

# get some extra tools we need for pantheon
RUN \
  curl -sS https://getcomposer.org/installer | php && \
  mv composer.phar /usr/local/bin/composer && \
  ln -s /usr/local/bin/composer /usr/bin/composer && \
  git clone --depth 1 --branch 8.0.0 https://github.com/drush-ops/drush.git /usr/local/src/drush8 && \
  ln -s /usr/local/src/drush8/drush /usr/bin/drush8 && \
  cd /usr/local/src/drush8 && composer install --no-dev && \
  cd /tmp && curl -O 'http://download.gna.org/wkhtmltopdf/0.12/0.12.2.1/wkhtmltox-0.12.2.1_linux-wheezy-amd64.deb' && \
  dpkg -i /tmp/wkhtmltox-0.12.2.1_linux-wheezy-amd64.deb && \
  mkdir -p /srv/bin && ln -s /usr/local/bin/wkhtmltopdf /srv/bin/wkhtmltopdf && \
  cd /srv/bin && \
  curl -L "http://github.com/kalabox/phantomjs/releases/download/2.0.0/phantomjs-2.0.0-debian.tar.gz" | tar -zvx && \
  chmod +x /srv/bin/phantomjs && \
  rm -rf /tmp/*

COPY ./start.sh /root/start.sh
COPY ./bashrc /root/.bashrc

# We do this because we need the stuff in .bashrc before we run start.sh
ENTRYPOINT ["/bin/bash"]
CMD ["--login", "/root/start.sh"]

EXPOSE 80
EXPOSE 443

```
