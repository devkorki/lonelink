// server.js — LAN Share
// A small Express app for sharing files and text over your local network.

require('dotenv').config();

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const crypto  = require('crypto');

// ---------- Config ----------
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // listen on all interfaces so other LAN devices can reach us
const SHARE_PASSWORD = process.env.SHARE_PASSWORD || ''; // empty -> auth disabled
const MAX_UPLOAD_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '500', 10);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const ROOT       = __dirname;
const UPLOAD_DIR = path.resolve(ROOT, 'uploads');
const DATA_DIR   = path.resolve(ROOT, 'data');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');

// Make sure storage folders exist on first run.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR,   { recursive: true });
if (!fs.existsSync(ITEMS_FILE)) fs.writeFileSync(ITEMS_FILE, '[]', 'utf8');

// ---------- Helpers ----------

// Read text items from JSON. Returns [] on any error so the app keeps working.
function readTextItems() {
  try {
    const raw = fs.readFileSync(ITEMS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read items.json:', err);
    return [];
  }
}

function writeTextItems(items) {
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

// Resolve a user-supplied filename safely under UPLOAD_DIR.
// Returns the absolute path, or null if the input looks like a path-traversal attempt.
function safeUploadPath(filename) {
  if (typeof filename !== 'string' || filename.length === 0) return null;
  // Reject anything with directory separators or relative segments.
  const base = path.basename(filename);
  if (base !== filename) return null;
  if (base === '.' || base === '..') return null;
  const abs = path.resolve(UPLOAD_DIR, base);
  // Final guard: must live under UPLOAD_DIR.
  if (abs !== UPLOAD_DIR && !abs.startsWith(UPLOAD_DIR + path.sep)) return null;
  return abs;
}

// ---------- Auth (optional, cookie-based) ----------
// If SHARE_PASSWORD is empty, all auth checks pass.
// Otherwise we set an httpOnly cookie with a random token after a successful login.

const validTokens = new Set();

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k) out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

function isAuthed(req) {
  if (!SHARE_PASSWORD) return true;
  const cookies = parseCookies(req);
  return !!(cookies.lanshare && validTokens.has(cookies.lanshare));
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  // For API / file endpoints respond with 401, otherwise redirect to login page.
  if (req.path.startsWith('/api') || req.path.startsWith('/files')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return res.redirect('/login');
}

// ---------- App setup ----------
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ----- Public auth routes -----
app.get('/login', (req, res) => {
  if (!SHARE_PASSWORD) return res.redirect('/');
  res.sendFile(path.join(ROOT, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
  if (!SHARE_PASSWORD) return res.redirect('/');
  const submitted = (req.body && req.body.password) || '';
  if (submitted === SHARE_PASSWORD) {
    const token = newToken();
    validTokens.add(token);
    // 30-day cookie. Not "Secure" because we run plain HTTP on a LAN.
    res.setHeader(
      'Set-Cookie',
      `lanshare=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );
    return res.redirect('/');
  }
  return res.redirect('/login?error=1');
});

app.post('/logout', (req, res) => {
  const cookies = parseCookies(req);
  if (cookies.lanshare) validTokens.delete(cookies.lanshare);
  res.setHeader('Set-Cookie', 'lanshare=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login');
});

// ----- Auth gate for everything below -----
app.use(requireAuth);

// ----- Static frontend (only after auth) -----
app.use(express.static(path.join(ROOT, 'public')));

// ----- Multer config -----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Keep the original name visible but prefix with timestamp + uuid to avoid collisions.
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^\w\-. ]+/g, '_') // strip anything weird
      .slice(0, 80) || 'file';
    const id = crypto.randomUUID();
    cb(null, `${Date.now()}_${id}_${baseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

// ---------- API ----------

// GET /api/items — list of files (from disk) and text items (from JSON), newest first.
app.get('/api/items', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR)
    .filter(name => !name.startsWith('.'))
    .map(name => {
      const abs = path.join(UPLOAD_DIR, name);
      const stat = fs.statSync(abs);
      return {
        name,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const texts = readTextItems()
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  res.json({
    files,
    texts,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    passwordEnabled: !!SHARE_PASSWORD
  });
});

// POST /api/text — add a text item.
app.post('/api/text', (req, res) => {
  const content = (req.body && req.body.content) || '';
  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'content required' });
  }
  if (content.length > 100000) {
    return res.status(413).json({ error: 'text too large (max 100,000 chars)' });
  }
  const items = readTextItems();
  const newItem = {
    id: crypto.randomUUID(),
    content,
    createdAt: new Date().toISOString()
  };
  items.push(newItem);
  writeTextItems(items);
  res.status(201).json(newItem);
});

// DELETE /api/text/:id — remove a text item by id.
app.delete('/api/text/:id', (req, res) => {
  const id = req.params.id;
  const items = readTextItems();
  const next = items.filter(i => i.id !== id);
  if (next.length === items.length) {
    return res.status(404).json({ error: 'not found' });
  }
  writeTextItems(next);
  res.json({ ok: true });
});

// POST /api/upload — upload one or more files.
// Wrapped so we can translate Multer errors into clean JSON.
app.post('/api/upload', (req, res) => {
  upload.array('files', 50)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: `File too large. Max is ${MAX_UPLOAD_SIZE_MB} MB per file.`
        });
      }
      return res.status(400).json({ error: err.message || 'upload failed' });
    }
    const files = (req.files || []).map(f => ({ name: f.filename, size: f.size }));
    res.status(201).json({ files });
  });
});

// GET /files/:filename — download a file.
app.get('/files/:filename', (req, res) => {
  const abs = safeUploadPath(req.params.filename);
  if (!abs || !fs.existsSync(abs)) {
    return res.status(404).send('Not found');
  }
  res.download(abs);
});

// DELETE /api/files/:filename — delete a file.
app.delete('/api/files/:filename', (req, res) => {
  const abs = safeUploadPath(req.params.filename);
  if (!abs || !fs.existsSync(abs)) {
    return res.status(404).json({ error: 'not found' });
  }
  fs.unlinkSync(abs);
  res.json({ ok: true });
});

// ---------- Startup banner ----------
function printLanUrls() {
  const ifaces = os.networkInterfaces();
  const urls = [];
  Object.values(ifaces).forEach(list => {
    (list || []).forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) {
        urls.push(`http://${addr.address}:${PORT}`);
      }
    });
  });

  console.log('\n=========================================');
  console.log('  LAN Share is running');
  console.log('=========================================');
  console.log(`  Local:    http://localhost:${PORT}`);
  if (urls.length === 0) {
    console.log('  Network:  (no external IPv4 interfaces detected)');
  } else {
    urls.forEach((u, i) => {
      console.log(`  Network:  ${u}${i === 0 ? '   <-- open this on your phone' : ''}`);
    });
  }
  console.log('-----------------------------------------');
  console.log(`  Password: ${SHARE_PASSWORD ? 'ENABLED' : 'disabled (set SHARE_PASSWORD in .env)'}`);
  console.log(`  Max file: ${MAX_UPLOAD_SIZE_MB} MB`);
  console.log(`  Uploads:  ${UPLOAD_DIR}`);
  console.log('=========================================');
  console.log('  Press Ctrl+C to stop.\n');
}

app.listen(PORT, HOST, () => {
  printLanUrls();
});
