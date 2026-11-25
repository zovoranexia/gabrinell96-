'use strict';
const express = require('express');
const pw = require('../password');
const { db, tx } = require('../db');
const S = require('../security');
const { validatePassword } = require('./auth');

const router = express.Router();
const { can, wrap, audit, HttpError } = S;

const LANGS = ['tl', 'pt', 'en', 'id'];
const parse = (s) => { try { return JSON.parse(s); } catch { return {}; } };
const int = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validate a {tl,pt,en,id} translation object. */
function translations(obj, { max = 5000, requireTetum = false } = {}) {
  if (!obj || typeof obj !== 'object') throw new HttpError(400, 'Translations are required.');
  const out = {};
  for (const l of LANGS) {
    const v = obj[l] == null ? '' : String(obj[l]);
    if (v.length > max) throw new HttpError(400, `Text for "${l}" is too long (max ${max}).`);
    out[l] = v.trim();
  }
  if (requireTetum && !out.tl) throw new HttpError(400, 'Tetum (default language) is required.');
  return out;
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
router.get('/stats', can('dashboard.view'), (req, res) => {
  const one = (sql, ...p) => db.prepare(sql).get(...p).n;
  const days = db.prepare(
    `WITH RECURSIVE d(day) AS (SELECT date('now','-13 days') UNION ALL SELECT date(day,'+1 day') FROM d WHERE day < date('now'))
     SELECT d.day, COALESCE(SUM(v.count),0) AS visits,
            (SELECT COUNT(*) FROM messages m WHERE date(m.created_at) = d.day) AS messages
       FROM d LEFT JOIN visits v ON v.day = d.day GROUP BY d.day ORDER BY d.day`
  ).all();
  const byLang = db.prepare("SELECT lang, SUM(count) AS n FROM visits WHERE day >= date('now','-29 days') GROUP BY lang").all();
  res.json({
    totals: {
      visits30: one("SELECT COALESCE(SUM(count),0) AS n FROM visits WHERE day >= date('now','-29 days')"),
      visitsToday: one("SELECT COALESCE(SUM(count),0) AS n FROM visits WHERE day = date('now')"),
      messagesNew: one("SELECT COUNT(*) AS n FROM messages WHERE status = 'new'"),
      messagesAll: one('SELECT COUNT(*) AS n FROM messages'),
      services: one("SELECT COUNT(*) AS n FROM items WHERE type='service' AND active=1"),
      users: one('SELECT COUNT(*) AS n FROM users WHERE active = 1'),
    },
    days,
    byLang,
    recent: db.prepare('SELECT id, name, email, subject, status, created_at FROM messages ORDER BY id DESC LIMIT 5').all(),
  });
});

/* ------------------------------------------------------------------ */
/* Website content (translatable texts)                                */
/* ------------------------------------------------------------------ */
router.get('/content', can('content.read'), (req, res) => {
  const rows = db.prepare('SELECT key, section, value, updated_at, updated_by FROM contents ORDER BY section, key').all();
  res.json({ content: rows.map((r) => ({ ...r, value: parse(r.value) })) });
});

router.put('/content/:key', can('content.update'), wrap((req, res) => {
  const row = db.prepare('SELECT key FROM contents WHERE key = ?').get(req.params.key);
  if (!row) throw new HttpError(404, 'Unknown content key.');
  const value = translations(req.body && req.body.value, { requireTetum: true });
  db.prepare("UPDATE contents SET value = ?, updated_at = datetime('now'), updated_by = ? WHERE key = ?")
    .run(JSON.stringify(value), req.user.email, req.params.key);
  audit(req, 'content.update', 'content', req.params.key);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Items: services / missions / values                                 */
/* ------------------------------------------------------------------ */
const TYPES = ['service', 'mission', 'value'];
const ICONS = ['code', 'database', 'globe', 'network', 'camera', 'box', 'shield', 'cloud', 'support', 'heart', 'bulb', 'briefcase', 'award', 'users', 'target'];
const itemOut = (r) => ({ id: r.id, type: r.type, icon: r.icon, sort_order: r.sort_order, active: !!r.active, title: parse(r.title), body: parse(r.body), updated_at: r.updated_at });

router.get('/items', can('content.read'), (req, res) => {
  const type = TYPES.includes(req.query.type) ? req.query.type : null;
  const rows = type
    ? db.prepare('SELECT * FROM items WHERE type = ? ORDER BY sort_order, id').all(type)
    : db.prepare('SELECT * FROM items ORDER BY type, sort_order, id').all();
  res.json({ items: rows.map(itemOut), icons: ICONS });
});

function itemFields(b, type) {
  const title = type === 'mission' ? translations({}) : translations(b.title, { max: 160, requireTetum: true });
  const body = translations(b.body, { max: 1200, requireTetum: true });
  const icon = type === 'mission' ? '' : (ICONS.includes(b.icon) ? b.icon : 'code');
  return { title, body, icon };
}

router.post('/items', can('items.manage'), wrap((req, res) => {
  const b = req.body || {};
  if (!TYPES.includes(b.type)) throw new HttpError(400, 'Invalid type.');
  const f = itemFields(b, b.type);
  const max = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS n FROM items WHERE type = ?').get(b.type).n;
  const r = db.prepare('INSERT INTO items(type, icon, sort_order, active, title, body) VALUES(?,?,?,?,?,?)')
    .run(b.type, f.icon, max + 1, b.active === false ? 0 : 1, JSON.stringify(f.title), JSON.stringify(f.body));
  audit(req, 'item.create', b.type, r.lastInsertRowid);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.put('/items/:id', can('items.manage'), wrap((req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(int(req.params.id));
  if (!row) throw new HttpError(404, 'Item not found.');
  const b = req.body || {};
  const f = itemFields(b, row.type);
  db.prepare("UPDATE items SET icon=?, title=?, body=?, active=?, updated_at=datetime('now') WHERE id=?")
    .run(f.icon, JSON.stringify(f.title), JSON.stringify(f.body), b.active === false ? 0 : 1, row.id);
  audit(req, 'item.update', row.type, row.id);
  res.json({ ok: true });
}));

router.post('/items/reorder', can('items.manage'), wrap((req, res) => {
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.map((x) => int(x)) : [];
  if (!ids.length || ids.length > 200) throw new HttpError(400, 'Invalid order.');
  tx(() => {
    const st = db.prepare('UPDATE items SET sort_order = ? WHERE id = ?');
    ids.forEach((id, i) => st.run(i + 1, id));
  });
  audit(req, 'item.reorder', 'item', '', ids.join(','));
  res.json({ ok: true });
}));

router.delete('/items/:id', can('items.manage'), wrap((req, res) => {
  const r = db.prepare('DELETE FROM items WHERE id = ?').run(int(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Item not found.');
  audit(req, 'item.delete', 'item', req.params.id);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */
router.get('/messages', can('messages.read'), (req, res) => {
  const status = ['new', 'read', 'archived'].includes(req.query.status) ? req.query.status : null;
  const q = String(req.query.q || '').trim().slice(0, 80);
  const page = Math.max(1, int(req.query.page, 1));
  const size = 20;
  const where = [];
  const args = [];
  if (status) { where.push('status = ?'); args.push(status); }
  if (q) { where.push('(name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)'); const l = `%${q.replace(/[%_]/g, '')}%`; args.push(l, l, l, l); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM messages ${w}`).get(...args).n;
  const rows = db.prepare(`SELECT * FROM messages ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
  res.json({ messages: rows, total, page, pages: Math.max(1, Math.ceil(total / size)) });
});

router.patch('/messages/:id', can('messages.manage'), wrap((req, res) => {
  const status = req.body && req.body.status;
  if (!['new', 'read', 'archived'].includes(status)) throw new HttpError(400, 'Invalid status.');
  const r = db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, int(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Message not found.');
  audit(req, 'message.status', 'message', req.params.id, status);
  res.json({ ok: true });
}));

router.delete('/messages/:id', can('messages.manage'), wrap((req, res) => {
  const r = db.prepare('DELETE FROM messages WHERE id = ?').run(int(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Message not found.');
  audit(req, 'message.delete', 'message', req.params.id);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */
const userOut = (u) => ({
  id: u.id, name: u.name, email: u.email, active: !!u.active, role_id: u.role_id, role: u.role, role_label: u.role_label,
  last_login: u.last_login, created_at: u.created_at,
});
const userSql = 'SELECT u.*, r.name AS role, r.label AS role_label FROM users u JOIN roles r ON r.id = u.role_id';
const isSuper = (req) => req.user.role === 'super_admin';
const activeSupers = () => db.prepare("SELECT COUNT(*) AS n FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='super_admin' AND u.active=1").get().n;

router.get('/users', can('users.read'), (req, res) => {
  res.json({ users: db.prepare(`${userSql} ORDER BY u.id`).all().map(userOut) });
});

function resolveRole(req, roleId) {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(int(roleId));
  if (!role) throw new HttpError(400, 'Invalid role.');
  // Only a super admin may hand out the super_admin role.
  if (role.name === 'super_admin' && !isSuper(req)) throw new HttpError(403, 'Only a Super Admin can assign the Super Admin role.');
  return role;
}

router.post('/users', can('users.manage'), wrap(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  if (name.length < 2) throw new HttpError(400, 'Name is required.');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid e-mail is required.');
  const bad = validatePassword(b.password);
  if (bad) throw new HttpError(400, bad);
  const role = resolveRole(req, b.role_id);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'E-mail already in use.');
  const r = db.prepare('INSERT INTO users(name, email, password_hash, role_id, active) VALUES(?,?,?,?,?)')
    .run(name, email, await pw.hash(b.password), role.id, b.active === false ? 0 : 1);
  audit(req, 'user.create', 'user', r.lastInsertRowid, `${email} (${role.name})`);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.put('/users/:id', can('users.manage'), wrap(async (req, res) => {
  const id = int(req.params.id);
  const target = db.prepare(`${userSql} WHERE u.id = ?`).get(id);
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.role === 'super_admin' && !isSuper(req)) throw new HttpError(403, 'Only a Super Admin can modify a Super Admin.');
  const b = req.body || {};
  const name = String(b.name == null ? target.name : b.name).trim().slice(0, 120);
  const email = String(b.email == null ? target.email : b.email).trim().toLowerCase().slice(0, 160);
  if (name.length < 2) throw new HttpError(400, 'Name is required.');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid e-mail is required.');
  const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id <> ?').get(email, id);
  if (dup) throw new HttpError(409, 'E-mail already in use.');
  const role = b.role_id != null ? resolveRole(req, b.role_id) : db.prepare('SELECT * FROM roles WHERE id = ?').get(target.role_id);
  const active = b.active === false ? 0 : 1;
  if (id === req.user.id && (!active || role.id !== target.role_id)) {
    throw new HttpError(400, 'You cannot deactivate or change the role of your own account.');
  }
  if (target.role === 'super_admin' && (role.name !== 'super_admin' || !active) && activeSupers() <= 1) {
    throw new HttpError(400, 'At least one active Super Admin is required.');
  }
  let bump = (!active || role.id !== target.role_id) ? 1 : 0; // revoke sessions when access changes
  let hash = null;
  if (b.password) {
    const bad = validatePassword(b.password);
    if (bad) throw new HttpError(400, bad);
    hash = await pw.hash(b.password);
    bump = 1;
  }
  db.prepare(`UPDATE users SET name=?, email=?, role_id=?, active=?, ${hash ? 'password_hash=?,' : ''} token_version = token_version + ? WHERE id=?`)
    .run(...[name, email, role.id, active, ...(hash ? [hash] : []), bump, id]);
  audit(req, 'user.update', 'user', id, `${email} (${role.name})${hash ? ' +password' : ''}`);
  res.json({ ok: true });
}));

router.delete('/users/:id', can('users.manage'), wrap((req, res) => {
  const id = int(req.params.id);
  const target = db.prepare(`${userSql} WHERE u.id = ?`).get(id);
  if (!target) throw new HttpError(404, 'User not found.');
  if (id === req.user.id) throw new HttpError(400, 'You cannot delete your own account.');
  if (target.role === 'super_admin' && !isSuper(req)) throw new HttpError(403, 'Only a Super Admin can delete a Super Admin.');
  if (target.role === 'super_admin' && activeSupers() <= 1) throw new HttpError(400, 'At least one active Super Admin is required.');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  audit(req, 'user.delete', 'user', id, target.email);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Roles & permissions (RBAC)                                          */
/* ------------------------------------------------------------------ */
router.get('/roles', can('users.read'), (req, res) => {
  const perms = db.prepare('SELECT key, description FROM permissions ORDER BY key').all();
  const roles = db.prepare('SELECT * FROM roles ORDER BY id').all().map((r) => ({
    id: r.id, name: r.name, label: r.label, description: r.description, system: !!r.system,
    permissions: db.prepare('SELECT perm_key FROM role_permissions WHERE role_id = ?').all(r.id).map((x) => x.perm_key),
    users: db.prepare('SELECT COUNT(*) AS n FROM users WHERE role_id = ?').get(r.id).n,
  }));
  res.json({ roles, permissions: perms });
});

function roleFields(b) {
  const label = String(b.label || '').trim().slice(0, 60);
  if (label.length < 2) throw new HttpError(400, 'Role name is required.');
  const description = String(b.description || '').trim().slice(0, 200);
  const valid = new Set(db.prepare('SELECT key FROM permissions').all().map((p) => p.key));
  const perms = [...new Set((Array.isArray(b.permissions) ? b.permissions : []).filter((p) => valid.has(p)))];
  return { label, description, perms };
}

router.post('/roles', can('roles.manage'), wrap((req, res) => {
  const f = roleFields(req.body || {});
  const name = f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'role';
  let unique = name; let n = 1;
  while (db.prepare('SELECT 1 FROM roles WHERE name = ?').get(unique)) unique = `${name}_${++n}`;
  const id = tx(() => {
    const r = db.prepare('INSERT INTO roles(name, label, description, system) VALUES(?,?,?,0)').run(unique, f.label, f.description);
    const ins = db.prepare('INSERT INTO role_permissions(role_id, perm_key) VALUES(?,?)');
    f.perms.forEach((p) => ins.run(r.lastInsertRowid, p));
    return Number(r.lastInsertRowid);
  });
  audit(req, 'role.create', 'role', id, unique);
  res.status(201).json({ id });
}));

router.put('/roles/:id', can('roles.manage'), wrap((req, res) => {
  const id = int(req.params.id);
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
  if (!role) throw new HttpError(404, 'Role not found.');
  if (role.system) throw new HttpError(400, 'System roles cannot be edited.');
  const f = roleFields(req.body || {});
  tx(() => {
    db.prepare('UPDATE roles SET label = ?, description = ? WHERE id = ?').run(f.label, f.description, id);
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
    const ins = db.prepare('INSERT INTO role_permissions(role_id, perm_key) VALUES(?,?)');
    f.perms.forEach((p) => ins.run(id, p));
    // permissions changed -> force affected users to re-authenticate
    db.prepare('UPDATE users SET token_version = token_version + 1 WHERE role_id = ? AND id <> ?').run(id, req.user.id);
  });
  audit(req, 'role.update', 'role', id, f.perms.join(','));
  res.json({ ok: true });
}));

router.delete('/roles/:id', can('roles.manage'), wrap((req, res) => {
  const id = int(req.params.id);
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
  if (!role) throw new HttpError(404, 'Role not found.');
  if (role.system) throw new HttpError(400, 'System roles cannot be deleted.');
  if (db.prepare('SELECT COUNT(*) AS n FROM users WHERE role_id = ?').get(id).n) {
    throw new HttpError(400, 'Role is still assigned to users. Reassign them first.');
  }
  db.prepare('DELETE FROM roles WHERE id = ?').run(id);
  audit(req, 'role.delete', 'role', id, role.name);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */
router.get('/audit', can('audit.read'), (req, res) => {
  const page = Math.max(1, int(req.query.page, 1));
  const size = 25;
  const total = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?').all(size, (page - 1) * size);
  res.json({ rows, total, page, pages: Math.max(1, Math.ceil(total / size)) });
});

module.exports = router;
