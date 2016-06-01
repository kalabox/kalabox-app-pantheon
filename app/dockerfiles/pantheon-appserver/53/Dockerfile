# Pantheon 5.3 appserver mock for Kalabox
#
# docker build -t kalabox/pantheon-appserver:53 .
# docker run -d -e FRAMEWORK=backdrop kalabox/pantheon-appserver:53

FROM helder/php-5.3

# Install the PHP extensions we need
RUN apt-get update && apt-get install -y libpng12-dev libjpeg-dev libpq-dev \
  && rm -rf /var/lib/apt/lists/* \
  && docker-php-ext-configure gd --with-png-dir=/usr --with-jpeg-dir=/usr \
  && docker-php-ext-install gd mbstring pdo pdo_mysql pdo_pgsql zip
