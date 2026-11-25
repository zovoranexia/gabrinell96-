'use strict';
const express = require('express');
const { db } = require('../db');
const { rateLimit, wrap } = require('../security');

const router = express.Router();
const LANGS = ['tl', 'pt', 'en', 'id'];
const parse = (s) => {
  try { return JSON.parse(s); } catch { return {}; }
};

/** Everything the landing page needs, all four languages in one payload. */
router.get('/content', (req, res) => {
  const content = {};
  for (const r of db.prepare('SELECT key, value FROM contents').all()) content[r.key] = parse(r.value);
  const items = (type) =>
    db.prepare('SELECT id, icon, title, body FROM items WHERE type = ? AND active = 1 ORDER BY sort_order, id').all(type)
      .map((r) => ({ id: r.id, icon: r.icon, title: parse(r.title), body: parse(r.body) }));
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ content, services: items('service'), missions: items('mission'), values: items('value') });
});

/* Page-view counter: one hit per browser session (the client de-duplicates). */
router.post('/visit', rateLimit({ windowMs: 60_000, max: 20 }), (req, res) => {
  const lang = LANGS.includes(req.body && req.body.lang) ? req.body.lang : 'tl';
  const ua = req.get('user-agent') || '';
  if (!/bot|crawl|spider|headless|lighthouse/i.test(ua)) {
    db.prepare(
      `INSERT INTO visits(day, lang, count) VALUES(date('now'), ?, 1)
       ON CONFLICT(day, lang) DO UPDATE SET count = count + 1`
    ).run(lang);
  }
  res.status(204).end();
});

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

router.post(
  '/contact',
  rateLimit({ windowMs: 10 * 60_000, max: 5, message: 'Too many messages' }),
  wrap((req, res) => {
    const b = req.body || {};
    // Honeypot: real users never fill this hidden field.
    if (b.website) return res.status(201).json({ ok: true });
    const name = clean(b.name, 120);
    const email = clean(b.email, 160);
    const phone = clean(b.phone, 40);
    const subject = clean(b.subject, 160);
    const message = clean(b.message, 4000);
    const lang = LANGS.includes(b.lang) ? b.lang : 'tl';
    if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 5) {
      return res.status(400).json({ error: 'invalid', message: 'Invalid form data' });
    }
    db.prepare('INSERT INTO messages(name, email, phone, subject, message, lang, ip) VALUES(?,?,?,?,?,?,?)')
      .run(name, email, phone, subject, message, lang, req.ip || '');
    res.status(201).json({ ok: true });
  })
);

module.exports = router;
