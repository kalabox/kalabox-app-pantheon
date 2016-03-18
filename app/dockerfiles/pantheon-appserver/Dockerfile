# Pantheon appserver mock for Kalabox
# docker build -t kalabox/pantheon-appserver .
# docker run -d -e PHP_VERSION=55 -e FRAMEWORK=backdrop kalabox/pantheon-appserver

FROM nginx:1.8.1

# Set our customization options
ENV PHP_VERSION 53
ENV FRAMEWORK drupal
ENV DOMAIN kbox

# Install basic packages
RUN apt-get -y update && apt-get -y install \
  curl bzip2 \
  libgmp10 libpng12-0 libltdl7 libmcrypt4 libpq5 libicu52 libxslt1.1 \
  imagemagick libmagickwand-6.q16-2 libmagickcore-6.q16-2 \
  mysql-client postgresql-client-common sqlite \
  php5-cli php5-intl php5-curl php5-mysql php5-json \
  xfonts-base xfonts-75dpi && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

# Get our phpbrew artifacts
RUN \
  mkdir -p /usr/local/bin && \
  curl -fsSL -o /usr/local/bin/phpbrew https://github.com/phpbrew/phpbrew/raw/master/phpbrew && \
  chmod +x /usr/local/bin/phpbrew && \
  phpbrew init && \
  cd /root/.phpbrew && \
  curl -L "http://github.com/kalabox/phpbrewer/releases/download/pantheon-beta1/php.tar.gz" | tar -zvx

# get some extra tools we need for pantheon
RUN \
  cd /tmp && curl -O 'http://download.gna.org/wkhtmltopdf/0.12/0.12.2/wkhtmltox-0.12.2_linux-jessie-amd64.deb' && \
  dpkg -i /tmp/wkhtmltox-0.12.2_linux-jessie-amd64.deb && \
  mkdir -p /srv/bin && ln -s /usr/local/bin/wkhtmltopdf /srv/bin/wkhtmltopdf && \
  cd /srv/bin && \
  curl -fsSL "https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-2.1.1-linux-x86_64.tar.bz2" | tar -xjv && \
  mv phantomjs-2.1.1-linux-x86_64/bin/phantomjs /srv/bin/phantomjs && \
  rm -rf phantomjs-2.1.1-linux-x86_64 && rm -f phantomjs-2.1.1-linux-x86_64.tar.bz2 && \
  chmod +x /srv/bin/phantomjs && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

COPY ./start.sh /root/start.sh
COPY ./bashrc /root/.bashrc

# We do this because we need the stuff in .bashrc before we run start.sh
ENTRYPOINT ["/bin/bash"]
CMD ["--login", "/root/start.sh"]

EXPOSE 80
EXPOSE 443
