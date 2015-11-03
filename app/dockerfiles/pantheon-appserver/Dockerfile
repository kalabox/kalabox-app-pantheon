# docker build -t kalabox/pantheon-appserver:mytag .

FROM kalabox/nginx:v0.10.0

RUN \
  apt-get -y update && \
  apt-get -y install php5-cli libgmp10 libpng12-0 libltdl7 libmcrypt4 libpq5 libicu48 libxslt1.1 && \
  apt-get -y install imagemagick libmagickwand5 libmagickcore5 && \
  apt-get install -y mysql-client php5-mysql php5-json postgresql-client-common sqlite php5-curl && \
  apt-get install -y kdiff3-qt cron && \
  curl -sS https://getcomposer.org/installer | php && \
  mv composer.phar /usr/local/bin/composer && \
  ln -s /usr/local/bin/composer /usr/bin/composer && \
  git clone --depth 1 --branch 8.0.0-rc2 https://github.com/drush-ops/drush.git /usr/local/src/drush8 && \
  cd /tmp && \
  curl -L -O https://github.com/phpbrew/phpbrew/raw/master/phpbrew && \
  chmod +x /tmp/phpbrew && \
  mv /tmp/phpbrew /usr/bin/phpbrew && \
  phpbrew init && \
  echo "source /root/.phpbrew/bashrc" >> /root/.bashrc && \
  ln -s /.phpbrew /root/.phpbrew && \
  ln -s /usr/local/src/drush8/drush /usr/bin/drush8 && \
  cd /usr/local/src/drush8 && composer install --no-dev && \
  apt-get -y update && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

RUN \
  cd /root/.phpbrew && \
  curl -L "http://github.com/kalabox/phpbrewer/releases/download/pantheon-2/php.tar.gz" | tar -zvx && \
  rm /root/start.sh

ENV PHP_VERSION 5.3.29
ENV FRAMEWORK drupal

COPY start.sh /root/start.sh
RUN chmod +x /root/start.sh

CMD ["/root/start.sh"]

EXPOSE 80
EXPOSE 443
