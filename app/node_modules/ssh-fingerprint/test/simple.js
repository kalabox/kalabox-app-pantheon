var assert = require('assert');
var fs = require('fs');
var path = require('path');

var fingerprint = require('../');

var PUBLIC_KEY = fs.readFileSync(path.join(__dirname, 'id_rsa.pub'), 'utf-8');

var known_md5fingerprint = '64:c4:c5:c9:7e:91:91:db:e3:35:ca:de:be:84:2e:b0'; // `ssh-keygen -lf id_rsa.pub`
var known_sha1fingerprint = 'fc:e1:e4:a7:8b:ea:2a:f4:72:4f:1f:f3:81:40:4a:5b:29:4a:bc:b0'; // `awk '{print $2}' id_rsa.pub | tr -d '\n' | base64 -D | openssl sha1`

var md5fingerprint = fingerprint(PUBLIC_KEY, 'md5');
console.log('md5 => %s', md5fingerprint);
assert.strictEqual(md5fingerprint, known_md5fingerprint);

var sha1fingerprint = fingerprint(PUBLIC_KEY, 'sha1');
console.log('sha1 => %s', sha1fingerprint);
assert.strictEqual(sha1fingerprint, known_sha1fingerprint);
