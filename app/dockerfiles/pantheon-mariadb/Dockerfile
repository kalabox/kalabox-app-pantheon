# docker build -t kalabox/mariadb .

FROM kalabox/mariadb:v0.9.0

COPY ./import.sh /usr/local/bin/import-mysql
RUN chmod +x /usr/local/bin/import-mysql

# Put your customizations here and then pass in --build-local to try out
# your changes.
