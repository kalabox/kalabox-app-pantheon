#!/bin/bash

# Set up our certs for ssl termination with nginx
# @todo: lots of clean up to do here
if [ ! -f "/certs/edge-ssl-termination.pem" ]; then
  openssl genrsa -out /certs/edge-ssl-termination.key 2048 && \
  openssl req -new -x509 -key /certs/edge-ssl-termination.key -out /certs/edge-ssl-termination.crt -days 365 -subj "/C=US/ST=California/L=San Francisco/O=Kalabox/OU=KB/CN=edge" && \
  cat /certs/edge-ssl-termination.crt /certs/edge-ssl-termination.key > /certs/edge-ssl-termination.pem
fi

varnishd -a :80 -f /etc/varnish/default.vcl -s malloc,128m
nginx
