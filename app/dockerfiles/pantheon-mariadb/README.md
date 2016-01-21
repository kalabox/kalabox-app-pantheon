Kalabox MariaDB
===================

Pantheon MARIADB

```

# docker build -t kalabox/mariadb .

FROM kalabox/mariadb:v0.10.0

COPY ./import.sh /usr/local/bin/import-mysql
COPY ./dump.sh /usr/local/bin/dump-mysql
COPY ./export.sh /usr/local/bin/export-mysql

RUN \
  chmod +x /usr/local/bin/export-mysql && \
  chmod +x /usr/local/bin/dump-mysql && \
  chmod +x /usr/local/bin/import-mysql

```
