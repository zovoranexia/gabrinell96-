'use strict';
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cfg = require('./config');
const { seed } = require('./seed');
const S = require('./security');

const created = seed();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', cfg.isProd ? 1 : false);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: cfg.isProd,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

/* ---------------- API ---------------- */
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api/public', require('./routes/public'));
app.use('/api/auth', S.csrfGuard, S.loadUser, require('./routes/auth'));
app.use('/api/admin', S.csrfGuard, S.loadUser, S.requireAuth, require('./routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found', message: 'Unknown endpoint.' }));

/* ---------------- Static site ---------------- */
const staticOpts = { maxAge: cfg.isProd ? '1h' : 0, etag: true };
app.use(express.static(cfg.PUBLIC_DIR, staticOpts));
app.get('/admin', (req, res) => res.sendFile(path.join(cfg.PUBLIC_DIR, 'admin', 'index.html')));
app.use((req, res) => res.status(404).sendFile(path.join(cfg.PUBLIC_DIR, '404.html')));

/* ---------------- Errors ---------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json', message: 'Invalid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'too_large', message: 'Request too large.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.code || 'error', message: status >= 500 ? 'Server error.' : err.message });
});

app.listen(cfg.PORT, () => {
  console.log(`\n  Gabrinell 96 web  ->  http://localhost:${cfg.PORT}`);
  console.log(`  Admin dashboard   ->  http://localhost:${cfg.PORT}/admin`);
  if (created) {
    console.log('\n  First run: super admin created');
    console.log(`    e-mail   : ${created.email}`);
    console.log(`    password : ${created.generated ? created.password : '(from ADMIN_PASSWORD)'}`);
    if (created.generated) console.log('    (shown once - change it after signing in)');
  }
  console.log('');
});
