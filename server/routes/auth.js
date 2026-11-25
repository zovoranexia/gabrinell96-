'use strict';
const express = require('express');
const pw = require('../password');
const { db } = require('../db');
const S = require('../security');

const router = express.Router();

const loginLimiter = S.rateLimit({
  windowMs: 15 * 60_000,
  max: 8,
  keyFn: (req) => `${req.ip}|${String((req.body && req.body.email) || '').toLowerCase()}`,
  message: 'Too many login attempts. Try again in 15 minutes.',
});

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, role_label: u.role_label, permissions: u.permissions,
});

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Password must be at least 10 characters.';
  if (pw.length > 128) return 'Password is too long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain letters and numbers.';
  return null;
}

router.post('/login', loginLimiter, S.wrap(async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const ok = await pw.verify(password.slice(0, 128), row ? row.password_hash : pw.DUMMY);
  if (!row || !ok || !row.active) {
    S.audit({ ip: req.ip, user: null }, 'login.failed', 'user', '', email);
    return res.status(401).json({ error: 'bad_credentials', message: 'Invalid e-mail or password.' });
  }
  loginLimiter.reset(`${req.ip}|${email}`);
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(row.id);
  S.setAuthCookie(res, S.signToken(row));
  S.audit({ ip: req.ip, user: { id: row.id, email: row.email } }, 'login', 'user', row.id);
  const full = db.prepare('SELECT u.*, r.name AS role, r.label AS role_label FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id = ?').get(row.id);
  full.permissions = db.prepare('SELECT perm_key FROM role_permissions WHERE role_id = ?').all(full.role_id).map((r) => r.perm_key);
  res.json({ user: publicUser(full) });
}));

router.post('/logout', (req, res) => {
  S.clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', S.requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/password', S.requireAuth, S.wrap(async (req, res) => {
  const { current, next } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!(await pw.verify(String(current || ''), row.password_hash))) {
    return res.status(400).json({ error: 'bad_password', message: 'Current password is incorrect.' });
  }
  const bad = validatePassword(next);
  if (bad) return res.status(400).json({ error: 'weak_password', message: bad });
  // Bumping token_version invalidates every other session; issue a fresh cookie for this one.
  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?')
    .run(await pw.hash(next), row.id);
  S.setAuthCookie(res, S.signToken({ id: row.id, token_version: row.token_version + 1 }));
  S.audit(req, 'password.change', 'user', row.id);
  res.json({ ok: true });
}));

module.exports = router;
module.exports.validatePassword = validatePassword;
