'use strict';
const jwt = require('jsonwebtoken');
const cfg = require('./config');
const { db } = require('./db');

/* ------------------------------------------------------------------ */
/* Tiny in-memory rate limiter (sliding window per key)                */
/* ------------------------------------------------------------------ */
function rateLimit({ windowMs, max, keyFn, message = 'Too many requests' }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits) {
      const fresh = arr.filter((t) => now - t < windowMs);
      fresh.length ? hits.set(k, fresh) : hits.delete(k);
    }
  }, Math.min(windowMs, 60_000)).unref();

  const mw = (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: 'rate_limited', message });
    }
    arr.push(now);
    hits.set(key, arr);
    next();
  };
  mw.reset = (key) => hits.delete(key);
  return mw;
}

/* ------------------------------------------------------------------ */
/* JWT cookie session                                                  */
/* ------------------------------------------------------------------ */
function signToken(user) {
  return jwt.sign({ sub: user.id, tv: user.token_version }, cfg.JWT_SECRET, {
    expiresIn: cfg.JWT_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

function setAuthCookie(res, token) {
  res.cookie(cfg.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: cfg.COOKIE_SECURE,
    maxAge: cfg.JWT_TTL_SECONDS * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(cfg.COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: cfg.COOKIE_SECURE, path: '/' });
}

const userStmt = db.prepare(
  `SELECT u.id, u.name, u.email, u.active, u.token_version, u.last_login, u.role_id,
          r.name AS role, r.label AS role_label
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`
);
const permStmt = db.prepare('SELECT perm_key FROM role_permissions WHERE role_id = ?');

/** Attach req.user (with permissions) if a valid session exists. */
function loadUser(req, _res, next) {
  const token = req.cookies && req.cookies[cfg.COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, cfg.JWT_SECRET, { algorithms: ['HS256'] });
    const u = userStmt.get(payload.sub);
    if (u && u.active && u.token_version === payload.tv) {
      u.permissions = permStmt.all(u.role_id).map((r) => r.perm_key);
      req.user = u;
    }
  } catch {
    /* invalid / expired token -> treated as anonymous */
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated', message: 'Please sign in.' });
  next();
}

/** RBAC guard: user must hold ALL of the listed permissions. */
const can = (...perms) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated', message: 'Please sign in.' });
  const have = new Set(req.user.permissions);
  if (!perms.every((p) => have.has(p))) {
    return res.status(403).json({ error: 'forbidden', message: 'You do not have permission to do this.' });
  }
  next();
};

/** CSRF defence in depth: cookie is SameSite=Strict, and unsafe methods must carry a custom header. */
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'g96') {
    return res.status(403).json({ error: 'csrf', message: 'Missing request header.' });
  }
  next();
}

/* ------------------------------------------------------------------ */
/* Audit trail                                                         */
/* ------------------------------------------------------------------ */
const auditStmt = db.prepare(
  'INSERT INTO audit_log(user_id, user_email, action, entity, entity_id, detail, ip) VALUES(?,?,?,?,?,?,?)'
);
function audit(req, action, entity = '', entityId = '', detail = '') {
  try {
    const u = req.user;
    auditStmt.run(u ? u.id : null, u ? u.email : '', action, entity, String(entityId), String(detail).slice(0, 500), req.ip || '');
  } catch (e) {
    console.error('audit failed', e.message);
  }
}

/** Wrap async handlers so thrown errors reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'error';
  }
}

module.exports = {
  rateLimit, signToken, setAuthCookie, clearAuthCookie, loadUser, requireAuth, can, csrfGuard, audit, wrap, HttpError,
};
