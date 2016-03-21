#!/bin/bash
export CATALINA_HOME=/usr/share/tomcat7
export CATALINA_BASE=/var/lib/tomcat7
LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CATALINA_HOME/lib
export LD_LIBRARY_PATH

# Set up our solr certs
if [ ! -f "/certs/binding.pem" ]; then
  openssl genrsa -out /certs/binding.key 2048 && \
  openssl req -new -x509 -key /certs/binding.key -out /certs/binding.crt -days 365 -subj "/C=US/ST=California/L=San Francisco/O=Kalabox/OU=KB/CN=solr" && \
  cat /certs/binding.crt /certs/binding.key > /certs/binding.pem
fi

# Start listening, lurking, waiting
incrond

# Start tomcat
/usr/share/tomcat7/bin/catalina.sh run
