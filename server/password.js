'use strict';
/** Password hashing with Node's built-in scrypt (memory-hard, no native add-ons). Format: scrypt$N$r$p$salt$hash */
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
// cost is stored inside every hash, so it can be raised later without breaking old passwords
const N = 2 ** (Number(process.env.SCRYPT_LOG_N) || 15);
const R = 8;
const P = 1;
const KEYLEN = 64;
const OPTS = (n, r, p) => ({ N: n, r, p, maxmem: 256 * n * r });

async function hash(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, OPTS(N, R, P));
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

function hashSync(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, KEYLEN, OPTS(N, R, P));
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verify(password, stored) {
  const [alg, n, r, p, salt, key] = String(stored).split('$');
  if (alg !== 'scrypt' || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const got = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, OPTS(+n, +r, +p));
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

/** A valid hash of a random password, used to equalise timing when an e-mail is unknown. */
const DUMMY = hashSync(crypto.randomBytes(12).toString('hex'));

module.exports = { hash, hashSync, verify, DUMMY };
