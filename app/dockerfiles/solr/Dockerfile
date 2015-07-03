# docker build -t kalabox/solr:mytag .

FROM kalabox/debian:stable

RUN \
  apt-get -y update && \
  apt-get -y install solr-tomcat && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

COPY ./start.sh /start.sh
RUN chmod 755 /start.sh

# Allow us to edit the config on the outsite
RUN rm /etc/tomcat6/server.xml
RUN ln -s /src/config/tomcat/server.xml /etc/tomcat6/server.xml

EXPOSE 449
CMD ["/bin/bash", "/start.sh"]
