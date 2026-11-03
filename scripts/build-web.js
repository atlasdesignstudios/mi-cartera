// Genera la versión web estática (GitHub Pages) en dist/.
// Reutiliza la lógica de server.js y la ejecuta dentro del navegador:
// las peticiones a api/ se resuelven en local y los datos se guardan en localStorage.
// Uso: node scripts/build-web.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

function slice(startMarker, endMarker) {
  const start = server.indexOf(startMarker);
  const end = server.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`No se encontró el bloque ${startMarker} … ${endMarker} en server.js`);
  return server.slice(start, end);
}

// Lógica de dominio: constantes, validación, recurrentes, demo e importación.
const core = slice("const VERSION = ", '// ---------------------------------------------------------------- HTTP')
  .replace("fs.mkdirSync(BACKUP_DIR, { recursive: true });", '');
// Motor fiscal (public/fiscal.js) dentro de su propio ámbito para no chocar con los nombres del servidor.
const fiscalSrc = fs.readFileSync(path.join(PUBLIC_DIR, 'fiscal.js'), 'utf8');
const fiscalExports = [...fiscalSrc.matchAll(/^export (?:const|function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
const fiscal = 'const { invoiceTotals, purchaseTotals, validateNif, IVA_RATES, TAX_MODES } = (function () {\n'
  + fiscalSrc.replace(/^export /gm, '') + '\nreturn { ' + fiscalExports.join(', ') + ' };\n})();\n';
// Iconos (public/glyphs.js): el servidor solo necesita normalizar las claves.
const glyphSrc = fs.readFileSync(path.join(PUBLIC_DIR, 'glyphs.js'), 'utf8');
const glyphs = 'const { normalizeGlyph } = (function () {\n' + glyphSrc.replace(/^export /gm, '') + '\nreturn { normalizeGlyph };\n})();\n';
// Router de la API.
const router = slice('function collectionById(', 'const server = http.createServer(');

const shim = String.raw`/* Mi Cartera — servidor dentro del navegador (generado por scripts/build-web.js, no editar a mano). */
(function () {
'use strict';
globalThis.MC_WEB = true;
const LS_KEY = 'micartera.web.db.v1';
const DATA_DIR = 'este navegador';
const DB_FILE = 'localStorage';
const BACKUP_DIR = '';
const PORT = '';
const path = { join: (...parts) => parts.join('/') };
const process = { exit() {}, argv: [], platform: 'web' };
const fs = {};
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const crypto = {
  randomUUID: () => (globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID()
    : toHex(globalThis.crypto.getRandomValues(new Uint8Array(16))).replace(/^(.{8})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4-')),
  randomBytes: (n) => { const hex = toHex(globalThis.crypto.getRandomValues(new Uint8Array(n))); return { toString: () => hex }; }
};
let firstVisit = false;
`;

const overrides = String.raw`
// ------------------------------------------------ sustituciones para el navegador
function writeDb(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch { throw new HttpError(507, 'No queda espacio en el navegador. Exporta una copia y borra datos antiguos.'); }
  const name = 'db-' + todayISO() + '.json';
  if (!readBackupStore().some((b) => b.name === name)) { try { addWebBackup(name, 'daily', state); } catch { /* opcional */ } }
}
function loadDb() {
  const base = defaultState();
  let parsed = null;
  try { parsed = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { parsed = null; }
  if (!parsed || typeof parsed !== 'object') { firstVisit = true; return base; }
  const settings = { ...base.settings, ...(parsed.settings || {}) };
  settings.theme = THEMES.includes(settings.theme) ? settings.theme : 'auto';
  settings.currency = /^[A-Z]{3}$/.test(String(settings.currency || '').toUpperCase()) ? String(settings.currency).toUpperCase() : 'EUR';
  settings.locale = validLocale(settings.locale, 'es-ES');
  const list = (k, fallback = []) => (Array.isArray(parsed[k]) ? parsed[k] : fallback);
  return {
    ...base, ...parsed, settings,
    accounts: list('accounts', base.accounts), categories: list('categories', base.categories),
    transactions: list('transactions'), investments: list('investments'), ops: list('ops'),
    recurring: list('recurring'), goals: list('goals'), loans: list('loans'),
    clients: list('clients'), invoices: list('invoices'), purchases: list('purchases'), deleted: list('deleted'),
    rev: Number(parsed.rev) || 0
  };
}
function loadDbUpgraded() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { raw = null; }
  const state = loadDb();
  upgradeSettings(state, (raw && raw.settings) || {});
  return state;
}
// Copias automáticas dentro del navegador: una diaria (5 días) y las de seguridad (5).
const BK_KEY = 'micartera.web.backups.v1';
function readBackupStore() {
  try { const list = JSON.parse(localStorage.getItem(BK_KEY) || '[]'); return Array.isArray(list) ? list : []; } catch { return []; }
}
function writeBackupStore(list) {
  let items = list.slice();
  while (items.length) {
    try { localStorage.setItem(BK_KEY, JSON.stringify(items)); return; } catch { items = items.slice(1); }
  }
  try { localStorage.removeItem(BK_KEY); } catch { /* nada */ }
}
function pruneBackups(list) {
  const daily = list.filter((b) => b.kind === 'daily').slice(-5);
  const other = list.filter((b) => b.kind !== 'daily').slice(-5);
  return [...daily, ...other].sort((a, b) => a.at.localeCompare(b.at));
}
function addWebBackup(name, kind, state) {
  const list = readBackupStore().filter((b) => b.name !== name);
  list.push({ name, kind, at: new Date().toISOString(), data: JSON.parse(JSON.stringify(state)) });
  writeBackupStore(pruneBackups(list));
}
function listBackups() {
  return readBackupStore().map((b) => ({
    name: b.name, at: b.at, kind: b.kind, size: JSON.stringify(b.data || {}).length, counts: backupCounts(b.data)
  })).sort((a, b) => b.at.localeCompare(a.at));
}
function readBackup(name) {
  const found = readBackupStore().find((b) => b.name === name);
  if (!found) throw new HttpError(404, 'No se encontró esa copia.');
  return found.data;
}
function saveBackupNow(label = 'manual') {
  const d = new Date();
  const name = 'db-' + label + '-' + todayISO() + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.json';
  addWebBackup(name, label === 'manual' ? 'manual' : 'safety', db);
  return name;
}
function networkInfo() { return { web: true }; }
function sealPackage() { throw bad('El cifrado se hace directamente en el navegador.'); }
function openPackage() { throw bad('El descifrado se hace directamente en el navegador.'); }
// Yahoo Finance no permite llamadas directas desde una página web (CORS). En la versión web
// las consultas pasan por un intermediario público que solo ve el símbolo (por ejemplo AAPL).
const MARKET_ROUTES = [
  { url: (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u) },
  { url: (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u) },
  { url: (u) => 'https://api.allorigins.win/get?url=' + encodeURIComponent(u), wrapped: true }
];
let marketRoute = 0;
function customProxyRoute() {
  const base = String((typeof db !== 'undefined' && db && db.settings && db.settings.marketProxy) || '').trim();
  if (!/^https:\/\//i.test(base)) return null;
  return { url: (u) => base + encodeURIComponent(u), custom: base };
}
async function tryRoute(route, url) {
  const target = route.custom && route.custom.includes('{url}') ? route.custom.replace('{url}', encodeURIComponent(url)) : route.url(url);
  let response;
  try {
    response = await nativeFetch(target, { signal: AbortSignal.timeout(9000) });
  } catch {
    throw Object.assign(new Error('sin respuesta'), { network: true });
  }
  if (response.status === 404) throw Object.assign(new Error('Ese valor no existe en el mercado.'), { final: true });
  if (!response.ok) throw Object.assign(new Error('HTTP ' + response.status), { network: true });
  let body = await response.json().catch(() => null);
  if (route.wrapped && body && typeof body.contents === 'string') {
    try { body = JSON.parse(body.contents); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') throw Object.assign(new Error('Respuesta vacía'), { network: true });
  if (body.chart && body.chart.error && /not found|no data/i.test(String(body.chart.error.description || ''))) {
    throw Object.assign(new Error('Ese valor no existe en el mercado.'), { final: true });
  }
  return body;
}
async function marketFetchJson(url) {
  // Coinbase, el BCE y Finnhub permiten llamadas directas desde el navegador: sin intermediario.
  if (!/yahoo\.com/i.test(url)) {
    let response;
    try { response = await nativeFetch(url, { signal: AbortSignal.timeout(10000) }); }
    catch { throw Object.assign(new Error('No hay conexión con el servicio de cotizaciones.'), { network: true }); }
    if (response.status === 404) throw new Error('Ese valor no existe en el mercado.');
    if (!response.ok) throw Object.assign(new Error('HTTP ' + response.status), { network: response.status === 429 || response.status >= 500 });
    const body = await response.json().catch(() => null);
    if (!body) throw Object.assign(new Error('Respuesta vacía'), { network: true });
    return body;
  }
  const custom = customProxyRoute();
  if (custom) {
    try { return await tryRoute(custom, url); } catch (err) { if (err.final) throw err; }
  }
  // Se prueba primero el intermediario que funcionó la última vez y, si falla, los demás a la vez.
  // Los intermediarios públicos fallan a ratos: si ninguno responde, se espera un momento y se reintenta una vez.
  try { return await tryRoute(MARKET_ROUTES[marketRoute], url); } catch (err) { if (err.final) throw err; }
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500));
    const routes = MARKET_ROUTES.map((r, i) => ({ r, i })).filter(({ i }) => attempt || i !== marketRoute);
    try {
      return await Promise.any(routes.map(({ r, i }) => tryRoute(r, url).then((body) => { marketRoute = i; return body; })));
    } catch (agg) {
      const fin = (agg.errors || []).find((e) => e.final);
      if (fin) throw fin;
    }
  }
  throw Object.assign(new Error('El intermediario público que usa la web para consultar Yahoo Finance no responde ahora mismo.'), { network: true });
}
// SHA-256 síncrono (el PIN solo protege este navegador).
function sha256Hex(text) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  const total = ((len + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(total); m.set(bytes); m[len] = 0x80;
  const bits = len * 8;
  new DataView(m.buffer).setUint32(total - 4, bits >>> 0); new DataView(m.buffer).setUint32(total - 8, Math.floor(bits / 2 ** 32));
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const W = new Uint32Array(64); const dv = new DataView(m.buffer);
  const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = r(W[i-15], 7) ^ r(W[i-15], 18) ^ (W[i-15] >>> 3);
      const s1 = r(W[i-2], 17) ^ r(W[i-2], 19) ^ (W[i-2] >>> 10);
      W[i] = (W[i-16] + s0 + W[i-7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}
function stretch(pin, salt) {
  let h = salt + ':' + pin;
  for (let i = 0; i < 2000; i++) h = sha256Hex(h + salt);
  return h;
}
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':web:' + stretch(String(pin), salt);
}
function verifyPin(pin, stored) {
  if (!stored) return true;
  const parts = String(stored).split(':');
  if (parts.length !== 3 || parts[1] !== 'web') return false;
  return stretch(String(pin ?? ''), parts[0]) === parts[2];
}
function clientIp() { return 'browser'; }
// La sesión se recuerda 30 días en este navegador (ligada al PIN actual).
const SESSION_KEY = 'micartera.web.session.v1';
function createSession() {
  const sid = crypto.randomBytes(24).toString('hex');
  const exp = Date.now() + SESSION_MS;
  sessions.set(sid, exp);
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ sid, exp, pin: db.settings.pinHash })); } catch { /* sin recordar */ }
  return sid;
}
function json(res, code, data, extraHeaders = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(JSON.stringify(data));
}
async function readJson(req) {
  if (!req.body) return {};
  try { return JSON.parse(req.body); } catch { throw bad('El contenido no es JSON válido.'); }
}

// ------------------------------------------------ arranque
// Primera visita: la app empieza vacía y la bienvenida ofrece cargar datos de ejemplo.
db = loadDbUpgraded();
if (firstVisit) commit();
try { runRecurringAndSave(); } catch { /* reintenta luego */ }
setInterval(() => { try { runRecurringAndSave(); } catch { /* reintenta luego */ } }, 60 * 60 * 1000);

// ------------------------------------------------ fetch local para api/
let cookie = '';
try {
  const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (saved && saved.exp > Date.now() && saved.pin && saved.pin === db.settings.pinHash) {
    sessions.set(saved.sid, saved.exp);
    cookie = 'mc_session=' + saved.sid;
  }
} catch { /* sin sesión */ }
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async function (input, init = {}) {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const idx = url.pathname.indexOf('/api/');
  if (url.origin !== location.origin || idx < 0) return nativeFetch(input, init);
  const pathname = decodeURIComponent(url.pathname.slice(idx));
  const req = { method: (init.method || 'GET').toUpperCase(), headers: { cookie }, body: init.body || '', url: pathname };
  let status = 200; let headers = {}; let body = '';
  const res = {
    headersSent: false,
    setHeader(k, v) { headers[k] = v; },
    writeHead(code, h = {}) { status = code; headers = { ...headers, ...h }; this.headersSent = true; },
    end(text = '') { body = text; }
  };
  try {
    await handleApi(req, res, pathname);
  } catch (err) {
    if (!res.headersSent) {
      const code = err instanceof HttpError ? err.status : 500;
      if (code === 500) console.error(err);
      json(res, code, { error: err instanceof HttpError ? err.message : 'Error interno.' });
    }
  }
  const setCookie = headers['Set-Cookie'];
  if (setCookie) {
    cookie = String(setCookie).split(';')[0];
    if (cookie === 'mc_session=') { try { localStorage.removeItem(SESSION_KEY); } catch { /* nada */ } }
  }
  const out = new Headers();
  for (const [k, v] of Object.entries(headers)) if (k.toLowerCase() !== 'set-cookie') out.set(k, String(v));
  return new Response(status === 204 ? null : body, { status, headers: out });
};
})();
`;

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(PUBLIC_DIR, DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'local-api.js'), shim + fiscal + glyphs + core + '\n' + router + overrides, 'utf8');

const indexPath = path.join(DIST, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('<script type="module" src="app.js"></script>')) throw new Error('index.html no tiene el script esperado');
fs.writeFileSync(indexPath, html.replace('<script type="module" src="app.js"></script>',
  '<script src="local-api.js"></script>\n  <script type="module" src="app.js"></script>'), 'utf8');

const swPath = path.join(DIST, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8').replace("'app.js',", "'app.js', 'local-api.js',").replace("const CACHE = 'micartera-", "const CACHE = 'micartera-web-");
fs.writeFileSync(swPath, sw, 'utf8');
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

console.log('Versión web generada en dist/');
