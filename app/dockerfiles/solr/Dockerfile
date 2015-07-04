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
COPY ./index /usr/share/solr/web/index
RUN chmod 755 /start.sh

# Allow us to edit some config on the outsite
RUN rm /etc/tomcat6/server.xml
RUN ln -s /src/config/tomcat/server.xml /etc/tomcat6/server.xml

RUN rm /etc/tomcat6/web.xml
RUN ln -s /src/config/tomcat/web.xml /etc/tomcat6/web.xml

RUN rm /etc/solr/solr.xml
RUN ln -s /src/config/solr/solr.xml /etc/solr/solr.xml

RUN rm /usr/share/solr/conf/schema.xml
RUN ln -s /usr/share/solr/web/index /usr/share/solr/conf/schema.xml

# Hacky way to set a special path
RUN mv /etc/tomcat6/Catalina/localhost/solr.xml /etc/tomcat6/Catalina/localhost/sites#self#environments#kalabox.xml

EXPOSE 449
CMD ["/bin/bash", "/start.sh"]
