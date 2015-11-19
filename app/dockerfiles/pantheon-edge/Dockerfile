# docker build -t kalabox/pantheon-edge:mytag .

FROM kalabox/nginx:v0.10.0

RUN \
  apt-get -y update && \
  apt-get -y install apt-transport-https && \
  curl --silent https://repo.varnish-cache.org/ubuntu/GPG-key.txt | apt-key add - && \
  echo "deb https://repo.varnish-cache.org/debian/ wheezy varnish-4.0" >> /etc/apt/sources.list.d/varnish-cache.list &&\
  apt-get -y update && \
  apt-get -y install varnish && \
  rm /etc/varnish/default.vcl && \
  ln -s /src/config/varnish/default.vcl /etc/varnish/default.vcl && \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

RUN \
  rm /root/start.sh

COPY start.sh /root/start.sh
RUN chmod +x /root/start.sh

CMD ["/root/start.sh"]

EXPOSE 80
EXPOSE 443
