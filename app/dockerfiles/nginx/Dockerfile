# docker build -t kalabox/pantheon-nginx:mytag .

FROM kalabox/debian:v0.9.0

# Install Nginx.
RUN \
  apt-get update -y && \
  apt-get install -y build-essential dnsutils && \
  apt-get install -y libpcre3 libpcre3-dev libpcrecpp0 libssl-dev zlib1g-dev && \
  cd /tmp && curl -L "http://nginx.org/download/nginx-1.4.7.tar.gz" | tar -zvx && \
  cd /tmp/nginx-1.4.7 && ./configure \
    --prefix=/usr \
    --conf-path=/etc/nginx/nginx.conf \
    --error-log-path=/var/log/nginx/error.log \
    --http-log-path=/var/log/nginx/access.log \
    --pid-path=/var/run/nginx.pid \
    --lock-path=/var/lock/nginx.lock \
    --with-http_ssl_module \
    --user=root \
    --group=root \
    --with-http_stub_status_module \
    --with-http_gzip_static_module \
    --without-mail_pop3_module \
    --without-mail_imap_module \
    --without-mail_smtp_module && make && make install && \
   apt-get purge -y build-essential libpcre3-dev libpcrecpp0 libssl-dev zlib1g-dev && \
   apt-get clean -y && \
   apt-get autoclean -y && \
   apt-get autoremove -y && \
   rm -rf /var/lib/apt && rm -rf /var/lib/dpkg && rm -rf /var/lib/cache && rm -rf /var/lib/log && rm -rf /tmp && \
   mkdir /etc/nginx/sites-available && mkdir /etc/nginx/sites-enabled

# The data container will manage these config files.
RUN rm /etc/nginx/nginx.conf
RUN ls -lsa /etc/nginx
RUN ln -s /src/config/nginx/nginx.conf /etc/nginx/nginx.conf
RUN ln -s /src/config/nginx/site.conf /etc/nginx/sites-enabled/default

COPY start.sh /root/start.sh
RUN chmod 777 /root/start.sh

# Define default command.
CMD ["/root/start.sh"]

# Expose ports.
EXPOSE 80
EXPOSE 443
