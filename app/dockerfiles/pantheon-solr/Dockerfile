# docker build -t kalabox/solr:mytag .

FROM debian:jessie

RUN apt-get update && apt-get install -y \
    unzip \
    curl \
    incron \
    tomcat7 \
    libtcnative-1 \
    tomcat7-admin \
  && cd /tmp && curl -Lk "https://archive.apache.org/dist/lucene/solr/3.6.2/apache-solr-3.6.2.tgz" | tar -zvx \
  && mv /tmp/apache-solr-3.6.2/example/solr /usr/share/solr \
  && unzip /tmp/apache-solr-3.6.2/example/webapps/solr.war -d /usr/share/solr/web \
  && mkdir -p /usr/share/solr/lib \
  && mkdir -p /usr/share/solr/data \
  && mkdir -p /var/lib/tomcat7/temp \
  && rm /usr/share/solr/conf/schema.xml \
  && ln -s /usr/share/solr/web/index /usr/share/solr/conf/schema.xml \
  && echo "root" >> /etc/incron.allow \
  && echo "/usr/share/solr/web/index IN_MODIFY curl -k https://localhost:449/sites/self/environments/kalabox/admin/cores?action=RELOAD&core=index" > /var/spool/incron/root \
  && apt-get -y clean \
  && apt-get -y autoclean \
  && apt-get -y autoremove \
  && rm -rf /var/lib/apt/lists/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

COPY ./start.sh /start.sh

COPY ./tomcat/server.xml /etc/tomcat7/server.xml
COPY ./tomcat/web.xml /etc/tomcat7/web.xml
COPY ./tomcat/index.xml /etc/tomcat7/Catalina/localhost/sites#self#environments#kalabox.xml

COPY ./solr/solr.xml /usr/share/solr/solr.xml
COPY ./solr/solrconfig.xml /usr/share/solr/conf/solrconfig.xml
COPY ./index /usr/share/solr/web/index

EXPOSE 449
CMD ["/start.sh"]
