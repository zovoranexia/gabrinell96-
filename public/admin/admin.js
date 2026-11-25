/* Gabrinell 96 — admin dashboard (vanilla SPA, hash router, permission-aware) */
(() => {
  'use strict';

  const LANGS = [
    { code: 'tl', name: 'Tetun (default)' },
    { code: 'pt', name: 'Português' },
    { code: 'en', name: 'English' },
    { code: 'id', name: 'Bahasa Indonesia' },
  ];
  const SECTION_TITLES = {
    meta: 'SEO / Meta', nav: 'Navigation', hero: 'Hero', about: 'About', services: 'Services section', vision: 'Vision', mission: 'Mission section',
    values: 'Values section', org: 'Organization structure', contact: 'Contact', footer: 'Footer',
  };
  const SECTION_ORDER = Object.keys(SECTION_TITLES);
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------------- tiny DOM helper (no innerHTML => no XSS) ---------------- */
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'class') n.className = v;
      else if (k === 'value') n.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'readOnly') n[k] = !!v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return n;
  }
  const svg = (id, cls = 'ico') => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', cls);
    const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#' + id);
    s.append(u);
    return s;
  };
  const fmtDate = (s) => {
    if (!s) return '—';
    const d = new Date(String(s).replace(' ', 'T') + 'Z');
    return isNaN(d) ? s : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  /* ---------------- API ---------------- */
  let me = null;
  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'g96' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      if (res.status === 401 && me) { me = null; showLogin('Your session has expired. Please sign in again.'); }
      const err = new Error((data && data.message) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }
  const can = (p) => !!me && me.permissions.includes(p);

  /* ---------------- toasts / modal / confirm ---------------- */
  function toast(msg, isErr) {
    const t = h('div', { class: 'toast' + (isErr ? ' err' : ''), role: 'status' }, msg);
    $('#toasts').append(t);
    setTimeout(() => t.remove(), isErr ? 6000 : 3200);
  }
  function modal({ title, body, footer, small, onClose }) {
    const root = $('#modal-root');
    const close = () => { bg.remove(); document.removeEventListener('keydown', esc); if (onClose) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    const bg = h('div', { class: 'modal-bg', onmousedown: (e) => { if (e.target === bg) close(); } },
      h('div', { class: 'modal' + (small ? ' modal--sm' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'modal__head' }, h('h2', {}, title), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: close }, '✕')),
        h('div', { class: 'modal__body' }, body),
        footer ? h('div', { class: 'modal__foot' }, typeof footer === 'function' ? footer(close) : footer) : null));
    document.addEventListener('keydown', esc);
    root.append(bg);
    const first = bg.querySelector('input,textarea,select');
    if (first) first.focus();
    return close;
  }
  function confirmBox(title, text, okLabel = 'Delete') {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v, close) => { done = true; close(); resolve(v); };
      modal({
        title, small: true, body: h('p', {}, text),
        footer: (close) => [
          h('button', { class: 'btn', type: 'button', onclick: () => finish(false, close) }, 'Cancel'),
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => finish(true, close) }, okLabel),
        ],
        onClose: () => { if (!done) resolve(false); },
      });
    });
  }
  async function run(btn, fn) {
    if (btn) btn.disabled = true;
    try { return await fn(); } catch (e) { toast(e.message, true); } finally { if (btn) btn.disabled = false; }
  }

  /* ---------------- auth views ---------------- */
  function showLogin(note) {
    $('#app').hidden = true;
    $('#login-view').hidden = false;
    $('#login-error').textContent = note || '';
    $('#login-password').value = '';
  }
  function showApp() {
    $('#login-view').hidden = true;
    $('#app').hidden = false;
    $('#top-user').replaceChildren(
      h('div', {}, h('b', {}, me.name), h('small', {}, me.role_label)),
      h('div', { class: 'avatar', title: me.email }, (me.name || '?').trim().charAt(0).toUpperCase()));
    buildNav();
    route();
    refreshUnread();
  }
  function initLogin() {
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#login-btn');
      btn.disabled = true;
      $('#login-error').textContent = '';
      try {
        const r = await api('POST', '/api/auth/login', { email: $('#login-email').value, password: $('#login-password').value });
        me = r.user;
        if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
        showApp();
      } catch (err) { $('#login-error').textContent = err.message; }
      finally { btn.disabled = false; }
    });
    $('#btn-logout').addEventListener('click', async () => {
      try { await api('POST', '/api/auth/logout'); } catch { /* ignore */ }
      me = null;
      showLogin('You have been signed out.');
    });
  }

  /* ---------------- navigation & router ---------------- */
  const PAGES = [
    { group: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: 'a-dash', perm: 'dashboard.view', render: pageDashboard },
    { group: 'Website' },
    { id: 'content', label: 'Texts & translations', icon: 'a-text', perm: 'content.read', render: pageContent },
    { id: 'items', label: 'Services & values', icon: 'a-grid', perm: 'content.read', render: pageItems },
    { id: 'messages', label: 'Messages', icon: 'a-mail', perm: 'messages.read', render: pageMessages, badge: true },
    { group: 'Access control' },
    { id: 'users', label: 'Users', icon: 'a-users', perm: 'users.read', render: pageUsers },
    { id: 'roles', label: 'Roles & permissions', icon: 'a-shield', perm: 'users.read', render: pageRoles },
    { id: 'audit', label: 'Audit log', icon: 'a-log', perm: 'audit.read', render: pageAudit },
    { group: 'Account' },
    { id: 'account', label: 'My account', icon: 'a-key', render: pageAccount },
  ];
  const allowed = (p) => !p.perm || can(p.perm);

  function buildNav() {
    const nav = $('#side-nav');
    nav.replaceChildren();
    let pendingGroup = null;
    for (const p of PAGES) {
      if (p.group) { pendingGroup = p.group; continue; }
      if (!allowed(p)) continue;
      if (pendingGroup) { nav.append(h('div', { class: 'side__group' }, pendingGroup)); pendingGroup = null; }
      nav.append(h('a', { class: 'side__link', href: '#/' + p.id, 'data-page': p.id },
        svg(p.icon), h('span', {}, p.label), p.badge ? h('span', { class: 'count', id: 'unread-badge', hidden: '' }, '0') : null));
    }
  }
  async function refreshUnread() {
    const b = $('#unread-badge');
    if (!b || !can('messages.read')) return;
    try {
      const r = await api('GET', '/api/admin/messages?status=new');
      b.textContent = r.total > 99 ? '99+' : r.total;
      b.hidden = r.total === 0;
    } catch { /* ignore */ }
  }

  async function route() {
    if (!me) return;
    const id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'dashboard';
    let page = PAGES.find((p) => p.id === id && allowed(p));
    if (!page) page = PAGES.find((p) => p.id && allowed(p));
    document.querySelectorAll('.side__link[data-page]').forEach((a) => a.classList.toggle('active', a.dataset.page === page.id));
    $('#page-title').textContent = page.label;
    document.title = `${page.label} | Gabrinell 96 Admin`;
    closeSide();
    const view = $('#view');
    view.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    try {
      const content = await page.render();
      view.replaceChildren(content);
    } catch (e) {
      view.replaceChildren(h('div', { class: 'card card__body' }, h('p', { class: 'form-error' }, e.message)));
    }
  }
  const closeSide = () => { $('#side').classList.remove('open'); $('#side-scrim').classList.remove('open'); };
  function initShell() {
    $('#burger').addEventListener('click', () => { $('#side').classList.toggle('open'); $('#side-scrim').classList.toggle('open'); });
    $('#side-scrim').addEventListener('click', closeSide);
    window.addEventListener('hashchange', route);
  }
  const rerender = () => route();

  /* ================================================================== */
  /* Dashboard                                                          */
  /* ================================================================== */
  async function pageDashboard() {
    const s = await api('GET', '/api/admin/stats');
    const t = s.totals;
    const max = Math.max(1, ...s.days.map((d) => d.visits));
    const totalLang = s.byLang.reduce((a, b) => a + b.n, 0) || 1;
    const langName = Object.fromEntries(LANGS.map((l) => [l.code, l.name.replace(' (default)', '')]));
    const stat = (icon, val, label) => h('div', { class: 'card stat' }, h('div', { class: 'stat__ico' }, svg(icon)), h('div', {}, h('b', {}, String(val)), h('small', {}, label)));

    const chart = h('div', { class: 'chart', role: 'img', 'aria-label': 'Visits in the last 14 days' },
      s.days.map((d) => h('div', { class: 'chart__col', title: `${d.day}: ${d.visits} visits, ${d.messages} messages` },
        d.messages ? h('span', { class: 'chart__msg' }) : null,
        h('div', { class: 'chart__bar', 'data-v': d.visits || '' }),
        h('span', { class: 'chart__lbl' }, d.day.slice(5)))));
    // heights are applied through CSSOM (CSP forbids inline style attributes)
    [...chart.querySelectorAll('.chart__bar')].forEach((bar, i) => { bar.style.height = `calc(${(s.days[i].visits / max) * 82}% + 3px)`; });

    const langRows = s.byLang.length
      ? s.byLang.sort((a, b) => b.n - a.n).map((l) => {
        const row = h('div', { class: 'row' },
          h('div', { class: 'meta' }, h('span', {}, langName[l.lang] || l.lang), h('span', { class: 'muted' }, `${l.n} · ${Math.round((l.n / totalLang) * 100)}%`)),
          h('div', { class: 'track' }, h('i', {})));
        row.querySelector('i').style.width = `${(l.n / totalLang) * 100}%`;
        return row;
      })
      : [h('p', { class: 'muted' }, 'No visits recorded yet.')];

    return h('div', { class: 'grid' },
      h('div', { class: 'grid grid--4' },
        stat('a-eye', t.visitsToday, 'Visits today'),
        stat('a-dash', t.visits30, 'Visits (30 days)'),
        stat('a-mail', t.messagesNew, `New messages (of ${t.messagesAll})`),
        stat('a-users', t.users, 'Active users')),
      h('div', { class: 'grid grid--2' },
        h('div', { class: 'card' },
          h('div', { class: 'card__head' }, h('h2', {}, 'Visits — last 14 days'),
            h('div', { class: 'legend' }, h('span', {}, h('i', {}), 'Visits'), h('span', {}, h('i', { class: 'b' }), 'Day with messages'))),
          h('div', { class: 'card__body' }, chart)),
        h('div', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', {}, 'Visitors by language (30d)')),
          h('div', { class: 'card__body langbars' }, langRows))),
      can('messages.read') ? h('div', { class: 'card' },
        h('div', { class: 'card__head' }, h('h2', {}, 'Latest messages'), h('a', { class: 'btn btn--sm', href: '#/messages' }, 'View all')),
        s.recent.length
          ? h('div', { class: 'mini-list' }, s.recent.map((m) => h('a', { href: '#/messages' },
            h('div', {}, h('b', {}, m.name), h('span', { class: 'muted' }, trunc(m.subject || m.email, 70))),
            h('div', { class: 'muted' }, m.status === 'new' ? h('span', { class: 'badge badge--new' }, 'new') : null, ' ', fmtDate(m.created_at)))))
          : h('div', { class: 'empty' }, 'No messages yet.')) : null);
  }

  /* ================================================================== */
  /* Content (translatable texts)                                       */
  /* ================================================================== */
  async function pageContent() {
    const { content } = await api('GET', '/api/admin/content');
    const editable = can('content.update');
    const search = h('input', { type: 'search', placeholder: 'Search key or text…', 'aria-label': 'Search' });
    const wrap = h('div', {});
    const groups = new Map();
    for (const c of content) { const s = c.section; (groups.get(s) || groups.set(s, []).get(s)).push(c); }
    const ordered = [...groups.keys()].sort((a, b) => (SECTION_ORDER.indexOf(a) + 99) % 99 - (SECTION_ORDER.indexOf(b) + 99) % 99);

    const items = [];
    for (const sec of ordered) {
      const box = h('section', { class: 'cgroup' }, h('h2', {}, SECTION_TITLES[sec] || sec));
      for (const c of groups.get(sec)) {
        const el = contentItem(c, editable);
        items.push({ el, c, box });
        box.append(el);
      }
      wrap.append(box);
    }
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      items.forEach(({ el, c }) => {
        const hay = (c.key + ' ' + Object.values(c.value).join(' ')).toLowerCase();
        el.hidden = q && !hay.includes(q);
      });
      wrap.querySelectorAll('.cgroup').forEach((g) => { g.hidden = ![...g.querySelectorAll('.citem')].some((i) => !i.hidden); });
    });
    return h('div', {},
      h('div', { class: 'toolbar' }, h('div', { class: 'grow' }, search),
        h('span', { class: 'hint' }, 'Tip: wrap a word in *asterisks* to highlight it in headings. Tetun is the default language and is required.')),
      wrap);
  }

  function contentItem(c, editable) {
    const val = { ...c.value };
    const preview = h('span', { class: 'preview' }, trunc(val.tl || '', 110));
    const head = h('div', { class: 'citem__head', role: 'button', tabindex: '0', 'aria-expanded': 'false' }, h('code', {}, c.key), preview, h('span', { class: 'muted' }, '▾'));
    const body = h('div', { class: 'citem__body' });
    const el = h('div', { class: 'card citem' }, head, body);
    let built = false;
    const toggle = () => {
      el.classList.toggle('open');
      head.setAttribute('aria-expanded', String(el.classList.contains('open')));
      if (built) return;
      built = true;
      const areas = {};
      const grid = h('div', { class: 'langs' }, LANGS.map((l) => {
        const long = (val[l.code] || '').length > 80 || c.key.match(/\.(p\d|text|note|subtitle|description|title|success|error)/);
        areas[l.code] = h(long ? 'textarea' : 'input', { value: val[l.code] || '', maxlength: 5000, readOnly: !editable, rows: long ? 4 : null, type: long ? null : 'text' });
        return h('label', {}, h('span', {}, l.name), areas[l.code]);
      }));
      const status = h('span', {}, c.updated_by ? `Last edited by ${c.updated_by} · ${fmtDate(c.updated_at)}` : 'Default text');
      const save = h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => run(save, async () => {
        const value = Object.fromEntries(LANGS.map((l) => [l.code, areas[l.code].value]));
        await api('PUT', '/api/admin/content/' + encodeURIComponent(c.key), { value });
        Object.assign(val, value);
        preview.textContent = trunc(value.tl, 110);
        status.textContent = `Saved just now · ${me.email}`;
        toast('Saved ✓');
      }) }, 'Save changes');
      body.append(grid, h('div', { class: 'citem__foot' }, status, editable ? save : h('span', {}, 'Read-only (no edit permission)')));
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    return el;
  }

  /* ================================================================== */
  /* Items: services / missions / values                                */
  /* ================================================================== */
  const ITEM_TABS = [
    { type: 'service', label: 'Services' },
    { type: 'mission', label: 'Missions' },
    { type: 'value', label: 'Core values' },
  ];
  let itemTab = 'service';

  async function pageItems() {
    const { items, icons } = await api('GET', '/api/admin/items');
    const manage = can('items.manage');
    const list = items.filter((i) => i.type === itemTab);
    const tabs = h('div', { class: 'tabs', role: 'tablist' }, ITEM_TABS.map((t) =>
      h('button', { class: 'tab' + (t.type === itemTab ? ' active' : ''), type: 'button', onclick: () => { itemTab = t.type; rerender(); } }, `${t.label} (${items.filter((i) => i.type === t.type).length})`)));

    const move = async (idx, dir) => {
      const ids = list.map((i) => i.id);
      const j = idx + dir;
      if (j < 0 || j >= ids.length) return;
      [ids[idx], ids[j]] = [ids[j], ids[idx]];
      await run(null, async () => { await api('POST', '/api/admin/items/reorder', { ids }); rerender(); });
    };

    const rows = list.map((it, idx) => h('tr', {},
      h('td', {}, manage ? h('div', { class: 'sortcell' },
        h('button', { class: 'btn btn--sm', type: 'button', 'aria-label': 'Move up', disabled: idx === 0, onclick: () => move(idx, -1) }, '▲'),
        h('button', { class: 'btn btn--sm', type: 'button', 'aria-label': 'Move down', disabled: idx === list.length - 1, onclick: () => move(idx, 1) }, '▼')) : idx + 1),
      h('td', {}, it.type === 'mission' ? '—' : h('span', { class: 'badge badge--blue' }, it.icon)),
      h('td', {}, h('b', {}, it.type === 'mission' ? trunc(it.body.tl || '', 90) : it.title.tl), it.type !== 'mission' ? h('div', { class: 'muted' }, trunc(it.body.tl || '', 90)) : null),
      h('td', {}, it.active ? h('span', { class: 'badge badge--ok' }, 'Visible') : h('span', { class: 'badge badge--off' }, 'Hidden')),
      h('td', {}, manage ? h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => itemModal(it, icons) }, 'Edit'),
        h('button', { class: 'btn btn--sm btn--danger', type: 'button', onclick: async () => {
          if (!(await confirmBox('Delete item', 'This removes it from the website permanently.'))) return;
          await run(null, async () => { await api('DELETE', '/api/admin/items/' + it.id); toast('Deleted'); rerender(); });
        } }, 'Delete')) : null)));

    return h('div', {},
      h('div', { class: 'toolbar' }, tabs, h('span', { class: 'grow' }),
        manage ? h('button', { class: 'btn btn--primary', type: 'button', onclick: () => itemModal({ type: itemTab, icon: 'code', active: true, title: {}, body: {} }, icons) }, '+ Add') : null),
      h('div', { class: 'card table-wrap' }, list.length
        ? h('table', {}, h('thead', {}, h('tr', {}, ['Order', 'Icon', 'Content (Tetun)', 'Status', ''].map((x) => h('th', {}, x)))), h('tbody', {}, rows))
        : h('div', { class: 'empty' }, 'Nothing here yet.')));
  }

  function itemModal(it, icons) {
    const isNew = !it.id;
    const isMission = it.type === 'mission';
    const f = { title: {}, body: {} };
    const iconSel = h('select', {}, icons.map((i) => h('option', { value: i, selected: i === it.icon }, i)));
    const active = h('input', { type: 'checkbox', checked: it.active });
    const blocks = [];
    if (!isMission) blocks.push(h('h3', {}, 'Title'), h('div', { class: 'langs' }, LANGS.map((l) => {
      f.title[l.code] = h('input', { type: 'text', value: it.title[l.code] || '', maxlength: 160 });
      return h('label', {}, h('span', {}, l.name), f.title[l.code]);
    })));
    blocks.push(h('h3', {}, isMission ? 'Statement' : 'Description'), h('div', { class: 'langs' }, LANGS.map((l) => {
      f.body[l.code] = h('textarea', { rows: 3, maxlength: 1200 }, it.body[l.code] || '');
      return h('label', {}, h('span', {}, l.name), f.body[l.code]);
    })));
    modal({
      title: (isNew ? 'Add ' : 'Edit ') + it.type,
      body: h('div', { class: 'fields' },
        isMission ? null : h('label', { class: 'lf' }, h('span', {}, 'Icon'), iconSel),
        h('label', { class: 'check' }, active, 'Visible on website'), ...blocks),
      footer: (close) => [
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: (e) => run(e.currentTarget, async () => {
          const payload = {
            type: it.type, icon: iconSel.value, active: active.checked,
            title: Object.fromEntries(LANGS.map((l) => [l.code, f.title[l.code] ? f.title[l.code].value : ''])),
            body: Object.fromEntries(LANGS.map((l) => [l.code, f.body[l.code].value])),
          };
          await api(isNew ? 'POST' : 'PUT', '/api/admin/items' + (isNew ? '' : '/' + it.id), payload);
          toast('Saved ✓'); close(); rerender();
        }) }, 'Save'),
      ],
    });
  }

  /* ================================================================== */
  /* Messages                                                           */
  /* ================================================================== */
  const msgState = { status: '', q: '', page: 1 };
  async function pageMessages() {
    const qs = new URLSearchParams({ page: msgState.page });
    if (msgState.status) qs.set('status', msgState.status);
    if (msgState.q) qs.set('q', msgState.q);
    const r = await api('GET', '/api/admin/messages?' + qs);
    const manage = can('messages.manage');
    const tabs = h('div', { class: 'tabs' }, [['', 'All'], ['new', 'New'], ['read', 'Read'], ['archived', 'Archived']].map(([v, l]) =>
      h('button', { class: 'tab' + (msgState.status === v ? ' active' : ''), type: 'button', onclick: () => { msgState.status = v; msgState.page = 1; rerender(); } }, l)));
    const search = h('input', { type: 'search', placeholder: 'Search messages…', value: msgState.q, 'aria-label': 'Search messages' });
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { msgState.q = search.value.trim(); msgState.page = 1; rerender(); } });

    const setStatus = async (m, status) => { await api('PATCH', '/api/admin/messages/' + m.id, { status }); m.status = status; refreshUnread(); };

    const rows = r.messages.map((m) => h('tr', { class: 'click' + (m.status === 'new' ? ' unread' : ''), onclick: () => showMessage(m, setStatus, manage) },
      h('td', {}, h('b', {}, m.name), h('div', { class: 'muted' }, m.email)),
      h('td', {}, h('span', { class: 'subj' }, trunc(m.subject || '(no subject)', 60)), h('div', { class: 'muted' }, trunc(m.message, 80))),
      h('td', {}, h('span', { class: 'badge' + (m.status === 'new' ? ' badge--new' : m.status === 'read' ? ' badge--ok' : '') }, m.status), ' ', h('span', { class: 'badge' }, m.lang.toUpperCase())),
      h('td', { class: 'muted' }, fmtDate(m.created_at))));

    const table = r.messages.length
      ? h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['From', 'Message', 'Status', 'Received'].map((x) => h('th', {}, x)))), h('tbody', {}, rows)))
      : h('div', { class: 'empty' }, 'No messages found.');
    return h('div', {}, h('div', { class: 'toolbar' }, tabs, h('div', { class: 'grow' }, search)),
      h('div', { class: 'card' }, table, pager(r, (p) => { msgState.page = p; rerender(); }, 'messages')));
  }

  function pager(r, go, noun) {
    return h('div', { class: 'pager' }, h('span', {}, `${r.total} ${noun} · page ${r.page} / ${r.pages}`),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn--sm', type: 'button', disabled: r.page <= 1, onclick: () => go(r.page - 1) }, '← Prev'),
        h('button', { class: 'btn btn--sm', type: 'button', disabled: r.page >= r.pages, onclick: () => go(r.page + 1) }, 'Next →')));
  }

  async function showMessage(m, setStatus, manage) {
    if (manage && m.status === 'new') { try { await setStatus(m, 'read'); } catch { /* non-fatal */ } }
    const meta = h('dl', { class: 'msg-meta' },
      h('dt', {}, 'From'), h('dd', {}, m.name),
      h('dt', {}, 'E-mail'), h('dd', {}, h('a', { href: 'mailto:' + m.email, class: 'badge badge--blue' }, m.email)),
      m.phone ? [h('dt', {}, 'Phone'), h('dd', {}, m.phone)] : null,
      h('dt', {}, 'Subject'), h('dd', {}, m.subject || '—'),
      h('dt', {}, 'Language'), h('dd', {}, m.lang.toUpperCase()),
      h('dt', {}, 'Received'), h('dd', {}, fmtDate(m.created_at)));
    modal({
      title: 'Message', body: h('div', {}, meta, h('div', { class: 'msg-text' }, m.message)),
      onClose: rerender,
      footer: (close) => [
        manage ? h('button', { class: 'btn btn--danger left', type: 'button', onclick: async () => {
          if (!(await confirmBox('Delete message', 'This message will be permanently deleted.'))) return;
          await run(null, async () => { await api('DELETE', '/api/admin/messages/' + m.id); toast('Deleted'); refreshUnread(); close(); });
        } }, 'Delete') : null,
        manage ? h('button', { class: 'btn', type: 'button', onclick: () => run(null, async () => { await setStatus(m, m.status === 'archived' ? 'read' : 'archived'); toast('Updated'); close(); }) }, m.status === 'archived' ? 'Unarchive' : 'Archive') : null,
        h('a', { class: 'btn btn--primary', href: 'mailto:' + m.email + '?subject=' + encodeURIComponent('Re: ' + (m.subject || 'Gabrinell 96')) }, 'Reply by e-mail'),
      ],
    });
  }

  /* ================================================================== */
  /* Users                                                              */
  /* ================================================================== */
  async function pageUsers() {
    const [{ users }, { roles }] = await Promise.all([api('GET', '/api/admin/users'), api('GET', '/api/admin/roles')]);
    const manage = can('users.manage');
    const rows = users.map((u) => h('tr', {},
      h('td', {}, h('b', {}, u.name), u.id === me.id ? h('span', { class: 'badge badge--blue' }, ' you') : null, h('div', { class: 'muted' }, u.email)),
      h('td', {}, h('span', { class: 'badge badge--blue' }, u.role_label)),
      h('td', {}, u.active ? h('span', { class: 'badge badge--ok' }, 'Active') : h('span', { class: 'badge badge--off' }, 'Disabled')),
      h('td', { class: 'muted' }, fmtDate(u.last_login)),
      h('td', {}, manage ? h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => userModal(u, roles) }, 'Edit'),
        u.id !== me.id ? h('button', { class: 'btn btn--sm btn--danger', type: 'button', onclick: async () => {
          if (!(await confirmBox('Delete user', `Delete ${u.email}? This cannot be undone.`))) return;
          await run(null, async () => { await api('DELETE', '/api/admin/users/' + u.id); toast('User deleted'); rerender(); });
        } }, 'Delete') : null) : null)));
    return h('div', {},
      h('div', { class: 'toolbar' }, h('span', { class: 'grow muted' }, `${users.length} users`),
        manage ? h('button', { class: 'btn btn--primary', type: 'button', onclick: () => userModal(null, roles) }, '+ New user') : null),
      h('div', { class: 'card table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['User', 'Role', 'Status', 'Last sign-in', ''].map((x) => h('th', {}, x)))), h('tbody', {}, rows))));
  }

  function userModal(u, roles) {
    const isNew = !u;
    const name = h('input', { type: 'text', value: u ? u.name : '', maxlength: 120, required: true });
    const email = h('input', { type: 'email', value: u ? u.email : '', maxlength: 160, required: true });
    const pass = h('input', { type: 'password', autocomplete: 'new-password', placeholder: isNew ? 'Min 10 chars, letters + numbers' : 'Leave blank to keep current' });
    const usable = roles.filter((r) => r.name !== 'super_admin' || me.role === 'super_admin');
    const role = h('select', {}, usable.map((r) => h('option', { value: r.id, selected: u ? r.id === u.role_id : r.name === 'viewer' }, r.label)));
    const active = h('input', { type: 'checkbox', checked: u ? u.active : true });
    const err = h('p', { class: 'form-error', role: 'alert' });
    modal({
      title: isNew ? 'New user' : 'Edit user',
      body: h('div', { class: 'fields' },
        h('label', { class: 'lf' }, h('span', {}, 'Full name'), name), h('label', { class: 'lf' }, h('span', {}, 'E-mail'), email),
        h('label', { class: 'lf' }, h('span', {}, isNew ? 'Password' : 'New password'), pass), h('label', { class: 'lf' }, h('span', {}, 'Role'), role),
        h('label', { class: 'check' }, active, 'Account is active'), err),
      footer: (close) => [
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: async (e) => {
          const btn = e.currentTarget; btn.disabled = true; err.textContent = '';
          try {
            const body = { name: name.value, email: email.value, role_id: Number(role.value), active: active.checked };
            if (pass.value || isNew) body.password = pass.value;
            await api(isNew ? 'POST' : 'PUT', '/api/admin/users' + (isNew ? '' : '/' + u.id), body);
            toast('Saved ✓'); close(); rerender();
          } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
        } }, 'Save'),
      ],
    });
  }

  /* ================================================================== */
  /* Roles & permissions                                                */
  /* ================================================================== */
  async function pageRoles() {
    const { roles, permissions } = await api('GET', '/api/admin/roles');
    const manage = can('roles.manage');
    const cards = roles.map((r) => h('article', { class: 'card role' },
      h('h3', {}, r.label, r.system ? h('span', { class: 'badge' }, 'system') : null, h('span', { class: 'badge badge--blue' }, `${r.users} user${r.users === 1 ? '' : 's'}`)),
      h('p', { class: 'muted' }, r.description || '—'),
      h('div', { class: 'chips' }, r.permissions.length ? r.permissions.map((p) => h('span', { class: 'chip' }, p)) : h('span', { class: 'muted' }, 'No permissions')),
      h('div', { class: 'row-actions' },
        manage ? [
          h('button', { class: 'btn btn--sm', type: 'button', onclick: () => roleModal(r, permissions) }, r.system ? 'View' : 'Edit'),
          !r.system ? h('button', { class: 'btn btn--sm btn--danger', type: 'button', disabled: r.users > 0, title: r.users ? 'Reassign users first' : '', onclick: async () => {
            if (!(await confirmBox('Delete role', `Delete the "${r.label}" role?`))) return;
            await run(null, async () => { await api('DELETE', '/api/admin/roles/' + r.id); toast('Role deleted'); rerender(); });
          } }, 'Delete') : null,
        ] : null)));
    return h('div', {},
      h('div', { class: 'toolbar' }, h('span', { class: 'grow muted' }, 'Permissions decide which pages and actions each role can use. Changes sign out affected users.'),
        manage ? h('button', { class: 'btn btn--primary', type: 'button', onclick: () => roleModal(null, permissions) }, '+ New role') : null),
      h('div', { class: 'roles' }, cards));
  }

  function roleModal(r, permissions) {
    const isNew = !r;
    const locked = r && r.system;
    const label = h('input', { type: 'text', value: r ? r.label : '', maxlength: 60, disabled: locked });
    const desc = h('input', { type: 'text', value: r ? r.description : '', maxlength: 200, disabled: locked });
    const boxes = permissions.map((p) => {
      const cb = h('input', { type: 'checkbox', value: p.key, checked: r ? r.permissions.includes(p.key) : false, disabled: locked });
      return { cb, el: h('label', { class: 'perm' }, cb, h('span', {}, h('b', {}, p.key), h('small', {}, p.description))) };
    });
    const err = h('p', { class: 'form-error', role: 'alert' });
    modal({
      title: isNew ? 'New role' : (locked ? 'Role: ' : 'Edit role: ') + r.label,
      body: h('div', { class: 'fields' }, h('label', { class: 'lf' }, h('span', {}, 'Name'), label), h('label', { class: 'lf' }, h('span', {}, 'Description'), desc),
        h('h3', {}, 'Permissions'), h('div', { class: 'perm-grid' }, boxes.map((b) => b.el)), err),
      footer: (close) => locked ? [h('button', { class: 'btn', type: 'button', onclick: close }, 'Close')] : [
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: async (e) => {
          const btn = e.currentTarget; btn.disabled = true; err.textContent = '';
          try {
            await api(isNew ? 'POST' : 'PUT', '/api/admin/roles' + (isNew ? '' : '/' + r.id),
              { label: label.value, description: desc.value, permissions: boxes.filter((b) => b.cb.checked).map((b) => b.cb.value) });
            toast('Saved ✓'); close(); rerender();
          } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
        } }, 'Save'),
      ],
    });
  }

  /* ================================================================== */
  /* Audit log                                                          */
  /* ================================================================== */
  let auditPage = 1;
  async function pageAudit() {
    const r = await api('GET', '/api/admin/audit?page=' + auditPage);
    const rows = r.rows.map((a) => h('tr', {},
      h('td', { class: 'muted' }, fmtDate(a.created_at)), h('td', {}, a.user_email || '—'),
      h('td', {}, h('span', { class: 'badge' + (a.action.endsWith('failed') ? ' badge--off' : ' badge--blue') }, a.action)),
      h('td', { class: 'mono' }, [a.entity, a.entity_id].filter(Boolean).join(' #')), h('td', {}, trunc(a.detail || '', 80)), h('td', { class: 'mono muted' }, a.ip)));
    return h('div', { class: 'card' }, r.rows.length
      ? h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['When', 'User', 'Action', 'Target', 'Detail', 'IP'].map((x) => h('th', {}, x)))), h('tbody', {}, rows)))
      : h('div', { class: 'empty' }, 'No activity yet.'),
    pager(r, (p) => { auditPage = p; rerender(); }, 'events'));
  }

  /* ================================================================== */
  /* Account                                                            */
  /* ================================================================== */
  async function pageAccount() {
    const cur = h('input', { type: 'password', autocomplete: 'current-password' });
    const next = h('input', { type: 'password', autocomplete: 'new-password' });
    const again = h('input', { type: 'password', autocomplete: 'new-password' });
    const err = h('p', { class: 'form-error', role: 'alert' });
    const form = h('form', { class: 'card card__body', novalidate: true, onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      if (next.value !== again.value) { err.textContent = 'New passwords do not match.'; return; }
      try { await api('POST', '/api/auth/password', { current: cur.value, next: next.value }); toast('Password updated ✓'); form.reset(); }
      catch (ex) { err.textContent = ex.message; }
    } },
    h('h2', { class: 'h' }, 'Signed in as ' + me.email), h('p', { class: 'muted' }, `Role: ${me.role_label}`),
    h('label', { class: 'lf' }, h('span', {}, 'Current password'), cur), h('label', { class: 'lf' }, h('span', {}, 'New password'), next),
    h('label', { class: 'lf' }, h('span', {}, 'Repeat new password'), again), h('p', { class: 'hint' }, 'At least 10 characters with letters and numbers. Other devices are signed out.'),
    err, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Update password'));
    form.style.maxWidth = '480px';
    return form;
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    initLogin();
    initShell();
    try {
      const r = await api('GET', '/api/auth/me');
      me = r.user;
      showApp();
    } catch { showLogin(); }
  });
})();
