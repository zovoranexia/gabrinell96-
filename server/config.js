'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');

// Minimal .env loader (no extra dependency). Real environment variables win.
(function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const val = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
})();

const DATA_DIR = path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function jwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 24) return process.env.JWT_SECRET;
  const f = path.join(DATA_DIR, '.jwt-secret');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  const s = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  ROOT,
  DATA_DIR,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  DB_FILE: process.env.DB_FILE || path.join(DATA_DIR, 'gabrinell.db'),
  PORT: Number(process.env.PORT) || 3000,
  isProd,
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || isProd && process.env.COOKIE_SECURE !== 'false',
  JWT_SECRET: jwtSecret(),
  JWT_TTL_SECONDS: 60 * 60 * 8,
  COOKIE_NAME: 'g96_token',
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'admin@gabrinell96.tl').toLowerCase(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};
