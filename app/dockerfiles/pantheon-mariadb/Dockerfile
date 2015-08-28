# docker build -t kalabox/mariadb .

FROM kalabox/mariadb:v0.10.0

COPY ./import.sh /usr/local/bin/import-mysql
COPY ./dump.sh /usr/local/bin/dump-mysql
RUN \
  chmod +x /usr/local/bin/import-mysql && \
  chmod +x /usr/local/bin/dump-mysql

# Put your customizations here and then pass in --build-local to try out
# your changes.
