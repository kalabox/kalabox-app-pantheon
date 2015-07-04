#!/bin/bash

export CATALINA_HOME=/usr/share/tomcat6
export CATALINA_BASE=/var/lib/tomcat6

incrond
/usr/share/tomcat6/bin/catalina.sh run
