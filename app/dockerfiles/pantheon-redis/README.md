Kalabox Pantheon redis
===================

A container that approximates the redis service used on Pantheon.

```

# docker build -t kalabox/pantheon-redis .

FROM kalabox/hipache:v0.10.0

EXPOSE 8161

CMD ["/usr/bin/redis-server", "/src/config/redis/redis.conf"]

```
