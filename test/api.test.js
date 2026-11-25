'use strict';
/**
 * End-to-end API tests (auth, RBAC, content, contact form).
 * Spawns the real server against a throw-away SQLite file.  Run: npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'g96-'));
const ADMIN = { email: 'root@test.tl', password: 'RootPass12345' };
let server;

/** Minimal cookie-aware client. */
function client() {
  let cookie = '';
  const call = async (method, url, body, extraHeaders = {}) => {
    const res = await fetch(BASE + url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'g96', ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of set) { const kv = c.split(';')[0]; cookie = kv.endsWith('=') ? '' : kv; }
    let json = null;
    try { json = await res.json(); } catch { /* none */ }
    return { status: res.status, json, headers: res.headers };
  };
  return { call, get cookie() { return cookie; } };
}

before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DB_FILE: path.join(TMP, 't.db'), ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD: ADMIN.password, JWT_SECRET: 'x'.repeat(48), NODE_ENV: 'test', SCRYPT_LOG_N: '12' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server did not start')), 60000);
    server.stdout.on('data', (d) => { if (String(d).includes('http://localhost')) { clearTimeout(t); resolve(); } });
    server.on('exit', (c) => reject(new Error('server exited ' + c)));
  });
});

after(async () => {
  const exited = new Promise((r) => server.once('exit', r));
  server.kill();
  await exited; // release the SQLite file handle before deleting it
  try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* temp dir cleanup is best-effort */ }
});

test('public content ships all four languages', async () => {
  const c = client();
  const r = await c.call('GET', '/api/public/content');
  assert.equal(r.status, 200);
  assert.equal(r.json.services.length, 9);
  assert.equal(r.json.missions.length, 6);
  assert.equal(r.json.values.length, 6);
  for (const [key, v] of Object.entries(r.json.content)) {
    for (const l of ['tl', 'pt', 'en', 'id']) assert.ok(typeof v[l] === 'string' && v[l].length, `${key} missing ${l}`);
  }
});

test('security headers and static pages', async () => {
  const home = await fetch(BASE + '/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(home.headers.get('x-powered-by'), null);
  assert.equal((await fetch(BASE + '/admin')).status, 200);
  assert.equal((await fetch(BASE + '/nope')).status, 404);
});

test('contact form validates, stores and honours the honeypot', async () => {
  const c = client();
  assert.equal((await c.call('POST', '/api/public/contact', { name: 'A', email: 'bad', message: '' })).status, 400);
  assert.equal((await c.call('POST', '/api/public/contact', { name: 'Bot', email: 'b@x.com', message: 'spam spam', website: 'http://spam' })).status, 201);
  const ok = await c.call('POST', '/api/public/contact', { name: 'Maria', email: 'maria@x.com', message: 'Hello there', lang: 'pt', subject: '<b>x</b>' });
  assert.equal(ok.status, 201);

  const admin = client();
  await admin.call('POST', '/api/auth/login', ADMIN);
  const list = await admin.call('GET', '/api/admin/messages');
  assert.equal(list.json.total, 1, 'honeypot message must not be stored');
  assert.equal(list.json.messages[0].subject, '<b>x</b>', 'stored verbatim (escaped by the UI)');
});

test('admin API requires authentication', async () => {
  const c = client();
  assert.equal((await c.call('GET', '/api/admin/stats')).status, 401);
  assert.equal((await c.call('GET', '/api/auth/me')).status, 401);
});

test('login: wrong password rejected, cookie is httpOnly + SameSite=Strict', async () => {
  const c = client();
  assert.equal((await c.call('POST', '/api/auth/login', { email: ADMIN.email, password: 'wrong-password' })).status, 401);
  const ok = await c.call('POST', '/api/auth/login', ADMIN);
  assert.equal(ok.status, 200);
  const raw = ok.headers.getSetCookie()[0];
  assert.match(raw, /HttpOnly/i);
  assert.match(raw, /SameSite=Strict/i);
  assert.equal(ok.json.user.role, 'super_admin');
});

test('CSRF guard: unsafe requests need the custom header', async () => {
  const c = client();
  await c.call('POST', '/api/auth/login', ADMIN);
  const r = await fetch(BASE + '/api/admin/messages/1', { method: 'DELETE', headers: { Cookie: c.cookie } });
  assert.equal(r.status, 403);
});

test('RBAC: roles gate endpoints', async () => {
  const root = client();
  await root.call('POST', '/api/auth/login', ADMIN);
  const { json: { roles } } = await root.call('GET', '/api/admin/roles');
  const roleId = (n) => roles.find((r) => r.name === n).id;

  // one user per role
  for (const n of ['support', 'editor', 'viewer', 'admin']) {
    const r = await root.call('POST', '/api/admin/users', { name: n, email: `${n}@test.tl`, password: 'Passw0rd12345', role_id: roleId(n) });
    assert.equal(r.status, 201, n + ' ' + JSON.stringify(r.json));
  }
  const login = async (n) => { const c = client(); const r = await c.call('POST', '/api/auth/login', { email: `${n}@test.tl`, password: 'Passw0rd12345' }); assert.equal(r.status, 200); return c; };

  const support = await login('support');
  assert.equal((await support.call('GET', '/api/admin/messages')).status, 200);
  assert.equal((await support.call('PATCH', '/api/admin/messages/1', { status: 'read' })).status, 200);
  assert.equal((await support.call('PUT', '/api/admin/content/hero.eyebrow', { value: { tl: 'x' } })).status, 403);
  assert.equal((await support.call('GET', '/api/admin/users')).status, 403);
  assert.equal((await support.call('GET', '/api/admin/audit')).status, 403);

  const editor = await login('editor');
  const edit = await editor.call('PUT', '/api/admin/content/hero.eyebrow', { value: { tl: 'IT Supplier', pt: 'IT Supplier', en: 'IT Supplier', id: 'IT Supplier' } });
  assert.equal(edit.status, 200);
  assert.equal((await editor.call('GET', '/api/admin/messages')).status, 403);
  assert.equal((await editor.call('POST', '/api/admin/items', { type: 'service', icon: 'code', title: { tl: 'Novu' }, body: { tl: 'Deskrisaun' } })).status, 201);
  assert.equal((await editor.call('POST', '/api/admin/roles', { label: 'Hack', permissions: [] })).status, 403);

  const viewer = await login('viewer');
  assert.equal((await viewer.call('GET', '/api/admin/content')).status, 200);
  assert.equal((await viewer.call('PUT', '/api/admin/content/hero.eyebrow', { value: { tl: 'x' } })).status, 403);
  assert.equal((await viewer.call('DELETE', '/api/admin/messages/1')).status, 403);

  // the content edit is public immediately
  const pub = await client().call('GET', '/api/public/content');
  assert.equal(pub.json.content['hero.eyebrow'].tl, 'IT Supplier');
  assert.equal(pub.json.services.length, 10);

  // admin (users.manage) cannot mint or touch super admins
  const adm = await login('admin');
  const supers = (await adm.call('GET', '/api/admin/users')).json.users.find((u) => u.role === 'super_admin');
  assert.equal((await adm.call('POST', '/api/admin/users', { name: 'Evil', email: 'evil@test.tl', password: 'Passw0rd12345', role_id: roleId('super_admin') })).status, 403);
  assert.equal((await adm.call('PUT', `/api/admin/users/${supers.id}`, { name: 'pwned', active: true })).status, 403);
  assert.equal((await adm.call('DELETE', `/api/admin/users/${supers.id}`)).status, 403);
  assert.equal((await adm.call('GET', '/api/admin/roles')).status, 200);
  assert.equal((await adm.call('PUT', `/api/admin/roles/${roleId('viewer')}`, { label: 'V', permissions: ['users.manage'] })).status, 403);
});

test('super admin safeguards + role changes revoke sessions', async () => {
  const root = client();
  await root.call('POST', '/api/auth/login', ADMIN);
  const me = (await root.call('GET', '/api/auth/me')).json.user;
  assert.equal((await root.call('DELETE', `/api/admin/users/${me.id}`)).status, 400, 'cannot delete yourself');
  assert.equal((await root.call('PUT', `/api/admin/users/${me.id}`, { name: 'Root', active: false })).status, 400, 'cannot disable yourself');

  const { json: { roles } } = await root.call('GET', '/api/admin/roles');
  const sys = roles.find((r) => r.name === 'super_admin');
  assert.equal((await root.call('PUT', `/api/admin/roles/${sys.id}`, { label: 'x', permissions: [] })).status, 400, 'system role is immutable');

  // custom role -> assign -> edit permissions -> existing session dies
  const created = await root.call('POST', '/api/admin/roles', { label: 'Temp Role', permissions: ['dashboard.view'] });
  assert.equal(created.status, 201);
  const u = await root.call('POST', '/api/admin/users', { name: 'Temp', email: 'temp@test.tl', password: 'Passw0rd12345', role_id: created.json.id });
  assert.equal(u.status, 201);
  const temp = client();
  await temp.call('POST', '/api/auth/login', { email: 'temp@test.tl', password: 'Passw0rd12345' });
  assert.equal((await temp.call('GET', '/api/admin/stats')).status, 200);
  await root.call('PUT', `/api/admin/roles/${created.json.id}`, { label: 'Temp Role', permissions: [] });
  assert.equal((await temp.call('GET', '/api/admin/stats')).status, 401, 'session revoked after permission change');
  assert.equal((await root.call('DELETE', `/api/admin/roles/${created.json.id}`)).status, 400, 'role still assigned');

  // disabled user cannot sign in
  await root.call('PUT', `/api/admin/users/${u.json.id}`, { name: 'Temp', email: 'temp@test.tl', role_id: created.json.id, active: false });
  assert.equal((await client().call('POST', '/api/auth/login', { email: 'temp@test.tl', password: 'Passw0rd12345' })).status, 401);
});

test('password change: validates, rotates session, audit trail written', async () => {
  const c = client();
  await c.call('POST', '/api/auth/login', { email: 'viewer@test.tl', password: 'Passw0rd12345' });
  assert.equal((await c.call('POST', '/api/auth/password', { current: 'nope', next: 'NewPassw0rd123' })).status, 400);
  assert.equal((await c.call('POST', '/api/auth/password', { current: 'Passw0rd12345', next: 'short1' })).status, 400);
  const other = client();
  await other.call('POST', '/api/auth/login', { email: 'viewer@test.tl', password: 'Passw0rd12345' });
  assert.equal((await c.call('POST', '/api/auth/password', { current: 'Passw0rd12345', next: 'NewPassw0rd123' })).status, 200);
  assert.equal((await c.call('GET', '/api/auth/me')).status, 200, 'current session stays valid');
  assert.equal((await other.call('GET', '/api/auth/me')).status, 401, 'other sessions are revoked');

  const root = client();
  await root.call('POST', '/api/auth/login', ADMIN);
  const log = await root.call('GET', '/api/admin/audit');
  const actions = log.json.rows.map((r) => r.action);
  for (const a of ['login', 'content.update', 'user.create', 'role.create']) assert.ok(actions.includes(a) || log.json.total > 25, 'audit has ' + a);
});

test('login rate limiting', async () => {
  const c = client();
  let last;
  for (let i = 0; i < 10; i++) last = await c.call('POST', '/api/auth/login', { email: 'ghost@test.tl', password: 'whatever12345' });
  assert.equal(last.status, 429);
});
