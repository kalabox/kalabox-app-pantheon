#!/bin/bash

# Set up our certs for ssl termination with nginx
# @todo: lots of clean up to do here
if [ ! -f "/certs/edge-ssl-termination.pem" ]; then
  openssl genrsa -out /certs/edge-ssl-termination.key 2048 && \
  openssl req -new -x509 -key /certs/edge-ssl-termination.key -out /certs/edge-ssl-termination.crt -days 365 -subj "/C=US/ST=California/L=Oakland/O=Kalabox/OU=KB/CN=${APPDOMAIN}" && \
  cat /certs/edge-ssl-termination.crt /certs/edge-ssl-termination.key > /certs/edge-ssl-termination.pem
fi

# Use the correct VCL for the framework
if [ -f "/src/config/varnish/${FRAMEWORK}.vcl" ]; then
  rm /etc/varnish/default.vcl
  cp /src/config/varnish/${FRAMEWORK}.vcl /etc/varnish/default.vcl
fi

# Varnish's backend should point to the appserver container
sed -i "s/APPNAME/${APPNAME}/g" /etc/varnish/default.vcl

# Copy the configuration for ssl termination with nginx to the correct place
if [ -f "/src/config/nginx/ssl-termination.conf" ]; then
  rm /etc/nginx/sites-enabled/default
  cp /src/config/nginx/ssl-termination.conf /etc/nginx/sites-enabled/default
fi

varnishd -a :80 -f /etc/varnish/default.vcl -s malloc,128m
nginx
