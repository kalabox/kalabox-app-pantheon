#!/bin/bash
set -e

# Set up our certs for ssl termination with nginx
if [ ! -f "/certs/edge.pem" ]; then
  openssl genrsa -out /certs/edge.key 2048 && \
  openssl req -new -x509 -key /certs/edge.key -out /certs/edge.crt -days 365 -subj "/C=US/ST=California/L=San Francisco/O=Kalabox/OU=KB/CN=edge" && \
  cat /certs/edge.crt /certs/edge.key > /certs/edge.pem
fi

varnishd -a :80 -f /etc/varnish/default.vcl -s malloc,128m
nginx -g "daemon off;"
