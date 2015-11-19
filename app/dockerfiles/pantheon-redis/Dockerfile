# docker build -t kalabox/pantheon-redis .

FROM kalabox/hipache:v0.10.0

RUN \
  apt-get -y clean && \
  apt-get -y autoclean && \
  apt-get -y autoremove && \
  rm -rf /src/* && \
  rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

# Eventually symlink this from config?
COPY ./redis.conf /root/redis.conf

EXPOSE 8161

CMD ["/usr/local/bin/redis-server", "/root/redis.conf"]
