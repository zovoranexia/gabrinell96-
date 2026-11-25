/* Gabrinell 96 — landing page behaviour: i18n (tl/pt/en/id), loader, parallax, reveal, contact form */
(() => {
  'use strict';

  const LANGS = ['tl', 'pt', 'en', 'id'];
  const DEFAULT_LANG = 'tl';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  };

  const state = { lang: DEFAULT_LANG, data: null };

  /* ------------------------------------------------------------------ */
  /* Language                                                            */
  /* ------------------------------------------------------------------ */
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    const saved = store.get('g96-lang');
    return LANGS.includes(saved) ? saved : DEFAULT_LANG; // Tetun is the default
  }

  /** Pick the text for the active language, falling back to Tetun then English. */
  const pick = (obj) => (obj && (obj[state.lang] || obj.tl || obj.en)) || '';
  const t = (key) => pick(state.data && state.data.content[key]);

  /** Fill an element; "*word*" becomes a gradient-highlighted span (built with DOM nodes, never innerHTML). */
  function fillRich(el, text) {
    el.textContent = '';
    text.split(/\*([^*]+)\*/).forEach((part, i) => {
      if (!part) return;
      if (i % 2) {
        const s = document.createElement('span');
        s.className = 'grad';
        s.textContent = part;
        el.appendChild(s);
      } else el.appendChild(document.createTextNode(part));
    });
  }

  function applyStatic() {
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (v) el.textContent = v; });
    $$('[data-i18n-html]').forEach((el) => { const v = t(el.dataset.i18nHtml); if (v) fillRich(el, v); });
    document.documentElement.lang = state.lang;
    document.documentElement.dataset.lang = state.lang;
    const title = t('meta.title');
    if (title) document.title = title;
    const desc = t('meta.description');
    if (desc) {
      $('meta[name="description"]').setAttribute('content', desc);
      $('meta[property="og:description"]').setAttribute('content', desc);
    }
    $('#lang-current').textContent = state.lang.toUpperCase();
    $('#lang-flag').src = `/assets/img/flags/${state.lang}.svg`;
    $$('#lang-menu li').forEach((li) => li.setAttribute('aria-selected', String(li.dataset.lang === state.lang)));
  }

  /* ------------------------------------------------------------------ */
  /* Dynamic lists (services, missions, values)                          */
  /* ------------------------------------------------------------------ */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name, cls = 'ico') {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', cls);
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#i-${/^[a-z]+$/.test(name) ? name : 'code'}`);
    svg.appendChild(use);
    return svg;
  }

  function renderLists() {
    const d = state.data;
    const services = $('#services-list');
    services.replaceChildren(...d.services.map((s, i) => {
      const card = el('article', 'card');
      card.dataset.reveal = '';
      card.style.setProperty('--d', `${(i % 3) * 90}ms`);
      const ico = el('div', 'card__ico'); ico.appendChild(icon(s.icon));
      card.append(el('span', 'card__num', String(i + 1).padStart(2, '0')), ico, el('h3', '', pick(s.title)), el('p', '', pick(s.body)));
      return card;
    }));

    $('#missions-list').replaceChildren(...d.missions.map((m, i) => {
      const li = el('li', '', pick(m.body));
      li.dataset.reveal = '';
      li.style.setProperty('--d', `${i * 70}ms`);
      return li;
    }));

    $('#values-list').replaceChildren(...d.values.map((v, i) => {
      const box = el('article', 'val');
      box.dataset.reveal = '';
      box.style.setProperty('--d', `${(i % 3) * 90}ms`);
      const ico = el('div', 'val__ico'); ico.appendChild(icon(v.icon));
      box.append(ico, el('h3', '', pick(v.title)), el('p', '', pick(v.body)));
      return box;
    }));
    observeReveals();
  }

  function render() {
    applyStatic();
    renderLists();
    const sending = $('#form-submit').disabled;
    if (!sending) $('#form-submit-label').textContent = t('contact.form.send');
  }

  function setLang(lang) {
    if (!LANGS.includes(lang) || lang === state.lang) return;
    state.lang = lang;
    store.set('g96-lang', lang);
    const u = new URL(location.href);
    u.searchParams.set('lang', lang);
    history.replaceState(null, '', u);
    document.body.classList.add('lang-fade');
    render();
    setTimeout(() => document.body.classList.remove('lang-fade'), 60);
  }

  function initLangMenu() {
    const btn = $('#lang-btn');
    const menu = $('#lang-menu');
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-lang]');
      if (li) { setLang(li.dataset.lang); close(); }
    });
    document.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ------------------------------------------------------------------ */
  /* Loader                                                              */
  /* ------------------------------------------------------------------ */
  const loader = {
    bar: $('#loader-bar'),
    start: performance.now(),
    pct: 6,
    timer: null,
    run() {
      this.bar.style.width = this.pct + '%';
      this.timer = setInterval(() => {
        this.pct += (88 - this.pct) * 0.12; // ease towards 88% until content arrives
        this.bar.style.width = this.pct.toFixed(1) + '%';
      }, 180);
    },
    async finish() {
      clearInterval(this.timer);
      this.bar.style.width = '100%';
      const minShow = reduceMotion ? 200 : 2300; // let the logo animation play out
      const wait = Math.max(0, minShow - (performance.now() - this.start));
      await new Promise((r) => setTimeout(r, wait + 250));
      const ld = $('#loader');
      ld.classList.add('is-done');
      document.body.classList.remove('is-loading');
      startReveals();
      setTimeout(() => ld.remove(), 1400);
    },
  };

  async function fetchContent() {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch('/api/public/content', { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(to); }
  }

  async function boot() {
    const retry = $('#loader-retry');
    retry.hidden = true;
    loader.start = performance.now();
    loader.run();
    try {
      const [data] = await Promise.all([fetchContent(), document.fonts ? document.fonts.ready.catch(() => {}) : null]);
      state.data = data;
      state.lang = detectLang();
      document.documentElement.lang = state.lang;
      render();
      pingVisit();
      await loader.finish();
    } catch (err) {
      console.error(err);
      clearInterval(loader.timer);
      retry.hidden = false;
      retry.textContent = 'Retry / Koko fali';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */
  let io = null;
  let revealsStarted = false;
  function observeReveals() {
    if (!io || !revealsStarted) return;
    $$('[data-reveal]:not(.in)').forEach((n) => io.observe(n));
  }
  function startReveals() {
    revealsStarted = true;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      $$('[data-reveal]').forEach((n) => n.classList.add('in'));
      return;
    }
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    observeReveals();
  }

  /* ------------------------------------------------------------------ */
  /* Parallax (scroll + mouse)                                           */
  /* ------------------------------------------------------------------ */
  function initParallax() {
    if (reduceMotion) return;
    const layers = $$('[data-speed]').map((n) => ({ n, speed: parseFloat(n.dataset.speed) || 0, host: n.parentElement }));
    $$('[data-depth]').forEach((n) => n.style.setProperty('--depth', n.dataset.depth));
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      for (const l of layers) {
        const r = l.host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue; // off-screen
        const offset = r.top + r.height / 2 - vh / 2;
        l.n.style.setProperty('--py', (-offset * l.speed).toFixed(1));
      }
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    update();

    // Pointer-driven depth in the hero
    const hero = $('#home');
    if (hero && window.matchMedia('(pointer:fine)').matches) {
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      const loop = () => {
        cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
        hero.style.setProperty('--mx', cx.toFixed(3));
        hero.style.setProperty('--my', cy.toFixed(3));
        raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(loop) : 0;
      };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      hero.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Nav, progress, back-to-top, card spotlight                          */
  /* ------------------------------------------------------------------ */
  function initChrome() {
    const nav = $('#nav');
    const links = $('#nav-links');
    const burger = $('#burger');
    const progress = $('#progress');
    const totop = $('#totop');
    const sections = ['home', 'about', 'services', 'vision', 'values', 'structure', 'contact'].map((id) => $('#' + id));
    let lastY = 0;

    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      nav.classList.toggle('is-scrolled', y > 24);
      const menuOpen = links.classList.contains('open');
      nav.classList.toggle('is-hidden', y > 500 && y > lastY + 6 && !menuOpen); // hide while scrolling down
      if (y < lastY - 4 || y < 500) nav.classList.remove('is-hidden');
      lastY = y;
      totop.classList.toggle('show', y > 700);
      let current = sections[0];
      for (const s of sections) if (s.getBoundingClientRect().top <= window.innerHeight * 0.35) current = s;
      $$('a', links).forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    });
    const closeMenu = () => {
      links.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      burger.querySelector('use').setAttribute('href', '#i-menu');
    };
    links.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('#nav')) closeMenu(); });
    totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    // Spotlight following the pointer on service cards
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    $('#year').textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------ */
  /* Contact form                                                        */
  /* ------------------------------------------------------------------ */
  function initForm() {
    const form = $('#contact-form');
    const msg = $('#form-msg');
    const btn = $('#form-submit');
    const label = $('#form-submit-label');
    const say = (text, cls) => { msg.textContent = text; msg.className = 'form__msg ' + (cls || ''); };
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      const bad = {
        name: String(fd.name || '').trim().length < 2,
        email: !EMAIL.test(String(fd.email || '').trim()),
        message: String(fd.message || '').trim().length < 5,
      };
      ['name', 'email', 'message'].forEach((k) => $(`[name="${k}"]`, form).closest('.field').classList.toggle('is-invalid', bad[k]));
      if (bad.name || bad.email || bad.message) return say(t('contact.form.invalid'), 'err');

      btn.disabled = true;
      label.textContent = t('contact.form.sending');
      say('');
      try {
        const res = await fetch('/api/public/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fd, lang: state.lang }),
        });
        if (res.status === 429) say(t('contact.form.toomany'), 'err');
        else if (!res.ok) say(t('contact.form.error'), 'err');
        else { say(t('contact.form.success'), 'ok'); form.reset(); }
      } catch {
        say(t('contact.form.error'), 'err');
      } finally {
        btn.disabled = false;
        label.textContent = t('contact.form.send');
      }
    });
    form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-invalid'));
  }

  /* ------------------------------------------------------------------ */
  /* Analytics: one anonymous page-view per browser session              */
  /* ------------------------------------------------------------------ */
  function pingVisit() {
    try {
      if (sessionStorage.getItem('g96-visit')) return;
      sessionStorage.setItem('g96-visit', '1');
    } catch { /* ignore */ }
    fetch('/api/public/visit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: state.lang }), keepalive: true,
    }).catch(() => {});
  }

  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    $('#loader-retry').addEventListener('click', boot);
    initLangMenu();
    initChrome();
    initForm();
    initParallax();
    boot();
  });
})();
