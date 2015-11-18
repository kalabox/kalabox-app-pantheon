var crypto = require('crypto');

var pubre = /^(ssh-[dr]s[as]\s+)|(\s+.+)|\n/g;

module.exports = fingerprint;

function fingerprint(pub, alg) {
  alg = alg || 'md5'; // OpenSSH Standard

  var cleanpub = pub.replace(pubre, '');
  var pubbuffer = new Buffer(cleanpub, 'base64');
  var key = hash(pubbuffer, alg);

  return colons(key);
}

// hash a string with the given alg
function hash(s, alg) {
  return crypto.createHash(alg).update(s).digest('hex');
}

// add colons, 'hello' => 'he:ll:o'
function colons(s) {
  return s.replace(/(.{2})(?=.)/g, '$1:');
}
