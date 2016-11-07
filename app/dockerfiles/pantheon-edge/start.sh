#!/bin/bash
set -e

varnishd -a :80 -f /etc/varnish/default.vcl -s malloc,128m
nginx -g "daemon off;"
