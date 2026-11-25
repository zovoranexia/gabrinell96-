'use strict';
const crypto = require('node:crypto');
const pw = require('./password');
const cfg = require('./config');
const { db, tx } = require('./db');
const D = require('./seed-data');

const j = JSON.stringify;

function seed() {
  tx(() => {
    // permissions (always in sync with code)
    const insPerm = db.prepare(
      'INSERT INTO permissions(key, description) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET description = excluded.description'
    );
    for (const [k, d] of D.PERMISSIONS) insPerm.run(k, d);

    // roles: create missing ones; super_admin always owns every permission
    const getRole = db.prepare('SELECT id FROM roles WHERE name = ?');
    const insRole = db.prepare('INSERT INTO roles(name, label, description, system) VALUES(?,?,?,?)');
    const insRP = db.prepare('INSERT OR IGNORE INTO role_permissions(role_id, perm_key) VALUES(?, ?)');
    for (const r of D.ROLES) {
      let row = getRole.get(r.name);
      if (!row) {
        const res = insRole.run(r.name, r.label, r.description, r.system);
        row = { id: Number(res.lastInsertRowid) };
        for (const p of r.permissions) insRP.run(row.id, p);
      } else if (r.name === 'super_admin') {
        for (const p of r.permissions) insRP.run(row.id, p);
      }
    }

    // contents: insert only missing keys so admin edits are never overwritten
    const insC = db.prepare('INSERT OR IGNORE INTO contents(key, section, value) VALUES(?,?,?)');
    for (const [key, arr] of Object.entries(D.CONTENT)) insC.run(key, key.split('.')[0], j(D.toObj(arr)));

    // items: seed a type only when it has no rows yet
    const count = db.prepare('SELECT COUNT(*) AS n FROM items WHERE type = ?');
    const insI = db.prepare('INSERT INTO items(type, icon, sort_order, title, body) VALUES(?,?,?,?,?)');
    if (!count.get('service').n) {
      D.SERVICES.forEach((s, i) => insI.run('service', s[0], i + 1, j(D.toObj(s[1])), j(D.toObj(s[2]))));
    }
    if (!count.get('mission').n) {
      D.MISSIONS.forEach((m, i) => insI.run('mission', '', i + 1, j({}), j(D.toObj(m))));
    }
    if (!count.get('value').n) {
      D.VALUES.forEach((v, i) => insI.run('value', v[0], i + 1, j(D.toObj(v[1])), j(D.toObj(v[2]))));
    }
  });
  return ensureAdmin();
}

function ensureAdmin() {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n) return null;
  const role = db.prepare("SELECT id FROM roles WHERE name = 'super_admin'").get();
  const generated = !cfg.ADMIN_PASSWORD;
  const password = cfg.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url') + '#7';
  db.prepare('INSERT INTO users(name, email, password_hash, role_id) VALUES(?,?,?,?)').run(
    'Super Admin',
    cfg.ADMIN_EMAIL,
    pw.hashSync(password),
    role.id
  );
  return { email: cfg.ADMIN_EMAIL, password, generated };
}

module.exports = { seed };

if (require.main === module) {
  if (process.argv.includes('--reset')) {
    db.exec('DELETE FROM contents; DELETE FROM items;');
    console.log('Content & items cleared; re-seeding defaults...');
  }
  const r = seed();
  console.log('Seed complete.', r && r.generated ? `Admin: ${r.email} / ${r.password}` : '');
}
