# docker build -t kalabox/solr:mytag .

FROM kalabox/debian:stable

RUN \
  apt-get -y update && \
  apt-get -y install incron solr-tomcat && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

COPY ./start.sh /start.sh
COPY ./index /usr/share/solr/web/index

# Allow us to edit some config on the outsite
RUN \
  chmod 755 /start.sh && \
  rm /etc/tomcat6/server.xml && \
  ln -s /src/config/tomcat/server.xml /etc/tomcat6/server.xml && \
  rm /etc/tomcat6/web.xml && \
  ln -s /src/config/tomcat/web.xml /etc/tomcat6/web.xml && \
  rm /etc/solr/solr.xml && \
  ln -s /src/config/solr/solr.xml /etc/solr/solr.xml && \
  rm /usr/share/solr/conf/schema.xml && \
  ln -s /usr/share/solr/web/index /usr/share/solr/conf/schema.xml && \
  mv /etc/tomcat6/Catalina/localhost/solr.xml /etc/tomcat6/Catalina/localhost/sites#self#environments#kalabox.xml && \
  echo "root" >> /etc/incron.allow && \
  echo "/usr/share/solr/web/index IN_MODIFY curl http://localhost:449/sites/self/environments/kalabox/admin/cores?action=RELOAD&core=index" >> /var/spool/incron/root

EXPOSE 449
CMD ["/bin/bash", "/start.sh"]
