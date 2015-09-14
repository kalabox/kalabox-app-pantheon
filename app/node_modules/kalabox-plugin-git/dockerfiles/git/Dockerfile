# docker build -t kalabox/git .

FROM kalabox/debian:stable

RUN \
  mkdir -p /usr/local/bin && \
  mkdir -p /root/.ssh

COPY kgit /usr/local/bin/kgit
COPY ssh-config /root/.ssh/config
COPY gitconfig /root/.gitconfig

RUN chmod +x /usr/local/bin/kgit

ENV SSH_KEY id_rsa

ENTRYPOINT ["/usr/local/bin/kgit"]
