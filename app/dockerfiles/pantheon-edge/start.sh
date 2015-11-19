#!/bin/bash

# Set up our certs for ssl termination with nginx
# @todo: lots of clean up to do here
if [ ! -f "/certs/edge-ssl-termination.pem" ]; then
  openssl genrsa -out /certs/edge-ssl-termination.key 2048 && \
  openssl req -new -x509 -key /certs/edge-ssl-termination.key -out /certs/edge-ssl-termination.crt -days 365 -subj "/C=US/ST=California/L=Oakland/O=Kalabox/OU=KB/CN=${APPDOMAIN}" && \
  cat /certs/edge-ssl-termination.crt /certs/edge-ssl-termination.key > /certs/edge-ssl-termination.pem
fi

# Varnish's backend should point to the appserver container
# @todo: this bashfu is dark and full of peril we should probably fix the
# underlying issues at some point
BACKENDS=$(dig +short appserver.${APPDOMAIN}.${DOMAIN})
IFS=$'\n' read -d '' -r -a IPS <<< "${BACKENDS}"
if [ ${#IPS[@]} -eq 1 ]; then
  APPSERVER_BACKEND=$(dig +short appserver.${APPDOMAIN}.${DOMAIN})
else
  IP1="${IPS[0]//.}"
  IP2="${IPS[1]//.}"
  if [ $IP1 -gt $IP2 ]; then
    APPSERVER_BACKEND="${IPS[0]}"
  else
    APPSERVER_BACKEND="${IPS[1]}"
  fi
fi

# Set the varnish backend ip and port correctly
sed -i "s/.host =.*/.host = \"${APPSERVER_BACKEND}\";/g" /etc/varnish/default.vcl

# Copy the configuration for ssl termination with nginx to the correct place
if [ -f "/src/config/nginx/ssl-termination.conf" ]; then
  rm /etc/nginx/sites-enabled/default
  cp /src/config/nginx/ssl-termination.conf /etc/nginx/sites-enabled/default
fi

varnishd -a :80 -f /etc/varnish/default.vcl -s malloc,128m
nginx
