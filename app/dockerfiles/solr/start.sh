#!/bin/bash
export CATALINA_HOME=/usr/share/tomcat7
export CATALINA_BASE=/var/lib/tomcat7

incrond
/usr/share/tomcat7/bin/catalina.sh run
