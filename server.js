// Mi Cartera — servidor local sin dependencias externas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { invoiceTotals, purchaseTotals, validateNif, IVA_RATES, TAX_MODES, isValidIsoDate, roundMoney, normalizeInvoiceLines, normalizePurchaseInput } from './public/fiscal.js';
import { normalizeGlyph } from './public/glyphs.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const PORT = Number(process.env.PORT) || 4321;
// Por defecto escucha en toda la red local para poder abrirla desde el móvil.
// Con MC_HOST=127.0.0.1 se limita al propio ordenador.
const LISTEN_HOST = process.env.MC_HOST || '0.0.0.0';
const VERSION = '1.7.2';
let LISTEN_PORT = PORT;

fs.mkdirSync(BACKUP_DIR, { recursive: true });

const ACCOUNT_TYPES = ['bank', 'savings', 'cash', 'card', 'broker', 'other'];
const INVEST_TYPES = ['stock', 'etf', 'fund', 'crypto', 'deposit', 'other'];
const TX_TYPES = ['income', 'expense', 'transfer'];
const COLLECTIONS = ['accounts', 'categories', 'transactions', 'investments', 'ops', 'recurring', 'goals', 'loans', 'clients', 'invoices', 'purchases'];
const PROFILES = ['personal', 'autonomo', 'ambos'];
const MODULE_KEYS = ['budgets', 'recurring', 'goals', 'investments', 'loans', 'reports', 'business'];
const PURCHASE_KINDS = ['compras', 'material', 'suministros', 'alquiler', 'telefono', 'software', 'servicios', 'gestoria', 'publicidad', 'formacion', 'viajes', 'vehiculo', 'seguros', 'reta', 'otros'];
const CLIENT_KINDS = ['empresa', 'autonomo', 'particular'];
const TERRITORIES = ['comun', 'canarias', 'ceutamelilla', 'foral'];
const LOAN_TYPES = ['mortgage', 'personal', 'car', 'student', 'other'];
const SYMBOL_RE = /^[A-Za-z0-9.\-=^]{1,24}$/;
const MARKET_TYPES = ['stock', 'etf', 'fund', 'crypto'];
const PRICE_MODES = ['market', 'execution', 'manual', 'pending'];
const MARKET_SOURCE = 'Yahoo Finance';
const marketCache = new Map();
const DAY_MS = 86400000;
const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'];
const THEMES = ['auto', 'light', 'dark'];
const PALETTE = ['#0e9f6e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#f97316'];

const uid = () => crypto.randomUUID();
const pad = (n) => String(n).padStart(2, '0');
const round2 = (n) => roundMoney(n, 2);
const round8 = (n) => roundMoney(n, 8);
const round6 = (n) => roundMoney(n, 6);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const validDate = (s) => isValidIsoDate(s);
const validColor = (c) => (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : null);
const validLocale = (value, fallback = 'es-ES') => {
  const locale = clean(value, 20);
  if (!locale) return fallback;
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(locale).length ? locale : fallback;
  } catch {
    return fallback;
  }
};
const clean = (v, max = 200) =>
  String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);

// ---------------------------------------------------------------- estado base
function defaultState() {
  const cat = (name, kind, icon, color, budget = 0) => ({
    id: uid(), name, kind, icon, color, budget, createdAt: new Date().toISOString()
  });
  const acc = (name, type, color, initialBalance = 0) => ({
    id: uid(), name, type, color, initialBalance, note: '', createdAt: new Date().toISOString()
  });
  return {
    rev: 0,
    settings: { currency: 'EUR', locale: 'es-ES', theme: 'auto', pinHash: null, autoPrices: true, marketV15: true, pricesRefreshedAt: null, marketProxy: '', finnhubKey: '', profile: 'personal', onboarded: false, modules: defaultModules('personal'), business: sanitizeBusiness({}) },
    accounts: [
      acc('Cuenta principal', 'bank', '#0e9f6e'),
      acc('Ahorro', 'savings', '#3b82f6'),
      acc('Efectivo', 'cash', '#f59e0b')
    ],
    categories: [
      cat('Vivienda', 'expense', 'home', '#6366f1'),
      cat('Alimentación', 'expense', 'cart', '#10b981'),
      cat('Transporte', 'expense', 'car', '#f59e0b'),
      cat('Restaurantes', 'expense', 'utensils', '#f97316'),
      cat('Salud', 'expense', 'pill', '#ef4444'),
      cat('Ocio', 'expense', 'film', '#ec4899'),
      cat('Compras', 'expense', 'bag', '#8b5cf6'),
      cat('Suscripciones', 'expense', 'tv', '#06b6d4'),
      cat('Educación', 'expense', 'book', '#3b82f6'),
      cat('Viajes', 'expense', 'plane', '#14b8a6'),
      cat('Mascotas', 'expense', 'paw', '#a3e635'),
      cat('Impuestos', 'expense', 'receipt', '#64748b'),
      cat('Otros gastos', 'expense', 'box', '#94a3b8'),
      cat('Nómina', 'income', 'briefcase', '#0e9f6e'),
      cat('Freelance', 'income', 'laptop', '#0ea5e9'),
      cat('Dividendos', 'income', 'trend', '#8b5cf6'),
      cat('Intereses', 'income', 'bank', '#14b8a6'),
      cat('Ventas', 'income', 'tag', '#f59e0b'),
      cat('Regalos', 'income', 'gift', '#ec4899'),
      cat('Otros ingresos', 'income', 'plusCircle', '#94a3b8')
    ],
    transactions: [],
    investments: [],
    ops: [],
    recurring: [],
    goals: [],
    loans: [],
    clients: [],
    invoices: [],
    purchases: [],
    deleted: []
  };
}

// ---------------------------------------------------------------- persistencia
function writeDb(state) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
  const stamp = todayISO();
  const backup = path.join(BACKUP_DIR, `db-${stamp}.json`);
  if (!fs.existsSync(backup)) {
    try { fs.copyFileSync(DB_FILE, backup); } catch { /* sin copia, no es crítico */ }
  }
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const old of files.slice(0, Math.max(0, files.length - 14))) fs.unlinkSync(path.join(BACKUP_DIR, old));
  } catch { /* ignorar */ }
}

function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const base = defaultState();
    const settings = { ...base.settings, ...(parsed.settings || {}) };
    settings.theme = THEMES.includes(settings.theme) ? settings.theme : 'auto';
    settings.currency = /^[A-Z]{3}$/.test(String(settings.currency || '').toUpperCase())
      ? String(settings.currency).toUpperCase()
      : 'EUR';
    settings.locale = validLocale(settings.locale, 'es-ES');
    const state = {
      ...base,
      ...parsed,
      settings,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : base.accounts,
      categories: Array.isArray(parsed.categories) ? parsed.categories : base.categories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      investments: Array.isArray(parsed.investments) ? parsed.investments : [],
      ops: Array.isArray(parsed.ops) ? parsed.ops : [],
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted : []
    };
    state.rev = Number(state.rev) || 0;
    upgradeSettings(state, parsed.settings || {});
    return state;
  } catch (err) {
    if (err.code === 'ENOENT') {
      const state = defaultState();
      writeDb(state);
      return state;
    }
    console.error('\nNo se pudo leer data/db.json. No se ha sobrescrito nada.\n', err.message);
    console.error('Restaura una copia de data/backups/ sobre data/db.json y vuelve a intentarlo.\n');
    process.exit(1);
  }
}

let db = loadDb();

function publicState() {
  const { pinHash, ...settings } = db.settings;
  return {
    rev: db.rev,
    settings: { ...settings, pinEnabled: Boolean(pinHash) },
    accounts: db.accounts,
    categories: db.categories,
    transactions: db.transactions,
    investments: db.investments,
    ops: db.ops,
    recurring: db.recurring,
    goals: db.goals,
    loans: db.loans,
    clients: db.clients,
    invoices: db.invoices,
    purchases: db.purchases,
    deleted: db.deleted,
    serverTime: new Date().toISOString()
  };
}

function commit() {
  db.rev = (Number(db.rev) || 0) + 1;
  writeDb(db);
  return publicState();
}

// ---------------------------------------------------------------- seguridad
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPin(pin, stored) {
  if (!stored) return true;
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(pin ?? ''), salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const sessions = new Map();
const loginAttempts = new Map();
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPT_IPS = 1000;

function createSession() {
  const now = Date.now();
  // Las sesiones caducadas no deben acumularse indefinidamente en memoria.
  for (const [sid, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(sid);
  }
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, now + SESSION_MS);
  return sid;
}
function cookieHeader(sid) {
  return `mc_session=${sid}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_MS / 1000)}`;
}
function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}
function isAuthed(req) {
  if (!db.settings.pinHash) return true;
  const sid = readCookie(req, 'mc_session');
  if (!sid) return false;
  const exp = sessions.get(sid);
  if (!exp || exp < Date.now()) {
    sessions.delete(sid);
    return false;
  }
  return true;
}
function clientIp(req) {
  return (req.socket.remoteAddress || 'local').replace(/^::ffff:/, '');
}
function loginBlocked(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (entry.first + LOGIN_WINDOW_MS < Date.now()) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= 10;
}
function registerFailure(ip) {
  const now = Date.now();
  // Limpia IPs cuyo periodo de bloqueo ya terminó y limita el estado en memoria
  // ante peticiones distribuidas que roten direcciones de origen.
  for (const [address, entry] of loginAttempts) {
    if (entry.first + LOGIN_WINDOW_MS < now) loginAttempts.delete(address);
  }
  if (!loginAttempts.has(ip) && loginAttempts.size >= MAX_LOGIN_ATTEMPT_IPS) {
    const oldest = loginAttempts.keys().next().value;
    if (oldest !== undefined) loginAttempts.delete(oldest);
  }
  const entry = loginAttempts.get(ip);
  if (!entry || entry.first + LOGIN_WINDOW_MS < now) loginAttempts.set(ip, { count: 1, first: now });
  else entry.count += 1;
}

// ---------------------------------------------------------------- validación
function ensureId(obj, prev) {
  const id = clean(obj.id, 60);
  return prev ? prev.id : id && !dbHasId(id) ? id : uid();
}
function dbHasId(id) {
  return COLLECTIONS.some((c) => db[c].some((x) => x.id === id));
}
function sanitizeAccount(obj, prev) {
  return {
    id: ensureId(obj, prev),
    name: clean(obj.name, 60) || 'Cuenta',
    type: ACCOUNT_TYPES.includes(obj.type) ? obj.type : 'bank',
    initialBalance: round2(obj.initialBalance),
    color: validColor(obj.color) || '#0e9f6e',
    note: clean(obj.note, 300),
    createdAt: prev?.createdAt || clean(obj.createdAt, 40) || new Date().toISOString()
  };
}
function sanitizeCategory(obj, prev) {
  const kind = obj.kind === 'income' || obj.kind === 'expense' ? obj.kind : (prev?.kind || 'expense');
  return {
    id: ensureId(obj, prev),
    name: clean(obj.name, 60) || 'Categoría',
    kind,
    icon: normalizeGlyph(obj.icon, kind === 'income' ? 'plusCircle' : 'box'),
    color: validColor(obj.color) || '#64748b',
    budget: kind === 'expense' ? Math.max(0, round2(obj.budget)) : 0,
    createdAt: prev?.createdAt || new Date().toISOString()
  };
}
function sanitizeTransaction(obj, prev) {
  const type = TX_TYPES.includes(obj.type) ? obj.type : prev?.type || 'expense';
  const amount = round2(obj.amount);
  if (!(amount > 0)) throw bad('El importe debe ser mayor que cero.');
  const account = db.accounts.find((a) => a.id === obj.accountId);
  if (!account) throw bad('La cuenta no existe.');
  let toAccountId = null;
  let categoryId = null;
  if (type === 'transfer') {
    toAccountId = String(obj.toAccountId || '');
    const target = db.accounts.find((a) => a.id === toAccountId);
    if (!target) throw bad('La cuenta de destino no existe.');
    if (target.id === account.id) throw bad('Las cuentas de origen y destino deben ser distintas.');
  } else {
    const cat = db.categories.find((c) => c.id === obj.categoryId);
    if (!cat) throw bad('La categoría no existe.');
    if (cat.kind !== type) throw bad('La categoría no corresponde al tipo de movimiento.');
    categoryId = cat.id;
  }
  const date = obj.date === undefined || obj.date === '' ? todayISO() : obj.date;
  if (!validDate(date)) throw bad('La fecha del movimiento no es válida (usa una fecha real en formato AAAA-MM-DD).');
  return {
    id: ensureId(obj, prev),
    type,
    amount,
    date,
    accountId: account.id,
    toAccountId,
    categoryId,
    note: clean(obj.note, 500),
    recurringId: prev ? prev.recurringId || null : (db.recurring.some((r) => r.id === obj.recurringId) ? obj.recurringId : null),
    invoiceId: prev?.invoiceId || null,
    purchaseId: prev?.purchaseId || null,
    createdAt: prev?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
function sanitizeInvestment(obj, prev) {
  const price = Math.max(0, round6(obj.currentPrice));
  return {
    id: ensureId(obj, prev),
    name: clean(obj.name, 80) || 'Inversión',
    symbol: clean(obj.symbol, 16).toUpperCase(),
    type: INVEST_TYPES.includes(obj.type) ? obj.type : 'other',
    currentPrice: price,
    priceUpdatedAt: validDate(obj.priceUpdatedAt) ? obj.priceUpdatedAt : prev?.priceUpdatedAt || todayISO(),
    quoteSymbol: SYMBOL_RE.test(clean(obj.quoteSymbol, 24)) ? clean(obj.quoteSymbol, 24).toUpperCase() : '',
    priceSource: clean(obj.priceSource, 40),
    color: validColor(obj.color) || '#8b5cf6',
    note: clean(obj.note, 300),
    ...investmentMarketFields(obj),
    createdAt: prev?.createdAt || new Date().toISOString()
  };
}
/** Datos de mercado que guarda cada inversión (los rellena el servidor, nunca el usuario). */
function investmentMarketFields(o) {
  const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : round6(Number(v)));
  return {
    prevClose: num(o.prevClose),
    dayChangePct: num(o.dayChangePct),
    nativeCurrency: /^[A-Z]{3}$/.test(String(o.nativeCurrency || '')) ? o.nativeCurrency : null,
    nativePrice: num(o.nativePrice),
    marketName: String(o.marketName || '').slice(0, 80),
    exchange: String(o.exchange || '').slice(0, 40),
    priceAt: typeof o.priceAt === 'string' && !Number.isNaN(Date.parse(o.priceAt)) ? o.priceAt.slice(0, 30) : null,
    spark: Array.isArray(o.spark) ? o.spark.slice(-66).map(Number).filter((n) => n > 0).map(round6) : []
  };
}
function opMarketFields(o) {
  return {
    priceMode: PRICE_MODES.includes(o.priceMode) ? o.priceMode : 'manual',
    market: sanitizeMarketContext(o.market),
    demo: o.demo ? true : undefined
  };
}
function unitsFor(investmentId, list = db.ops) {
  let units = 0;
  for (const op of list) {
    if (op.investmentId !== investmentId) continue;
    units += op.type === 'buy' ? Number(op.units) || 0 : -(Number(op.units) || 0);
  }
  return round8(units);
}
function sanitizeOp(obj, prev, candidateList) {
  const investment = db.investments.find((i) => i.id === obj.investmentId);
  if (!investment) throw bad('La inversión no existe.');
  const units = round8(obj.units);
  if (!(units > 0)) throw bad('Las unidades deben ser mayores que cero.');
  const price = Math.max(0, round6(obj.price));
  const fees = Math.max(0, round2(obj.fees));
  const type = obj.type === 'sell' ? 'sell' : 'buy';
  let accountId = null;
  if (obj.accountId) {
    const account = db.accounts.find((a) => a.id === obj.accountId);
    if (!account) throw bad('La cuenta asociada no existe.');
    accountId = account.id;
  }
  const date = obj.date === undefined || obj.date === '' ? todayISO() : obj.date;
  if (!validDate(date)) throw bad('La fecha de la operación no es válida.');
  const op = {
    id: ensureId(obj, prev),
    investmentId: investment.id,
    accountId,
    type,
    units,
    price,
    fees,
    date,
    note: clean(obj.note, 300),
    ...opMarketFields(obj),
    createdAt: prev?.createdAt || new Date().toISOString()
  };
  if (!op.demo) delete op.demo;
  const list = candidateList ? candidateList(op) : [...db.ops, op];
  if (unitsFor(investment.id, list) < -1e-8) throw bad('No puedes vender más unidades de las que tienes.');
  return op;
}

// ---------------------------------------------------------------- recurrentes y objetivos
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function isoOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function advanceDate(dateStr, frequency, anchorDay) {
  const d = parseDate(dateStr);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
    return isoOf(d);
  }
  const step = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
  const y = d.getFullYear();
  const m = d.getMonth() + step;
  const target = new Date(y, m, 1);
  const day = Math.min(anchorDay || d.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
  target.setDate(day);
  return isoOf(target);
}
function sanitizeRecurring(obj, prev) {
  const type = TX_TYPES.includes(obj.type) ? obj.type : prev?.type || 'expense';
  const amount = round2(obj.amount);
  if (!(amount > 0)) throw bad('El importe debe ser mayor que cero.');
  const account = db.accounts.find((a) => a.id === obj.accountId);
  if (!account) throw bad('La cuenta no existe.');
  let toAccountId = null;
  let categoryId = null;
  if (type === 'transfer') {
    const target = db.accounts.find((a) => a.id === obj.toAccountId);
    if (!target) throw bad('La cuenta de destino no existe.');
    if (target.id === account.id) throw bad('Las cuentas de origen y destino deben ser distintas.');
    toAccountId = target.id;
  } else {
    const cat = db.categories.find((c) => c.id === obj.categoryId);
    if (!cat) throw bad('La categoría no existe.');
    if (cat.kind !== type) throw bad('La categoría no corresponde al tipo de movimiento.');
    categoryId = cat.id;
  }
  const frequency = FREQUENCIES.includes(obj.frequency) ? obj.frequency : 'monthly';
  const startDate = obj.startDate === undefined || obj.startDate === '' ? (prev?.startDate || todayISO()) : obj.startDate;
  if (!validDate(startDate)) throw bad('La fecha de inicio no es válida.');
  const endDate = obj.endDate === undefined || obj.endDate === null || obj.endDate === '' ? null : obj.endDate;
  if (endDate && !validDate(endDate)) throw bad('La fecha de fin no es válida.');
  if (endDate && endDate < startDate) throw bad('La fecha de fin no puede ser anterior al inicio.');
  if (obj.nextDate !== undefined && obj.nextDate !== '' && !validDate(obj.nextDate)) {
    throw bad('La próxima fecha de la recurrencia no es válida.');
  }
  const anchorDay = parseDate(startDate).getDate();
  let nextDate = startDate;
  if (prev) {
    if (prev.startDate !== startDate || prev.frequency !== frequency) {
      // Recalcula la próxima fecha desde el nuevo inicio sin repetir lo ya generado.
      const generated = db.transactions.filter((t) => t.recurringId === prev.id).map((t) => t.date).sort();
      const last = generated[generated.length - 1];
      let guard = 0;
      while (last && nextDate <= last && guard < 2000) { nextDate = advanceDate(nextDate, frequency, anchorDay); guard += 1; }
    } else {
      nextDate = validDate(obj.nextDate) ? obj.nextDate : prev.nextDate;
    }
  }
  const active = obj.active === undefined ? (prev ? prev.active !== false : true) : Boolean(obj.active);
  if (prev && prev.active === false && active) {
    // Al reactivar no se rellenan los periodos que estuvo en pausa.
    const today = todayISO();
    let guard = 0;
    while (nextDate < today && guard < 2000) { nextDate = advanceDate(nextDate, frequency, anchorDay); guard += 1; }
  }
  return {
    id: ensureId(obj, prev),
    type,
    amount,
    accountId: account.id,
    toAccountId,
    categoryId,
    note: clean(obj.note, 500),
    frequency,
    startDate,
    endDate,
    anchorDay,
    nextDate,
    active,
    createdAt: prev?.createdAt || new Date().toISOString()
  };
}
function sanitizeGoal(obj, prev) {
  const target = round2(obj.target);
  if (!(target > 0)) throw bad('El objetivo debe ser mayor que cero.');
  let accountId = null;
  if (obj.accountId) {
    const account = db.accounts.find((a) => a.id === obj.accountId);
    if (!account) throw bad('La cuenta asociada no existe.');
    accountId = account.id;
  }
  const deadline = obj.deadline === undefined || obj.deadline === null || obj.deadline === '' ? null : obj.deadline;
  if (deadline && !validDate(deadline)) throw bad('La fecha límite del objetivo no es válida.');
  return {
    id: ensureId(obj, prev),
    name: clean(obj.name, 60) || 'Objetivo',
    icon: normalizeGlyph(obj.icon, 'target'),
    color: validColor(obj.color) || '#3b82f6',
    target,
    saved: accountId ? 0 : Math.max(0, round2(obj.saved)),
    accountId,
    deadline,
    note: clean(obj.note, 300),
    done: Boolean(obj.done),
    createdAt: prev?.createdAt || new Date().toISOString()
  };
}
function sanitizeExtra(list) {
  return (Array.isArray(list) ? list : []).slice(0, 300).map((e) => ({
    id: clean(e?.id, 60) || uid(),
    date: validDate(e?.date) ? e.date : todayISO(),
    amount: round2(e?.amount),
    mode: e?.mode === 'payment' ? 'payment' : 'term',
    note: clean(e?.note, 200)
  })).filter((e) => e.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
}
function sanitizeLoan(obj, prev, refs = db) {
  const principal = round2(obj.principal);
  if (!(principal > 0)) throw bad('El capital del préstamo debe ser mayor que cero.');
  const annualRate = Math.round((Number(obj.annualRate) || 0) * 1000) / 1000;
  if (annualRate < 0 || annualRate > 60) throw bad('El tipo de interés debe estar entre 0 % y 60 %.');
  const termMonths = Math.round(Number(obj.termMonths) || 0);
  if (termMonths < 1 || termMonths > 600) throw bad('El plazo debe estar entre 1 y 600 meses.');
  if (!validDate(obj.startDate)) throw bad('Indica la fecha de la primera cuota.');
  const accountId = obj.accountId && refs.accounts.some((a) => a.id === obj.accountId) ? obj.accountId : null;
  const categoryId = obj.categoryId && refs.categories.some((c) => c.id === obj.categoryId && c.kind === 'expense') ? obj.categoryId : null;
  const recurringId = obj.recurringId && refs.recurring.some((r) => r.id === obj.recurringId) ? obj.recurringId : null;
  return {
    id: ensureId(obj, prev),
    name: clean(obj.name, 60) || 'Préstamo',
    type: LOAN_TYPES.includes(obj.type) ? obj.type : 'personal',
    principal,
    annualRate,
    termMonths,
    startDate: obj.startDate,
    extraPayments: sanitizeExtra(obj.extraPayments),
    accountId,
    categoryId,
    recurringId,
    color: validColor(obj.color) || '#64748b',
    note: clean(obj.note, 300),
    createdAt: prev?.createdAt || clean(obj.createdAt, 40) || new Date().toISOString()
  };
}


// ---------------------------------------------------------------- perfil y negocio (autónomos en España)
function defaultModules(profile) {
  const business = profile === 'autonomo' || profile === 'ambos';
  return {
    budgets: profile !== 'autonomo', recurring: true, goals: profile !== 'autonomo',
    investments: false, loans: false, reports: true, business
  };
}
function sanitizeModules(obj, fallback) {
  const out = { ...fallback };
  for (const k of MODULE_KEYS) if (obj && obj[k] !== undefined) out[k] = Boolean(obj[k]);
  return out;
}
function sanitizeBusiness(obj = {}, prev = {}) {
  const b = { ...prev, ...(obj || {}) };
  const num = (v, min, max, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
  const series = clean(b.series, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'F';
  let seriesR = clean(b.seriesR, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'R';
  if (seriesR === series) seriesR = series + 'R';
  return {
    name: clean(b.name, 120),
    tradeName: clean(b.tradeName, 120),
    nif: clean(b.nif, 20).toUpperCase().replace(/[\s.-]/g, ''),
    address: clean(b.address, 160),
    zip: clean(b.zip, 10),
    city: clean(b.city, 80),
    province: clean(b.province, 80),
    email: clean(b.email, 120),
    phone: clean(b.phone, 30),
    iban: clean(b.iban, 40).toUpperCase().replace(/\s+/g, ' '),
    activity: b.activity === 'empresarial' ? 'empresarial' : 'profesional',
    iae: clean(b.iae, 60),
    startDate: validDate(b.startDate) ? b.startDate : '',
    endDate: validDate(b.endDate) && (!validDate(b.startDate) || b.endDate >= b.startDate) ? b.endDate : '',
    tarifaPlana: Boolean(b.tarifaPlana),
    societario: Boolean(b.societario),
    territory: TERRITORIES.includes(b.territory) ? b.territory : 'comun',
    ivaRate: IVA_RATES.includes(Number(b.ivaRate)) ? Number(b.ivaRate) : 21,
    irpfRate: num(b.irpfRate, 0, 47, 15),
    retaBase: round2(num(b.retaBase, 0, 10000, 0)),
    retaMonthly: round2(num(b.retaMonthly, 0, 3000, 0)),
    paymentDays: Math.round(num(b.paymentDays, 0, 365, 30)),
    series,
    seriesR,
    footer: clean(b.footer, 400)
  };
}
/** Completa los ajustes nuevos sin cambiar nada a quien ya usaba la app. */
function upgradeSettings(state, raw) {
  const s = state.settings;
  s.profile = PROFILES.includes(raw.profile) ? raw.profile : 'personal';
  const hadData = (state.transactions || []).length > 0 || (state.investments || []).length > 0;
  s.onboarded = raw.onboarded === undefined ? hadData : Boolean(raw.onboarded);
  // Usuarios de versiones anteriores: todo visible, como lo tenían.
  const legacy = raw.modules === undefined && hadData
    ? { budgets: true, recurring: true, goals: true, investments: true, loans: true, reports: true, business: s.profile !== 'personal' }
    : defaultModules(s.profile);
  s.modules = sanitizeModules(raw.modules, legacy);
  s.business = sanitizeBusiness(raw.business || {});
  s.finnhubKey = typeof raw.finnhubKey === 'string' && /^[A-Za-z0-9]{12,64}$/.test(raw.finnhubKey) ? raw.finnhubKey : '';
  s.marketProxy = typeof raw.marketProxy === 'string' && /^https:\/\//i.test(raw.marketProxy) ? raw.marketProxy.slice(0, 300) : '';
  // 1.5: los iconos pasan de emoji a iconos de línea.
  for (const c of state.categories || []) c.icon = normalizeGlyph(c.icon, c.kind === 'income' ? 'plusCircle' : 'box');
  for (const g of state.goals || []) g.icon = normalizeGlyph(g.icon, 'target');
  // 1.5: las inversiones que cotizan se valoran con el precio real del mercado.
  if (!raw.marketV15) {
    s.marketV15 = true;
    s.autoPrices = true;
    const target = s.currency || 'EUR';
    for (const inv of state.investments || []) {
      if (inv.quoteSymbol || !inv.symbol || !['stock', 'etf', 'crypto'].includes(inv.type)) continue;
      inv.quoteSymbol = inv.type === 'crypto' ? `${inv.symbol}-${target}` : inv.symbol;
    }
  } else s.marketV15 = true;
}
function ensureCategory(name, kind, icon, color) {
  let cat = db.categories.find((c) => c.kind === kind && c.name === name);
  if (!cat) {
    cat = { id: uid(), name, kind, icon, color, budget: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.categories.push(cat);
  }
  return cat;
}
function cleanNif(v) { return clean(v, 20).toUpperCase().replace(/[\s.-]/g, ''); }
function sanitizeClient(obj, prev) {
  const name = clean(obj.name, 120);
  if (!name) throw bad('Indica el nombre o la razón social del cliente.');
  const nif = cleanNif(obj.nif);
  if (nif) {
    const check = validateNif(nif);
    if (!check.ok) throw bad(`NIF del cliente: ${check.message}.`);
  }
  const kind = CLIENT_KINDS.includes(obj.kind) ? obj.kind : 'empresa';
  return {
    id: ensureId(obj, prev),
    name,
    nif,
    kind,
    address: clean(obj.address, 160),
    zip: clean(obj.zip, 10),
    city: clean(obj.city, 80),
    province: clean(obj.province, 80),
    country: clean(obj.country, 40) || 'España',
    email: clean(obj.email, 120),
    phone: clean(obj.phone, 30),
    taxMode: TAX_MODES[obj.taxMode] ? obj.taxMode : 'normal',
    irpfRate: obj.irpfRate === '' || obj.irpfRate === undefined || obj.irpfRate === null ? null : Math.min(47, Math.max(0, Number(obj.irpfRate) || 0)),
    recargo: Boolean(obj.recargo),
    note: clean(obj.note, 300),
    createdAt: prev?.createdAt || clean(obj.createdAt, 40) || new Date().toISOString()
  };
}
function sanitizeLines(list, kind = 'ordinaria', opts = {}) {
  try { return normalizeInvoiceLines(list, kind, opts); }
  catch (err) { throw bad(err.message); }
}
function sanitizeInvoice(obj, prev) {
  // Una factura emitida es inalterable: solo se pueden cambiar la nota interna y el vencimiento.
  if (prev && prev.status !== 'draft') {
    const dueDate = obj.dueDate === undefined ? prev.dueDate : obj.dueDate;
    if (dueDate && !validDate(dueDate)) throw bad('La fecha de vencimiento no es válida.');
    if (dueDate && dueDate < prev.date) throw bad('El vencimiento no puede ser anterior a la fecha de la factura.');
    return { ...prev, internalNote: clean(obj.internalNote, 300), dueDate };
  }
  const kind = obj.kind === 'rectificativa' ? 'rectificativa' : 'ordinaria';
  const date = obj.date === undefined || obj.date === '' ? todayISO() : obj.date;
  if (!validDate(date)) throw bad('La fecha de la factura no es válida (usa una fecha real en formato AAAA-MM-DD).');
  const opDate = obj.opDate || '';
  if (opDate && !validDate(opDate)) throw bad('La fecha de la operación no es válida.');
  if (opDate && opDate > date) throw bad('La fecha de la operación no puede ser posterior a la de la factura.');
  const dueDate = obj.dueDate || '';
  if (dueDate && !validDate(dueDate)) throw bad('La fecha de vencimiento no es válida.');
  if (dueDate && dueDate < date) throw bad('El vencimiento no puede ser anterior a la fecha de la factura.');
  const lines = sanitizeLines(obj.lines, kind);
  const clientId = obj.clientId && db.clients.some((c) => c.id === obj.clientId) ? obj.clientId : null;
  const series = clean(obj.series, 6).toUpperCase().replace(/[^A-Z0-9]/g, '')
    || (kind === 'rectificativa' ? db.settings.business.seriesR : db.settings.business.series) || 'F';
  let rectifiesId = null;
  if (kind === 'rectificativa') {
    const orig = db.invoices.find((i) => i.id === obj.rectifiesId && i.status !== 'draft');
    if (!orig) throw bad('Indica qué factura emitida rectificas.');
    if (orig.id === (prev?.id || obj.id)) throw bad('Una factura no puede rectificarse a sí misma.');
    if (orig.kind === 'rectificativa') throw bad('No se puede rectificar una factura rectificativa. Emite una factura ordinaria nueva.');
    rectifiesId = orig.id;
  }
  const item = {
    id: ensureId(obj, prev),
    kind,
    status: 'draft',
    series,
    number: null,
    date,
    opDate,
    dueDate,
    clientId,
    lines,
    taxMode: TAX_MODES[obj.taxMode] ? obj.taxMode : 'normal',
    irpfRate: Math.min(47, Math.max(0, Number(obj.irpfRate) || 0)),
    recargo: Boolean(obj.recargo),
    note: clean(obj.note, 600),
    internalNote: clean(obj.internalNote, 300),
    rectifiesId,
    rectifyReason: clean(obj.rectifyReason, 300),
    createdAt: prev?.createdAt || clean(obj.createdAt, 40) || new Date().toISOString()
  };
  item.total = invoiceTotals(item).total;
  return item;
}
function clientSnapshot(c) {
  return c ? { name: c.name, nif: c.nif, kind: c.kind, address: c.address, zip: c.zip, city: c.city, province: c.province, country: c.country, email: c.email } : null;
}
function sellerSnapshot() {
  const b = db.settings.business;
  return { name: b.name, tradeName: b.tradeName, nif: b.nif, address: b.address, zip: b.zip, city: b.city, province: b.province, email: b.email, phone: b.phone, iban: b.iban, footer: b.footer };
}
function issueInvoice(inv) {
  const b = db.settings.business;
  if (!b.name || !b.nif) throw bad('Antes de emitir, completa tu nombre y NIF en Ajustes → Mi negocio.');
  const own = validateNif(b.nif);
  if (!own.ok) throw bad(`Tu NIF no es válido: ${own.message}. Revísalo en Ajustes → Mi negocio.`);
  const client = db.clients.find((c) => c.id === inv.clientId);
  if (!client) throw bad('Elige un cliente para poder emitir la factura.');
  if (!validDate(inv.date)) throw bad('La fecha de la factura no es válida.');
  if (inv.date > todayISO()) throw bad('La fecha de la factura no puede ser futura.');
  if (inv.opDate && inv.opDate > inv.date) throw bad('La fecha de la operación no puede ser posterior a la de la factura.');
  if (inv.dueDate && inv.dueDate < inv.date) throw bad('El vencimiento no puede ser anterior a la fecha de la factura.');
  if (!inv.lines.length || !inv.lines.some((l) => l.desc)) throw bad('Añade al menos un concepto con descripción.');
  const totals = invoiceTotals(inv);
  if (inv.kind === 'ordinaria') {
    if (inv.lines.some((l) => !(l.qty > 0))) throw bad('Todas las cantidades deben ser mayores que cero.');
    if (inv.lines.some((l) => l.price < 0)) throw bad('El precio no puede ser negativo.');
    if (!(totals.base > 0)) throw bad('El importe de la factura debe ser mayor que cero.');
  } else {
    if (!inv.rectifiesId) throw bad('Indica qué factura rectificas.');
    const orig = db.invoices.find((i) => i.id === inv.rectifiesId);
    if (!orig || orig.status === 'draft') throw bad('La factura que rectificas no está emitida.');
    if (orig.kind === 'rectificativa') throw bad('No se puede rectificar una factura rectificativa. Emite una factura ordinaria nueva.');
    const already = db.invoices.find((i) => i.id !== inv.id && i.rectifiesId === inv.rectifiesId && i.status !== 'draft');
    if (already) throw bad(`Esa factura ya tiene la rectificativa ${already.number}.`);
  }
  if ((client.kind !== 'particular' || inv.taxMode === 'intracom' || inv.taxMode === 'isp') && !client.nif) {
    throw bad('Este cliente necesita NIF en la factura. Añádelo en su ficha.');
  }
  const year = inv.date.slice(0, 4);
  const same = db.invoices.filter((i) => i.id !== inv.id && i.number && i.series === inv.series && i.date.slice(0, 4) === year);
  const last = same.sort((a, b2) => (a.seq || 0) - (b2.seq || 0)).at(-1);
  if (last && inv.date < last.date) {
    throw bad(`La numeración debe ser correlativa: la fecha no puede ser anterior a la de ${last.number} (${last.date.split('-').reverse().join('/')}).`);
  }
  const seq = (last?.seq || 0) + 1;
  const number = `${inv.series}${year}-${String(seq).padStart(4, '0')}`;
  if (db.invoices.some((i) => i.id !== inv.id && i.number === number)) {
    throw bad(`Ya existe una factura con el número ${number}. Revisa la numeración de esa serie.`);
  }
  inv.seq = seq;
  inv.number = number;
  inv.status = 'issued';
  inv.issuedAt = new Date().toISOString();
  if (!inv.dueDate) {
    const d = parseDate(inv.date);
    d.setDate(d.getDate() + (Number(b.paymentDays) || 0));
    inv.dueDate = isoOf(d);
  }
  inv.seller = sellerSnapshot();
  inv.buyer = clientSnapshot(client);
  const t = invoiceTotals(inv);
  inv.totals = { base: t.base, iva: t.iva, re: t.re, irpf: t.irpf, total: t.total, byRate: t.byRate };
  inv.total = t.total;
  inv.updatedAt = new Date().toISOString();
  return inv;
}
function payInvoice(inv, body) {
  if (inv.status === 'draft') throw bad('Primero emite la factura.');
  const account = body.accountId
    ? db.accounts.find((a) => a.id === body.accountId)
    : db.accounts[0];
  if (!account) throw bad(body.accountId ? 'La cuenta indicada no existe.' : 'Crea una cuenta para registrar el cobro.');
  const date = body.date === undefined || body.date === '' ? todayISO() : body.date;
  if (!validDate(date)) throw bad('La fecha del cobro no es válida.');
  if (date > todayISO()) throw bad('La fecha del cobro no puede ser futura.');
  const cat = ensureCategory('Facturación', 'income', 'invoice', '#0e9f6e');
  const total = round2(inv.total ?? invoiceTotals(inv).total);
  const existing = inv.transactionId && db.transactions.find((t) => t.id === inv.transactionId);
  if (existing) {
    Object.assign(existing, { amount: Math.abs(total), date, accountId: account.id, updatedAt: new Date().toISOString() });
  } else if (total > 0) {
    const tx = {
      id: uid(), type: 'income', amount: total, date, accountId: account.id, toAccountId: null, categoryId: cat.id,
      note: `Cobro ${inv.number} · ${inv.buyer?.name || ''}`.trim(), recurringId: null, invoiceId: inv.id, purchaseId: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    db.transactions.push(tx);
    inv.transactionId = tx.id;
  } else if (total < 0) {
    const tx = {
      id: uid(), type: 'expense', amount: Math.abs(total), date, accountId: account.id, toAccountId: null,
      categoryId: ensureCategory('Gastos del negocio', 'expense', 'briefcase', '#64748b').id,
      note: `Abono ${inv.number} · ${inv.buyer?.name || ''}`.trim(), recurringId: null, invoiceId: inv.id, purchaseId: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    db.transactions.push(tx);
    inv.transactionId = tx.id;
  }
  inv.status = 'paid';
  inv.paidDate = date;
  inv.updatedAt = new Date().toISOString();
}
function unpayInvoice(inv) {
  if (inv.status !== 'paid') throw bad('Esta factura no está cobrada.');
  if (inv.transactionId) {
    db.transactions = db.transactions.filter((t) => t.id !== inv.transactionId);
    recordDeletion('transactions', inv.transactionId);
  }
  inv.transactionId = null;
  inv.paidDate = null;
  inv.status = 'issued';
  inv.updatedAt = new Date().toISOString();
}
function rectifyInvoice(orig) {
  if (orig.status === 'draft') throw bad('Un borrador se puede editar directamente.');
  if (orig.kind === 'rectificativa') throw bad('No se puede rectificar una factura rectificativa. Emite una factura ordinaria nueva.');
  const already = db.invoices.find((i) => i.rectifiesId === orig.id && i.status !== 'draft');
  if (already) throw bad(`Esta factura ya tiene la rectificativa ${already.number}.`);
  if (!orig.lines.length) throw bad('La factura original no tiene líneas que rectificar.');
  const lines = orig.lines
    .filter((l) => Number(l.qty) !== 0)
    .map((l) => ({ ...l, qty: -l.qty }));
  if (!lines.length) throw bad('La factura original no tiene importes que rectificar.');
  const draft = sanitizeInvoice({
    kind: 'rectificativa', rectifiesId: orig.id, clientId: orig.clientId, date: todayISO(),
    lines, taxMode: orig.taxMode, irpfRate: orig.irpfRate, recargo: orig.recargo,
    rectifyReason: 'Anulación total de la factura ' + orig.number,
    note: `Factura rectificativa de ${orig.number} de fecha ${orig.date.split('-').reverse().join('/')} (art. 15 RD 1619/2012).`
  }, null);
  draft.updatedAt = new Date().toISOString();
  db.invoices.push(draft);
  return draft;
}
function sanitizePurchase(obj, prev, { strict = true } = {}) {
  const kind = PURCHASE_KINDS.includes(obj.kind) ? obj.kind : 'otros';
  const supplier = clean(obj.supplier, 120) || (kind === 'reta' ? 'Seguridad Social (RETA)' : '');
  if (!supplier) throw bad('Indica el proveedor.');
  let nums;
  try { nums = normalizePurchaseInput(obj, { kind, strict }); } catch (err) { throw bad(err.message); }
  if (!(nums.base > 0)) throw bad('La base imponible debe ser mayor que cero.');
  const nif = cleanNif(obj.supplierNif);
  if (nif && !validateNif(nif).ok) throw bad(`NIF del proveedor: ${validateNif(nif).message}.`);
  let date = obj.date === undefined || obj.date === '' ? todayISO() : obj.date;
  if (!validDate(date)) {
    if (strict) throw bad('La fecha del gasto no es válida (usa una fecha real en formato AAAA-MM-DD).');
    date = todayISO();
  }
  const item = {
    id: ensureId(obj, prev),
    date,
    supplier,
    supplierNif: nif,
    number: clean(obj.number, 40),
    concept: clean(obj.concept, 200),
    kind,
    base: nums.base,
    ivaRate: nums.ivaRate,
    ivaAmount: nums.ivaAmount,
    deductiblePct: nums.deductiblePct,
    ivaNoDeducible: nums.ivaNoDeducible,
    irpfRate: nums.irpfRate,
    accountId: obj.accountId && db.accounts.some((a) => a.id === obj.accountId) ? obj.accountId : null,
    transactionId: prev?.transactionId || null,
    note: clean(obj.note, 300),
    createdAt: prev?.createdAt || clean(obj.createdAt, 40) || new Date().toISOString()
  };
  item.total = purchaseTotals(item).total;
  return item;
}
/** Mantiene el pago de un gasto con factura como movimiento de la cuenta elegida. */
function linkPurchaseTx(p) {
  const existing = p.transactionId && db.transactions.find((t) => t.id === p.transactionId);
  if (!p.accountId) {
    if (existing) { db.transactions = db.transactions.filter((t) => t.id !== existing.id); recordDeletion('transactions', existing.id); }
    p.transactionId = null;
    return;
  }
  const cat = p.kind === 'reta'
    ? ensureCategory('Cuota de autónomos', 'expense', 'receipt', '#64748b')
    : ensureCategory('Gastos del negocio', 'expense', 'briefcase', '#64748b');
  const note = `${p.supplier}${p.number ? ' · ' + p.number : ''}${p.concept ? ' · ' + p.concept : ''}`.slice(0, 500);
  if (existing) {
    Object.assign(existing, { amount: Math.abs(p.total), date: p.date, accountId: p.accountId, categoryId: cat.id, note, updatedAt: new Date().toISOString() });
  } else {
    const tx = {
      id: uid(), type: 'expense', amount: p.total, date: p.date, accountId: p.accountId, toAccountId: null, categoryId: cat.id,
      note, recurringId: null, invoiceId: null, purchaseId: p.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    db.transactions.push(tx);
    p.transactionId = tx.id;
  }
}

/** Genera los movimientos de las reglas recurrentes que ya han vencido. Devuelve cuántos ha creado. */
function runRecurring() {
  const today = todayISO();
  let created = 0;
  for (const rule of db.recurring) {
    if (rule.active === false || !validDate(rule.nextDate)) continue;
    let guard = 0;
    while (rule.nextDate <= today && (!rule.endDate || rule.nextDate <= rule.endDate) && guard < 600) {
      const accountOk = db.accounts.some((a) => a.id === rule.accountId);
      const targetOk = rule.type !== 'transfer' || db.accounts.some((a) => a.id === rule.toAccountId);
      const catOk = rule.type === 'transfer' || db.categories.some((c) => c.id === rule.categoryId);
      if (!accountOk || !targetOk || !catOk) { rule.active = false; break; }
      db.transactions.push({
        id: uid(),
        type: rule.type,
        amount: rule.amount,
        date: rule.nextDate,
        accountId: rule.accountId,
        toAccountId: rule.type === 'transfer' ? rule.toAccountId : null,
        categoryId: rule.type === 'transfer' ? null : rule.categoryId,
        note: rule.note || '',
        recurringId: rule.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      rule.nextDate = advanceDate(rule.nextDate, rule.frequency, rule.anchorDay);
      created += 1;
      guard += 1;
    }
    if (rule.endDate && rule.nextDate > rule.endDate) rule.active = false;
  }
  return created;
}
function runRecurringAndSave() {
  const created = runRecurring();
  if (created > 0) commit();
  return created;
}

// ---------------------------------------------------------------- demo / import
function monthKeyOffset(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthDate(offset, day) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const isCurrent = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  const max = isCurrent ? now.getDate() : 27;
  d.setDate(Math.min(day, max));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function demoState(profile = 'personal') {
  const s = defaultState();
  const freelancer = profile === 'autonomo';
  const [main, savings, cash] = s.accounts;
  main.initialBalance = freelancer ? 6400 : 2350;
  savings.initialBalance = 4200;
  cash.initialBalance = 180;
  const budgets = {
    Vivienda: 1000, Alimentación: 420, Transporte: 160, Restaurantes: 180,
    Ocio: 100, Suscripciones: 40, Compras: 150, Salud: 60
  };
  for (const c of s.categories) if (budgets[c.name]) c.budget = budgets[c.name];
  const catId = (name) => s.categories.find((c) => c.name === name)?.id || null;
  const add = (type, amount, offset, day, accountId, category, note, toAccountId) =>
    s.transactions.push({
      id: uid(), type, amount: round2(amount), date: monthDate(offset, day),
      accountId, toAccountId: toAccountId || null,
      categoryId: category ? catId(category) : null,
      note: note || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

  for (let off = -5; off <= 0; off += 1) {
    if (!freelancer) add('income', 2850, off, 1, main.id, 'Nómina', 'Nómina mensual');
    if (!freelancer && (off === -4 || off === -1)) add('income', 480, off, 12, main.id, 'Freelance', 'Proyecto web');
    add('expense', 950, off, 2, main.id, 'Vivienda', 'Alquiler');
    add('expense', 59.9, off, 3, main.id, 'Suscripciones', 'Internet y móvil');
    add('expense', 12.99, off, 4, main.id, 'Suscripciones', 'Streaming');
    add('expense', 68.4, off, 5, cash.id, 'Alimentación', 'Supermercado');
    add('expense', 54.2, off, 12, cash.id, 'Alimentación', 'Supermercado');
    add('expense', 71.8, off, 19, cash.id, 'Alimentación', 'Compra semanal');
    add('expense', 46.3, off, 26, cash.id, 'Alimentación', 'Frutería');
    add('expense', 42.6, off, 6, main.id, 'Transporte', 'Combustible');
    add('expense', 34.5, off, 8, main.id, 'Restaurantes', 'Cena con amigos');
    add('expense', 52, off, 21, main.id, 'Restaurantes', 'Comida fuera');
    if (off % 2 === 0) add('expense', 39.99, off, 10, main.id, 'Compras', 'Compra online');
    if (off === -3 || off === -1) add('expense', 65, off, 16, main.id, 'Salud', 'Farmacia');
    if (off === -5 || off === -2) add('expense', 210, off, 24, main.id, 'Ocio', 'Escapada de fin de semana');
    add('transfer', 350, off, 3, main.id, null, 'Ahorro automático', savings.id);
  }

  const inv = (name, symbol, type, currentPrice, color, note, quoteSymbol = '') => {
    const item = {
      id: uid(), name, symbol, type, currentPrice, color, quoteSymbol, priceSource: '',
      priceUpdatedAt: todayISO(), note, createdAt: new Date().toISOString()
    };
    // Moneda de cotización de referencia (se corrige con la primera consulta al mercado).
    if (quoteSymbol) {
      const usd = !/[.-]/.test(quoteSymbol);
      item.nativeCurrency = usd ? 'USD' : 'EUR';
      item.nativePrice = usd ? Math.round((currentPrice / 0.89) * 100) / 100 : currentPrice;
    }
    s.investments.push(item);
    return item;
  };
  const op = (investmentId, type, units, price, fees, offset, day, note) =>
    s.ops.push({
      id: uid(), investmentId, type, units: round8(units), price, fees,
      date: monthDate(offset, day), note: note || '', createdAt: new Date().toISOString(),
      // Precio provisional: al consultar el mercado se sustituye por el cierre real de ese día.
      priceMode: 'market', market: null, demo: true
    });

  const catByName = (name) => s.categories.find((c) => c.name === name)?.id || null;
  const rule = (type, amount, accountId, category, note, frequency, day, toAccountId) => {
    const start = monthDate(1, day);
    s.recurring.push({
      id: uid(), type, amount, accountId, toAccountId: toAccountId || null,
      categoryId: category ? catByName(category) : null, note, frequency,
      startDate: start, endDate: null, anchorDay: parseDate(start).getDate(), nextDate: start,
      active: true, createdAt: new Date().toISOString()
    });
  };
  if (!freelancer) rule('income', 2850, main.id, 'Nómina', 'Nómina mensual', 'monthly', 1);
  rule('expense', 950, main.id, 'Vivienda', 'Alquiler', 'monthly', 2);
  rule('expense', 59.9, main.id, 'Suscripciones', 'Internet y móvil', 'monthly', 3);
  rule('expense', 12.99, main.id, 'Suscripciones', 'Streaming', 'monthly', 4);
  rule('transfer', 350, main.id, null, 'Ahorro automático', 'monthly', 3, savings.id);
  rule('expense', 320, main.id, 'Impuestos', 'Seguro del coche', 'yearly', 15);

  if (!freelancer) {
    s.goals.push(
      { id: uid(), name: 'Fondo de emergencia', icon: 'lifebuoy', color: '#3b82f6', target: 9000, saved: 0, accountId: savings.id, deadline: monthDate(10, 1), note: '6 meses de gastos', done: false, createdAt: new Date().toISOString() },
      { id: uid(), name: 'Viaje a Japón', icon: 'plane', color: '#ec4899', target: 3200, saved: 850, accountId: null, deadline: monthDate(8, 1), note: '', done: false, createdAt: new Date().toISOString() }
    );

    const world = inv('iShares Core MSCI World', 'IWDA', 'etf', 129, '#3b82f6', 'ETF global acumulativo', 'IWDA.AS');
    op(world.id, 'buy', 8, 118, 1, -7, 10, 'Primera aportación');
    op(world.id, 'buy', 14, 122, 1, -4, 8, 'Aportación periódica');

    const aapl = inv('Apple', 'AAPL', 'stock', 296, '#64748b', 'Acciones', 'AAPL');
    op(aapl.id, 'buy', 4, 250, 1, -5, 14, '');

    const btc = inv('Bitcoin', 'BTC', 'crypto', 69500, '#f59e0b', 'Criptomoneda', 'BTC-EUR');
    op(btc.id, 'buy', 0.018, 80000, 2, -6, 20, '');
    op(btc.id, 'buy', 0.024, 75000, 2, -2, 18, '');

    const fund = inv('Vanguard Global Stock Index', 'VGSI', 'fund', 63.6, '#8b5cf6', 'Fondo indexado', '0P00000RQC.F');
    op(fund.id, 'buy', 40, 58, 0, -3, 5, 'Aportación anual');

    s.loans.push({
      id: uid(), name: 'Préstamo del coche', type: 'car', principal: 14000, annualRate: 6.5, termMonths: 60,
      startDate: monthDate(-14, 5), extraPayments: [], accountId: main.id, categoryId: catId('Transporte'),
      recurringId: null, color: '#64748b', note: 'Financiación del concesionario', createdAt: new Date().toISOString()
    });
    rule('expense', 273.93, main.id, 'Transporte', 'Cuota Préstamo del coche', 'monthly', 5);
    s.loans[0].recurringId = s.recurring[s.recurring.length - 1].id;
    s.recurring[s.recurring.length - 1].endDate = monthDate(-14 + 59, 5);
  }

  if (profile !== 'personal') addBusinessDemo(s, main.id);
  return s;
}

/** Datos de ejemplo de un diseñador autónomo: clientes, facturas, gastos con IVA y cuota de autónomos. */
function addBusinessDemo(s, accountId) {
  const now = new Date().toISOString();
  const income = { id: uid(), name: 'Facturación', kind: 'income', icon: 'invoice', color: '#0e9f6e', budget: 0, createdAt: now };
  const bizCat = { id: uid(), name: 'Gastos del negocio', kind: 'expense', icon: 'briefcase', color: '#64748b', budget: 0, createdAt: now };
  const retaCat = { id: uid(), name: 'Cuota de autónomos', kind: 'expense', icon: 'receipt', color: '#64748b', budget: 0, createdAt: now };
  s.categories.push(income, bizCat, retaCat);
  const client = (name, nif, kind, city, extra = {}) => {
    const c = { id: uid(), name, nif, kind, address: 'Calle Mayor 1', zip: '28013', city, province: city, country: 'España', email: '', phone: '', taxMode: 'normal', irpfRate: null, recargo: false, note: '', createdAt: now, ...extra };
    s.clients.push(c);
    return c;
  };
  const a = client('Estudio Norte S.L.', 'B12345674', 'empresa', 'Madrid');
  const b = client('Lucía Romero Gil', '12345678Z', 'autonomo', 'Valencia');
  const c = client('Café La Plaza S.L.', 'B87654323', 'empresa', 'Sevilla');
  const projects = [
    [a, 'Diseño de identidad visual', 1800], [b, 'Maquetación de catálogo', 950], [c, 'Carta y señalética', 1200],
    [a, 'Campaña redes sociales (mensual)', 1100], [b, 'Web corporativa · fase 1', 2400], [a, 'Campaña redes sociales (mensual)', 1100],
    [c, 'Fotografía de producto', 780], [a, 'Campaña redes sociales (mensual)', 1100], [b, 'Web corporativa · fase 2', 1900], [a, 'Rediseño packaging', 1650]
  ];
  const seqByYear = {};
  const seller = { name: 'Alex Martín Ruiz (demo)', tradeName: 'Atlas Estudio', nif: '00000000T', address: 'Calle de Alcalá 100', zip: '28009', city: 'Madrid', province: 'Madrid', email: 'hola@ejemplo.es', phone: '', iban: 'ES00 0000 0000 0000 0000 0000', footer: '' };
  projects.forEach(([cl, desc, price], i) => {
    const off = i - (projects.length - 1);
    const date = monthDate(off, 5);
    const year = date.slice(0, 4);
    const seq = (seqByYear[year] = (seqByYear[year] || 0) + 1);
    const inv = {
      id: uid(), kind: 'ordinaria', status: 'issued', series: 'F', seq, number: `F${year}-${String(seq).padStart(4, '0')}`,
      date, opDate: '', dueDate: monthDate(off + 1, 5), paidDate: null, clientId: cl.id,
      lines: [{ desc, qty: 1, price, discount: 0, ivaRate: 21 }], taxMode: 'normal', irpfRate: 15, recargo: false,
      note: '', internalNote: '', rectifiesId: null, rectifyReason: '', transactionId: null, issuedAt: now, createdAt: now,
      buyer: { name: cl.name, nif: cl.nif, kind: cl.kind, address: cl.address, zip: cl.zip, city: cl.city, province: cl.province, country: cl.country, email: '' },
      seller
    };
    const t = invoiceTotals(inv);
    inv.total = t.total;
    inv.totals = { base: t.base, iva: t.iva, re: t.re, irpf: t.irpf, total: t.total, byRate: t.byRate };
    if (off < -1) {
      const paid = monthDate(off + 1, 3);
      const tx = { id: uid(), type: 'income', amount: t.total, date: paid, accountId, toAccountId: null, categoryId: income.id, note: `Cobro ${inv.number} · ${cl.name}`, recurringId: null, invoiceId: inv.id, purchaseId: null, createdAt: now, updatedAt: now };
      s.transactions.push(tx);
      inv.status = 'paid';
      inv.paidDate = paid;
      inv.transactionId = tx.id;
    }
    s.invoices.push(inv);
  });
  const purchase = (off, day, supplier, nif, kind, concept, base, ivaRate, extra = {}) => {
    const p = { id: uid(), date: monthDate(off, day), supplier, supplierNif: nif, number: '', concept, kind, base, ivaRate, ivaAmount: null, deductiblePct: 100, ivaNoDeducible: false, irpfRate: 0, accountId, transactionId: null, note: '', createdAt: now, ...extra };
    p.total = purchaseTotals(p).total;
    const tx = { id: uid(), type: 'expense', amount: p.total, date: p.date, accountId, toAccountId: null, categoryId: kind === 'reta' ? retaCat.id : bizCat.id, note: `${supplier} · ${concept}`, recurringId: null, invoiceId: null, purchaseId: p.id, createdAt: now, updatedAt: now };
    s.transactions.push(tx);
    p.transactionId = tx.id;
    s.purchases.push(p);
  };
  for (let off = -9; off <= 0; off++) {
    purchase(off, 1, 'Seguridad Social (RETA)', '', 'reta', 'Cuota de autónomos', 380.88, 0);
    purchase(off, 2, 'Adobe Systems Software Ireland', 'IE6364992H', 'software', 'Creative Cloud', 72.59, 21);
    purchase(off, 8, 'Movistar', 'A82018474', 'telefono', 'Fibra y móvil (50 % uso profesional)', 49.55, 21, { deductiblePct: 50 });
    if (off % 3 === 0) purchase(off, 14, 'Gestoría López', 'B12345674', 'gestoria', 'Asesoría fiscal trimestral', 90, 21);
  }
  purchase(-6, 20, 'Apple Distribution International', 'IE9700053D', 'material', 'Monitor para el estudio', 450, 21);
  s.settings.business = { ...s.settings.business, ...seller, startDate: monthDate(-30, 1), irpfRate: 15, retaMonthly: 380.88, retaBase: 1209.15 };
}

function importState(input) {
  if (!input || typeof input !== 'object') throw bad('La copia no tiene un formato válido.');
  const incomingSettings = input.settings || {};
  const state = defaultState();
  state.settings = {
    ...db.settings,
    currency: /^[A-Z]{3}$/.test(String(incomingSettings.currency || '').toUpperCase())
      ? String(incomingSettings.currency).toUpperCase()
      : db.settings.currency,
    locale: validLocale(incomingSettings.locale, db.settings.locale),
    theme: THEMES.includes(incomingSettings.theme) ? incomingSettings.theme : db.settings.theme
  };
  if (PROFILES.includes(incomingSettings.profile)) state.settings.profile = incomingSettings.profile;
  if (incomingSettings.modules) state.settings.modules = sanitizeModules(incomingSettings.modules, db.settings.modules || defaultModules(state.settings.profile));
  if (incomingSettings.business && (incomingSettings.business.name || incomingSettings.business.nif)) state.settings.business = sanitizeBusiness(incomingSettings.business);
  if (incomingSettings.onboarded !== undefined) state.settings.onboarded = Boolean(incomingSettings.onboarded) || Boolean(db.settings.onboarded);
  const used = new Set();
  const keepId = (obj) => {
    let id = clean(obj?.id, 60);
    if (!id || used.has(id)) id = uid();
    used.add(id);
    return id;
  };
  const text = (v, max, fallback = '') => clean(v, max) || fallback;
  const amount = (v, min = 0) => Math.max(min, round2(v));

  state.accounts = (Array.isArray(input.accounts) ? input.accounts : []).map((a) => ({
    id: keepId(a),
    name: text(a.name, 60, 'Cuenta'),
    type: ACCOUNT_TYPES.includes(a.type) ? a.type : 'bank',
    initialBalance: round2(a.initialBalance),
    color: validColor(a.color) || '#0e9f6e',
    note: text(a.note, 300),
    createdAt: text(a.createdAt, 40, new Date().toISOString())
  }));
  state.categories = (Array.isArray(input.categories) ? input.categories : []).map((c) => ({
    id: keepId(c),
    name: text(c.name, 60, 'Categoría'),
    kind: c.kind === 'income' ? 'income' : 'expense',
    icon: normalizeGlyph(c.icon, c.kind === 'income' ? 'plusCircle' : 'box'),
    color: validColor(c.color) || '#64748b',
    budget: amount(c.budget),
    createdAt: text(c.createdAt, 40, new Date().toISOString())
  }));
  state.investments = (Array.isArray(input.investments) ? input.investments : []).map((i) => ({
    id: keepId(i),
    name: text(i.name, 80, 'Inversión'),
    symbol: text(i.symbol, 16).toUpperCase(),
    type: INVEST_TYPES.includes(i.type) ? i.type : 'other',
    currentPrice: Math.max(0, round6(i.currentPrice)),
    priceUpdatedAt: validDate(i.priceUpdatedAt) ? i.priceUpdatedAt : todayISO(),
    quoteSymbol: SYMBOL_RE.test(text(i.quoteSymbol, 24)) ? text(i.quoteSymbol, 24).toUpperCase() : '',
    priceSource: text(i.priceSource, 40),
    color: validColor(i.color) || '#8b5cf6',
    note: text(i.note, 300),
    ...investmentMarketFields(i),
    createdAt: text(i.createdAt, 40, new Date().toISOString())
  }));
  const accountIds = new Set(state.accounts.map((a) => a.id));
  const categoryIds = new Set(state.categories.map((c) => c.id));
  const investmentIds = new Set(state.investments.map((i) => i.id));
  state.transactions = (Array.isArray(input.transactions) ? input.transactions : [])
    .map((t) => {
      const type = TX_TYPES.includes(t.type) ? t.type : 'expense';
      return {
        id: keepId(t),
        type,
        amount: round2(t.amount),
        date: validDate(t.date) ? t.date : todayISO(),
        accountId: String(t.accountId || ''),
        toAccountId: type === 'transfer' ? String(t.toAccountId || '') : null,
        categoryId: type === 'transfer' ? null : String(t.categoryId || ''),
        note: text(t.note, 500),
        createdAt: text(t.createdAt, 40, new Date().toISOString()),
        updatedAt: text(t.updatedAt, 40, new Date().toISOString())
      };
    })
    .filter((t) => t.amount > 0 && accountIds.has(t.accountId) &&
      (t.type === 'transfer'
        ? accountIds.has(t.toAccountId) && t.toAccountId !== t.accountId
        : categoryIds.has(t.categoryId)));
  state.ops = (Array.isArray(input.ops) ? input.ops : [])
    .map((o) => ({
      id: keepId(o),
      investmentId: String(o.investmentId || ''),
      type: o.type === 'sell' ? 'sell' : 'buy',
      units: round8(o.units),
      price: Math.max(0, round6(o.price)),
      fees: amount(o.fees),
      date: validDate(o.date) ? o.date : todayISO(),
      note: text(o.note, 300),
      ...opMarketFields(o),
      createdAt: text(o.createdAt, 40, new Date().toISOString())
    }))
    .filter((o) => o.units > 0 && investmentIds.has(o.investmentId));
  for (const op of state.ops) if (!op.demo) delete op.demo;
  for (const op of state.ops) {
    const raw = (input.ops || []).find((o) => o && o.id === op.id);
    op.accountId = raw && accountIds.has(raw.accountId) ? raw.accountId : null;
  }
  const recurringIds = new Set();
  state.recurring = (Array.isArray(input.recurring) ? input.recurring : [])
    .map((r) => {
      const type = TX_TYPES.includes(r.type) ? r.type : 'expense';
      const startDate = validDate(r.startDate) ? r.startDate : todayISO();
      const item = {
        id: keepId(r),
        type,
        amount: round2(r.amount),
        accountId: String(r.accountId || ''),
        toAccountId: type === 'transfer' ? String(r.toAccountId || '') : null,
        categoryId: type === 'transfer' ? null : String(r.categoryId || ''),
        note: text(r.note, 500),
        frequency: FREQUENCIES.includes(r.frequency) ? r.frequency : 'monthly',
        startDate,
        endDate: validDate(r.endDate) ? r.endDate : null,
        anchorDay: parseDate(startDate).getDate(),
        nextDate: validDate(r.nextDate) ? r.nextDate : startDate,
        active: r.active !== false,
        createdAt: text(r.createdAt, 40, new Date().toISOString())
      };
      return item;
    })
    .filter((r) => r.amount > 0 && accountIds.has(r.accountId) &&
      (r.type === 'transfer' ? accountIds.has(r.toAccountId) && r.toAccountId !== r.accountId : categoryIds.has(r.categoryId)));
  for (const r of state.recurring) recurringIds.add(r.id);
  for (const t of state.transactions) {
    const raw = (input.transactions || []).find((x) => x && x.id === t.id);
    t.recurringId = raw && recurringIds.has(raw.recurringId) ? raw.recurringId : null;
  }
  state.goals = (Array.isArray(input.goals) ? input.goals : [])
    .map((g) => ({
      id: keepId(g),
      name: text(g.name, 60, 'Objetivo'),
      icon: normalizeGlyph(g.icon, 'target'),
      color: validColor(g.color) || '#3b82f6',
      target: amount(g.target),
      saved: amount(g.saved),
      accountId: accountIds.has(g.accountId) ? g.accountId : null,
      deadline: validDate(g.deadline) ? g.deadline : null,
      note: text(g.note, 300),
      done: Boolean(g.done),
      createdAt: text(g.createdAt, 40, new Date().toISOString())
    }))
    .filter((g) => g.target > 0);
  const refs = { accounts: state.accounts, categories: state.categories, recurring: state.recurring };
  state.loans = [];
  for (const raw of Array.isArray(input.loans) ? input.loans : []) {
    try {
      const loan = sanitizeLoan({ ...raw, id: undefined }, null, refs);
      loan.id = keepId(raw);
      loan.createdAt = text(raw.createdAt, 40, loan.createdAt);
      state.loans.push(loan);
    } catch { /* préstamo no válido: se descarta */ }
  }
  // Negocio: clientes, facturas emitidas (se respetan número y estado) y gastos con factura.
  state.clients = (Array.isArray(input.clients) ? input.clients : []).map((c) => {
    try {
      const item = sanitizeClient({ ...c, id: undefined, nif: validateNif(c?.nif).ok ? c.nif : '' }, null);
      item.id = keepId(c);
      return item;
    } catch { return null; }
  }).filter(Boolean);
  const clientIds = new Set(state.clients.map((c) => c.id));
  const txIds = new Set(state.transactions.map((t) => t.id));
  state.invoices = (Array.isArray(input.invoices) ? input.invoices : []).filter((i) => i && typeof i === 'object').map((i) => {
    const kind = i.kind === 'rectificativa' ? 'rectificativa' : 'ordinaria';
    let lines = [];
    try { lines = normalizeInvoiceLines(i.lines, kind, { strict: false }); } catch { lines = []; }
    const status = ['draft', 'issued', 'paid'].includes(i.status) ? i.status : 'draft';
    const number = status === 'draft' ? null : text(i.number, 40) || null;
    return {
      id: keepId(i),
      kind,
      status: number ? status : 'draft',
      series: text(i.series, 6, 'F').toUpperCase(),
      number,
      seq: number ? Math.max(1, Math.round(Number(i.seq) || Number(String(number).split('-').pop()) || 1)) : undefined,
      date: validDate(i.date) ? i.date : todayISO(),
      opDate: validDate(i.opDate) ? i.opDate : '',
      dueDate: validDate(i.dueDate) ? i.dueDate : '',
      paidDate: validDate(i.paidDate) ? i.paidDate : null,
      clientId: clientIds.has(i.clientId) ? i.clientId : null,
      lines,
      taxMode: TAX_MODES[i.taxMode] ? i.taxMode : 'normal',
      irpfRate: Math.min(47, Math.max(0, Number(i.irpfRate) || 0)),
      recargo: Boolean(i.recargo),
      note: text(i.note, 600),
      internalNote: text(i.internalNote, 300),
      rectifiesId: i.rectifiesId ? String(i.rectifiesId) : null,
      rectifyReason: text(i.rectifyReason, 300),
      seller: i.seller && typeof i.seller === 'object' ? i.seller : null,
      buyer: i.buyer && typeof i.buyer === 'object' ? i.buyer : null,
      totals: i.totals && typeof i.totals === 'object' ? i.totals : null,
      total: invoiceTotals({ lines, taxMode: i.taxMode, irpfRate: i.irpfRate, recargo: i.recargo }).total,
      transactionId: txIds.has(i.transactionId) ? i.transactionId : null,
      issuedAt: text(i.issuedAt, 40) || null,
      createdAt: text(i.createdAt, 40, new Date().toISOString())
    };
  });
  state.purchases = (Array.isArray(input.purchases) ? input.purchases : []).map((p) => {
    try {
      const saved = db;
      db = { ...db, accounts: state.accounts };
      let item;
      try { item = sanitizePurchase({ ...p, id: undefined, supplierNif: validateNif(p?.supplierNif).ok ? p.supplierNif : '' }, null, { strict: false }); } finally { db = saved; }
      item.id = keepId(p);
      item.transactionId = txIds.has(p.transactionId) ? p.transactionId : null;
      return item;
    } catch { return null; }
  }).filter(Boolean);
  for (const t of state.transactions) {
    const raw = (input.transactions || []).find((x) => x && x.id === t.id);
    t.invoiceId = raw && state.invoices.some((i) => i.id === raw.invoiceId) ? raw.invoiceId : null;
    t.purchaseId = raw && state.purchases.some((p) => p.id === raw.purchaseId) ? raw.purchaseId : null;
  }
  // Conserva la fecha de última modificación (necesaria para sincronizar).
  for (const col of COLLECTIONS) {
    const rawList = Array.isArray(input[col]) ? input[col] : [];
    const byId = new Map(rawList.filter((x) => x && x.id).map((x) => [String(x.id), x]));
    for (const item of state[col]) {
      const raw = byId.get(item.id);
      const stamp = raw && clean(raw.updatedAt, 40);
      item.updatedAt = stamp && !Number.isNaN(Date.parse(stamp)) ? stamp : item.updatedAt || item.createdAt;
    }
  }
  state.deleted = (Array.isArray(input.deleted) ? input.deleted : [])
    .filter((d) => d && COLLECTIONS.includes(d.col) && d.id && d.at)
    .map((d) => ({ col: d.col, id: clean(d.id, 60), at: clean(d.at, 40) }))
    .slice(-2000);
  state.rev = db.rev;
  return { state, counts: { accounts: state.accounts.length, categories: state.categories.length, transactions: state.transactions.length, investments: state.investments.length, ops: state.ops.length, recurring: state.recurring.length, goals: state.goals.length, loans: state.loans.length, clients: state.clients.length, invoices: state.invoices.length, purchases: state.purchases.length } };
}

// ---------------------------------------------------------------- sincronización
/** Combina dos estados: gana la versión modificada más recientemente y se respetan los borrados. */
function mergeStates(local, incoming) {
  const stamp = (x) => String(x?.updatedAt || x?.createdAt || '');
  const tomb = new Map();
  for (const d of [...(local.deleted || []), ...(incoming.deleted || [])]) {
    if (!d || !d.col || !d.id) continue;
    const key = d.col + ':' + d.id;
    if (!tomb.has(key) || String(d.at) > tomb.get(key)) tomb.set(key, String(d.at));
  }
  const out = { ...local, settings: local.settings };
  for (const col of COLLECTIONS) {
    const map = new Map();
    for (const item of local[col] || []) if (item && item.id) map.set(item.id, item);
    for (const item of Array.isArray(incoming[col]) ? incoming[col] : []) {
      if (!item || !item.id) continue;
      const current = map.get(item.id);
      if (!current || stamp(item) > stamp(current)) {
        const next = { ...item };
        // En recurrentes nunca se retrocede la próxima fecha: evita duplicar movimientos.
        if (col === 'recurring' && current && validDate(current.nextDate) && current.nextDate > (next.nextDate || '')) next.nextDate = current.nextDate;
        map.set(item.id, next);
      } else if (col === 'recurring' && validDate(item.nextDate) && item.nextDate > (current.nextDate || '')) {
        map.set(item.id, { ...current, nextDate: item.nextDate });
      }
    }
    out[col] = [...map.values()].filter((item) => {
      const at = tomb.get(col + ':' + item.id);
      return !at || stamp(item) > at;
    });
  }
  // Un mismo recurrente generado en dos dispositivos: se queda solo uno por fecha.
  const seen = new Set();
  out.transactions = out.transactions.filter((t) => {
    if (!t.recurringId) return true;
    const key = t.recurringId + '|' + t.date;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  out.deleted = [...tomb].map(([key, at]) => {
    const i = key.indexOf(':');
    return { col: key.slice(0, i), id: key.slice(i + 1), at };
  }).sort((a, b) => a.at.localeCompare(b.at)).slice(-2000);
  return out;
}

function recordDeletion(col, id) {
  if (!Array.isArray(db.deleted)) db.deleted = [];
  db.deleted.push({ col, id, at: new Date().toISOString() });
  if (db.deleted.length > 2000) db.deleted = db.deleted.slice(-2000);
}

// Paquete cifrado: PBKDF2-SHA256 + AES-256-GCM (mismo formato que WebCrypto en el navegador).
const SYNC_ITER = 310000;
function sealPackage(passphrase, data) {
  if (String(passphrase || '').length < 8) throw bad('La contraseña debe tener al menos 8 caracteres.');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(String(passphrase), salt, SYNC_ITER, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { app: 'mi-cartera', kind: 'sync', v: 1, kdf: 'PBKDF2-SHA256', iter: SYNC_ITER, salt: salt.toString('base64'), iv: iv.toString('base64'), data: body.toString('base64'), createdAt: new Date().toISOString() };
}
function openPackage(passphrase, pkg) {
  if (!pkg || pkg.app !== 'mi-cartera' || pkg.v !== 1) throw bad('El archivo no es un paquete de Mi Cartera.');
  const raw = Buffer.from(String(pkg.data), 'base64');
  const salt = Buffer.from(String(pkg.salt), 'base64');
  const iv = Buffer.from(String(pkg.iv), 'base64');
  // Limita el coste de PBKDF2 que puede imponer un archivo ajeno (evita bloqueos por CPU).
  const iter = Math.max(10000, Math.min(1000000, Math.round(Number(pkg.iter) || SYNC_ITER)));
  if (salt.length < 8 || salt.length > 64 || iv.length !== 12 || raw.length < 32) {
    throw bad('El archivo no es un paquete de Mi Cartera.');
  }
  try {
    const key = crypto.pbkdf2Sync(String(passphrase || ''), salt, iter, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(raw.subarray(raw.length - 16));
    const text = Buffer.concat([decipher.update(raw.subarray(0, raw.length - 16)), decipher.final()]).toString('utf8');
    return JSON.parse(text);
  } catch {
    throw bad('Contraseña incorrecta o archivo dañado.');
  }
}

// ---------------------------------------------------------------- copias de seguridad
const BACKUP_RE = /^db-[0-9A-Za-z-]+\.json$/;
function backupCounts(state) {
  const n = (k) => (Array.isArray(state?.[k]) ? state[k].length : 0);
  return { transactions: n('transactions'), accounts: n('accounts'), investments: n('investments'), loans: n('loans'), invoices: n('invoices') };
}
function listBackups() {
  let files = [];
  try { files = fs.readdirSync(BACKUP_DIR).filter((f) => BACKUP_RE.test(f)); } catch { return []; }
  return files.map((name) => {
    const full = path.join(BACKUP_DIR, name);
    const stat = fs.statSync(full);
    let counts = null;
    try { counts = backupCounts(JSON.parse(fs.readFileSync(full, 'utf8'))); } catch { counts = null; }
    const kind = /^db-\d{4}-\d{2}-\d{2}\.json$/.test(name) ? 'daily' : name.startsWith('db-manual') ? 'manual' : 'safety';
    return { name, at: stat.mtime.toISOString(), size: stat.size, kind, counts };
  }).sort((a, b) => b.at.localeCompare(a.at));
}
function readBackup(name) {
  if (!BACKUP_RE.test(String(name || ''))) throw bad('Copia no válida.');
  try { return JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, name), 'utf8')); } catch { throw new HttpError(404, 'No se encontró esa copia o está dañada.'); }
}
function saveBackupNow(label = 'manual') {
  const d = new Date();
  const stamp = `${todayISO()}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const name = `db-${label}-${stamp}.json`;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(path.join(BACKUP_DIR, name), JSON.stringify(db, null, 2), 'utf8');
  try {
    const extra = fs.readdirSync(BACKUP_DIR).filter((f) => BACKUP_RE.test(f) && !/^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const old of extra.slice(0, Math.max(0, extra.length - 20))) fs.unlinkSync(path.join(BACKUP_DIR, old));
  } catch { /* ignorar */ }
  return name;
}

// ---------------------------------------------------------------- red local
function networkInfo() {
  const urls = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) urls.push(`http://${iface.address}:${LISTEN_PORT}`);
    }
  }
  return { web: false, port: LISTEN_PORT, urls, platform: process.platform, hostname: os.hostname() };
}

// ---------------------------------------------------------------- mercado (Yahoo Finance)
// Las inversiones en bolsa, ETF, fondos y cripto se valoran con el precio real del mercado.
// Solo se envía el símbolo del valor (por ejemplo AAPL); nunca cantidades ni datos personales.

async function marketFetchJson(url) {
  if (typeof fetch !== 'function') throw new Error('Necesitas Node.js 18 o superior para consultar el mercado.');
  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (MiCartera)', Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  } catch {
    throw Object.assign(new Error('No hay conexión con el servicio de cotizaciones.'), { network: true });
  }
  if (response.status === 404) throw new Error('Ese valor no existe en el mercado.');
  if (!response.ok) throw Object.assign(new Error(`El servicio de cotizaciones respondió con un error (${response.status}).`), { network: response.status === 429 || response.status >= 500 });
  const body = await response.json().catch(() => null);
  if (!body) throw new Error('El servicio de cotizaciones devolvió una respuesta no válida.');
  return body;
}

async function marketJson(url, ttlMs) {
  const hit = marketCache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.body;
  let body;
  try {
    body = await marketFetchJson(url);
  } catch (err) {
    // Si el servicio no responde, mejor el último dato bueno (de menos de 3 días) que un error.
    if (err.network && hit && Date.now() - hit.at < 3 * 86400000) return hit.body;
    throw err;
  }
  marketCache.set(url, { at: Date.now(), body });
  if (marketCache.size > 300) marketCache.delete(marketCache.keys().next().value);
  return body;
}

function isMarketLinked(inv) {
  return Boolean(inv && MARKET_TYPES.includes(inv.type) && inv.quoteSymbol);
}

function utcISO(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function pct(a, b) {
  return a > 0 && b > 0 ? Math.round((a / b - 1) * 10000) / 100 : null;
}

const r6 = (n) => (Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null);

/* Fuentes de precios, de más a menos oficial:
   - Cripto: Coinbase Exchange (API pública de un mercado regulado, sin clave).
   - Acciones y ETF de EE. UU.: Finnhub en tiempo real (clave gratuita del usuario).
   - Tipos de cambio: Banco Central Europeo (tipos de referencia oficiales, diarios).
   - Lo demás (ETF y acciones europeas, fondos) y el histórico de bolsa: Yahoo Finance como respaldo,
     porque ninguna fuente oficial gratuita los publica. */
const CRYPTO_RE = /^([A-Z0-9]{2,10})-(EUR|USD|GBP|USDC|USDT|BTC)$/;
const US_TICKER_RE = /^[A-Z]{1,5}$/;
const RANGE_DAYS = { '5d': 7, '1mo': 31, '3mo': 92, '6mo': 183, '1y': 366 };

async function coinbaseChart(product, { range, from, to } = {}) {
  const end = to || Date.now();
  const start = from || end - (RANGE_DAYS[range] || 92) * DAY_MS;
  const base = `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}`;
  const iso = (t) => new Date(t).toISOString();
  const [candles, ticker] = await Promise.all([
    marketJson(`${base}/candles?granularity=86400&start=${iso(start)}&end=${iso(Math.min(end, Date.now()))}`, range ? 5 * 60000 : 6 * 3600000),
    range ? marketJson(`${base}/ticker`, 20000) : Promise.resolve(null)
  ]);
  if (!Array.isArray(candles)) throw new Error(`No se encontró ${product} en Coinbase.`);
  // Coinbase: [hora, mínimo, máximo, apertura, cierre, volumen], de la más reciente a la más antigua.
  const bars = candles.map((c) => ({ date: utcISO(c[0] * 1000), low: Number(c[1]), high: Number(c[2]), open: Number(c[3]), close: Number(c[4]) }))
    .filter((b) => b.close > 0).sort((a, b) => a.date.localeCompare(b.date));
  const quote = product.split('-')[1];
  const price = Number(ticker?.price) || (bars.length ? bars[bars.length - 1].close : 0);
  return {
    symbol: product, name: product, exchange: 'Coinbase', type: 'CRYPTOCURRENCY',
    currency: quote === 'USDC' || quote === 'USDT' ? 'USD' : quote,
    price, time: ticker?.time ? new Date(ticker.time).toISOString() : new Date().toISOString(),
    bars, source: 'Coinbase', dayOpenUtc: true
  };
}

async function marketChart(symbol, opts = {}) {
  const m = CRYPTO_RE.exec(String(symbol).toUpperCase());
  if (m && m[2] !== 'BTC') {
    try { return await coinbaseChart(`${m[1]}-${m[2]}`, opts); } catch (err) { if (/^HTTP|conexi/i.test(err.message)) throw err; }
  }
  return yahooChart(symbol, opts);
}

/** Velas diarias de Yahoo Finance ya limpias y con la moneda normalizada. */
async function yahooChart(symbol, { range, from, to } = {}) {
  const span = range ? `range=${range}` : `period1=${Math.floor(from / 1000)}&period2=${Math.floor(to / 1000)}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${span}&interval=1d&includePrePost=false`;
  const body = await marketJson(url, range ? 5 * 60000 : 6 * 3600000);
  const result = body?.chart?.result?.[0];
  if (!result) {
    const why = body?.chart?.error?.description;
    throw new Error(why && /no data|delisted|not found/i.test(why) ? `No hay cotizaciones de ${symbol}.` : `No se encontró ${symbol} en el mercado.`);
  }
  const meta = result.meta || {};
  let currency = String(meta.currency || '').trim();
  let factor = 1;
  if (currency === 'GBp' || currency === 'GBX') { currency = 'GBP'; factor = 0.01; }
  if (currency === 'ZAc') { currency = 'ZAR'; factor = 0.01; }
  currency = currency.toUpperCase();
  const offset = (Number(meta.gmtoffset) || 0) * 1000;
  const q = result.indicators?.quote?.[0] || {};
  const bars = (result.timestamp || []).map((t, i) => {
    const close = Number(q.close?.[i]) * factor;
    return {
      date: utcISO(t * 1000 + offset),
      close,
      open: Number(q.open?.[i]) * factor || close,
      high: Number(q.high?.[i]) * factor || close,
      low: Number(q.low?.[i]) * factor || close
    };
  }).filter((b) => b.close > 0);
  return {
    symbol: String(meta.symbol || symbol),
    name: String(meta.longName || meta.shortName || symbol).slice(0, 80),
    exchange: String(meta.fullExchangeName || meta.exchangeName || '').slice(0, 40),
    type: String(meta.instrumentType || ''),
    currency,
    price: Number(meta.regularMarketPrice) * factor || (bars.length ? bars[bars.length - 1].close : 0),
    time: Number(meta.regularMarketTime) ? new Date(Number(meta.regularMarketTime) * 1000).toISOString() : null,
    bars,
    source: 'Yahoo Finance'
  };
}

/** Tipos de referencia del BCE: unidades de `cur` por 1 euro en los últimos días hasta `date`. */
async function ecbSeries(cur, date) {
  if (cur === 'EUR') return [{ date: date || todayISO(), rate: 1 }];
  if (!/^[A-Z]{3}$/.test(cur)) throw new Error('Moneda no válida.');
  const end = date || todayISO();
  const start = utcISO(Date.parse(`${end}T12:00:00Z`) - 12 * DAY_MS);
  const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${cur}.EUR.SP00.A?startPeriod=${start}&endPeriod=${end}&format=jsondata`;
  const body = await marketJson(url, date && date < todayISO() ? 24 * 3600000 : 3600000);
  const series = body?.dataSets?.[0]?.series;
  const first = series && series[Object.keys(series)[0]];
  const dates = body?.structure?.dimensions?.observation?.[0]?.values || [];
  const out = Object.entries(first?.observations || {})
    .map(([i, v]) => ({ date: dates[Number(i)]?.id, rate: Number(v?.[0]) }))
    .filter((x) => x.date && x.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!out.length) throw new Error(`El BCE no publica el cambio ${cur}/EUR.`);
  return out;
}
async function ecbRate(from, to, date) {
  const [a, b] = await Promise.all([ecbSeries(from, date), ecbSeries(to, date)]);
  const pick = (list) => (date ? [...list].reverse().find((x) => x.date <= date) || list[0] : list[list.length - 1]).rate;
  return pick(b) / pick(a);
}

/** Cotización en tiempo real de Finnhub (acciones y ETF de EE. UU.). */
async function finnhubQuote(symbol) {
  const key = String(db.settings.finnhubKey || '');
  if (!key || !US_TICKER_RE.test(symbol)) return null;
  const q = await marketJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`, 15000);
  if (!(Number(q?.c) > 0)) return null;
  return { price: Number(q.c), prevClose: Number(q.pc) || null, time: Number(q.t) ? new Date(q.t * 1000).toISOString() : new Date().toISOString() };
}

/** Tipo de cambio de una moneda a la de la app (1 si son iguales). */
async function fxNow(from, to) {
  if (!from || from === to) return 1;
  try { return await ecbRate(from, to); } catch { /* respaldo */ }
  const chart = await marketChart(`${from}${to}=X`, { range: '5d' });
  if (!(chart.price > 0)) throw new Error(`No hay tipo de cambio ${from}/${to}.`);
  return chart.price;
}

async function fxOn(from, to, date) {
  if (!from || from === to) return 1;
  try { return await ecbRate(from, to, date); } catch { /* respaldo */ }
  const t = Date.parse(`${date}T12:00:00Z`);
  const chart = await marketChart(`${from}${to}=X`, { from: t - 10 * DAY_MS, to: t + 2 * DAY_MS });
  const bar = [...chart.bars].reverse().find((b) => b.date <= date) || chart.bars[0];
  if (!bar) return fxNow(from, to);
  return bar.close;
}

/** Cotización actual: precio, variación del día y evolución de los últimos 3 meses. */
async function marketQuote(symbol, target) {
  let live = null;
  try { live = await finnhubQuote(symbol); } catch { live = null; }
  let chart;
  try {
    chart = await marketChart(symbol, { range: '3mo' });
  } catch (err) {
    if (!live) throw err;
    chart = { symbol, name: symbol, exchange: 'EE. UU.', currency: 'USD', price: live.price, time: live.time, bars: [] };
  }
  if (live) Object.assign(chart, { price: live.price, time: live.time, currency: 'USD', source: 'Finnhub' });
  if (!(chart.price > 0)) throw new Error(`${symbol} no tiene precio ahora mismo.`);
  const fx = await fxNow(chart.currency, target);
  const bars = chart.bars;
  let price = chart.price;
  let time = chart.time;
  let today = time ? utcISO(Date.parse(time)) : null;
  const last = bars[bars.length - 1];
  // Los fondos a veces publican el valor liquidativo nuevo en el histórico antes que en el precio actual.
  if (last && last.close > 0 && today && last.date > today) {
    price = last.close;
    today = last.date;
    time = `${last.date}T21:00:00.000Z`;
  }
  const prevBar = last && last.date === today ? bars[bars.length - 2] : last;
  let prevClose = prevBar ? prevBar.close : null;
  if (chart.dayOpenUtc && last && last.date === utcISO(Date.now())) prevClose = last.open; // cripto: desde las 00:00 UTC
  if (live && live.prevClose) prevClose = live.prevClose;
  return {
    source: chart.source || 'Yahoo Finance',
    symbol: chart.symbol,
    name: chart.name,
    exchange: chart.exchange,
    nativeCurrency: chart.currency,
    nativePrice: r6(price),
    price: r6(price * fx),
    prevClose: prevClose ? r6(prevClose * fx) : null,
    dayChangePct: prevClose ? pct(price, prevClose) : null,
    time,
    spark: bars.slice(-66).map((b) => r6(b.close * fx))
  };
}

/** Precio de un valor en una fecha concreta, con el contexto de ese día y del mes anterior. */
async function marketPriceOn(symbol, date, target) {
  if (!validDate(String(date))) throw new Error('Fecha no válida.');
  if (date > todayISO()) throw new Error('La fecha no puede ser futura.');
  const t = Date.parse(`${date}T12:00:00Z`);
  const chart = await marketChart(symbol, { from: t - 45 * DAY_MS, to: t + 2 * DAY_MS });
  const before = chart.bars.filter((b) => b.date <= date);
  const bar = before[before.length - 1];
  if (!bar) throw new Error(`No hay cotización de ${symbol} en esa fecha. Puede que aún no cotizara.`);
  const gapDays = Math.round((t - Date.parse(`${bar.date}T12:00:00Z`)) / DAY_MS);
  if (gapDays > 7) throw new Error(`${symbol} no cotizó cerca de esa fecha.`);
  const prev = before[before.length - 2];
  const monthAgo = before.find((b) => b.date >= utcISO(t - 30 * DAY_MS));
  const fx = await fxOn(chart.currency, target, bar.date);
  return {
    symbol: chart.symbol,
    name: chart.name,
    date,
    tradeDate: bar.date,
    nativeCurrency: chart.currency,
    fx: r6(fx),
    close: r6(bar.close * fx),
    open: r6(bar.open * fx),
    high: r6(Math.max(bar.high, bar.close) * fx),
    low: r6(Math.min(bar.low, bar.close) * fx),
    prevClose: prev ? r6(prev.close * fx) : null,
    dayChangePct: prev ? pct(bar.close, prev.close) : null,
    trend30Pct: monthAgo && monthAgo !== bar ? pct(bar.close, monthAgo.close) : null
  };
}

const SEARCH_TYPES = { EQUITY: 'stock', ETF: 'etf', MUTUALFUND: 'fund', CRYPTOCURRENCY: 'crypto' };

async function marketSearch(query) {
  const q = String(query || '').trim().slice(0, 60);
  if (q.length < 2) return [];
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0&enableFuzzyQuery=false`;
  const body = await marketJson(url, 3600000);
  return (body?.quotes || [])
    .filter((x) => x.symbol && SEARCH_TYPES[x.quoteType])
    .slice(0, 8)
    .map((x) => ({
      symbol: String(x.symbol).slice(0, 24),
      name: String(x.longname || x.shortname || x.symbol).slice(0, 80),
      type: SEARCH_TYPES[x.quoteType],
      exchange: String(x.exchDisp || x.exchange || '').slice(0, 30)
    }));
}

function sanitizeMarketContext(m) {
  if (!m || typeof m !== 'object') return null;
  const n = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? r6(Number(v)) : null);
  if (!validDate(String(m.tradeDate || ''))) return null;
  return {
    tradeDate: m.tradeDate,
    close: n(m.close), open: n(m.open), high: n(m.high), low: n(m.low),
    prevClose: n(m.prevClose), dayChangePct: n(m.dayChangePct), trend30Pct: n(m.trend30Pct),
    nativeCurrency: /^[A-Z]{3}$/.test(String(m.nativeCurrency || '')) ? m.nativeCurrency : null,
    checkedAt: typeof m.checkedAt === 'string' ? m.checkedAt.slice(0, 30) : null
  };
}

function marketMoney(n) {
  return Number(n).toLocaleString('es-ES', { style: 'currency', currency: db.settings.currency || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: n < 10 ? 4 : 2 });
}

/**
 * Antes de guardar una compra o venta de un valor que cotiza, el servidor busca el precio
 * real de ese día. El usuario puede usar el cierre o su precio de ejecución, pero solo si
 * está dentro del rango en que cotizó el valor ese día.
 */
async function prepareMarketOp(body, prev = null) {
  const merged = { ...(prev || {}), ...body };
  const inv = db.investments.find((i) => i.id === merged.investmentId);
  if (!isMarketLinked(inv)) return { ...body, priceMode: 'manual', market: null };
  const relevant = ['date', 'price', 'priceMode', 'investmentId', 'amount', 'units'].some((k) => body[k] !== undefined && (!prev || body[k] !== prev[k]));
  if (prev && prev.market && !relevant) return body;
  if (!['buy', 'sell'].includes(merged.type)) return { ...body, priceMode: 'manual', market: null };
  let ctx;
  try {
    ctx = await marketPriceOn(inv.quoteSymbol, merged.date, db.settings.currency || 'EUR');
  } catch (err) {
    // Sin conexión con el mercado: se guarda el precio del bróker como pendiente y se comprueba en la próxima actualización.
    const typed = Number(merged.price);
    if (err.network && merged.priceMode === 'execution' && typed > 0) {
      const out = { ...body, price: r6(typed), priceMode: 'pending', market: null };
      delete out.amount;
      delete out.amountMode;
      return out;
    }
    throw bad(`No se pudo comprobar el precio de ${inv.name} el ${String(merged.date || "").split("-").reverse().join("/")}: ${err.message}${err.network ? ' Si tienes el precio que te dio tu bróker, marca «precio de ejecución» y escríbelo: quedará pendiente de comprobar.' : ''}`);
  }
  const mode = merged.priceMode === 'execution' ? 'execution' : 'market';
  let price = ctx.close;
  if (mode === 'execution') {
    price = Number(merged.price);
    const lo = ctx.low * 0.985;
    const hi = ctx.high * 1.015;
    if (!(price > 0) || price < lo || price > hi) {
      throw bad(`El ${ctx.tradeDate.split('-').reverse().join('/')} ${inv.name} cotizó entre ${marketMoney(ctx.low)} y ${marketMoney(ctx.high)}. Un precio de ${price > 0 ? marketMoney(price) : '0'} no es posible: revisa la fecha o usa el precio de mercado.`);
    }
  }
  const out = { ...body, price: r6(price), priceMode: mode, market: { ...ctx, checkedAt: new Date().toISOString() } };
  const amount = Number(merged.amount);
  if (merged.amountMode && amount > 0) {
    const fees = Math.max(0, Number(merged.fees) || 0);
    const units = merged.type === 'buy' ? (amount - fees) / price : (amount + fees) / price;
    if (!(units > 0)) throw bad('El importe no cubre las comisiones.');
    out.units = Math.round(units * 1e8) / 1e8;
  }
  delete out.amount;
  delete out.amountMode;
  return out;
}

/** Al crear o editar una inversión que cotiza se comprueba el símbolo y se trae su precio real. */
async function prepareMarketInvestment(body, prev = null) {
  const merged = { ...(prev || {}), ...body };
  if (!MARKET_TYPES.includes(merged.type)) return { ...body, quoteSymbol: '' };
  const symbol = String(merged.quoteSymbol || '').trim().toUpperCase();
  if (!symbol) {
    if (prev && !prev.quoteSymbol) return body; // inversión antigua sin vincular: se mantiene
    throw bad('Busca el valor en el mercado para que su precio sea real. Si no cotiza (un depósito, un plan privado…), elige el tipo «Depósito» u «Otro».');
  }
  if (!SYMBOL_RE.test(symbol)) throw bad('Símbolo de mercado no válido.');
  const out = { ...body, quoteSymbol: symbol };
  delete out.currentPrice; // el precio lo pone el mercado
  if (prev && prev.quoteSymbol === symbol && body.quoteSymbol === undefined) return out;
  if (prev && prev.quoteSymbol === symbol && prev.priceAt) return out;
  let q;
  try {
    q = await marketQuote(symbol, db.settings.currency || 'EUR');
  } catch (err) {
    if (err.network || /conexi|intermediario|responde/i.test(String(err.message))) {
      // El mercado no responde ahora: se crea vinculada y sin precio; se completa sola en la siguiente consulta.
      Object.assign(out, { currentPrice: 0, priceAt: null, prevClose: null, dayChangePct: null, nativePrice: null, spark: [] });
      return out;
    }
    throw bad(`No se pudo obtener la cotización de ${symbol}: ${err.message}`);
  }
  Object.assign(out, quoteFields(q));
  if (!merged.name) out.name = q.name;
  return out;
}

function quoteFields(q) {
  return {
    currentPrice: q.price,
    prevClose: q.prevClose,
    dayChangePct: q.dayChangePct,
    nativeCurrency: q.nativeCurrency,
    nativePrice: q.nativePrice,
    marketName: q.name,
    exchange: q.exchange,
    priceAt: q.time || new Date().toISOString(),
    priceSource: q.source || MARKET_SOURCE,
    spark: q.spark,
    priceUpdatedAt: todayISO()
  };
}

let refreshing = null;
async function refreshPrices(ids) {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const target = db.settings.currency || 'EUR';
    const results = [];
    for (const inv of db.investments) {
      if ((ids && !ids.includes(inv.id)) || !isMarketLinked(inv)) continue;
      try {
        const fields = quoteFields(await marketQuote(inv.quoteSymbol, target));
        const current = db.investments.find((x) => x.id === inv.id);
        if (current) Object.assign(current, fields, { updatedAt: new Date().toISOString() });
        results.push({ id: inv.id, name: inv.name, ok: true, price: fields.currentPrice, symbol: inv.quoteSymbol });
      } catch (err) {
        results.push({ id: inv.id, name: inv.name, ok: false, error: err.message });
      }
    }
    // Operaciones sin comprobar (de versiones anteriores o de ejemplo): se compara su precio con el del mercado ese día.
    let checked = 0;
    for (const op of db.ops) {
      if (checked >= 25) break;
      if (op.market || !['buy', 'sell'].includes(op.type)) continue;
      const inv = db.investments.find((i) => i.id === op.investmentId);
      if (!isMarketLinked(inv) || (ids && !ids.includes(inv.id))) continue;
      checked += 1;
      try {
        const ctx = await marketPriceOn(inv.quoteSymbol, op.date, target);
        const current = db.ops.find((x) => x.id === op.id);
        if (!current) continue;
        current.market = { ...ctx, checkedAt: new Date().toISOString() };
        if (current.demo) { current.price = ctx.close; current.priceMode = 'market'; }
        else if (current.priceMode === 'pending') current.priceMode = 'execution';
        else if (!current.priceMode) current.priceMode = 'manual';
      } catch { /* se reintentará en la próxima actualización */ }
    }
    db.settings.pricesRefreshedAt = new Date().toISOString();
    return results;
  })();
  try { return await refreshing; } finally { refreshing = null; }
}

// ---------------------------------------------------------------- HTTP
function json(res, code, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  });
  res.end(body);
}

function readJson(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks.length = 0;
        reject(new HttpError(413, 'El archivo es demasiado grande.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return;
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(bad('El contenido no es JSON válido.'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Método no permitido');
  }
  let rel = pathname === '/' ? '/index.html' : pathname;
  let filePath;
  try {
    filePath = path.resolve(PUBLIC_DIR, '.' + decodeURIComponent(rel));
  } catch {
    res.writeHead(400);
    return res.end('Petición no válida');
  }
  const relative = path.relative(PUBLIC_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403);
    return res.end('Prohibido');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' wss://ws-feed.exchange.coinbase.com wss://ws.finnhub.io wss://streamer.finance.yahoo.com; manifest-src 'self'; base-uri 'none'; form-action 'self'"
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

function collectionById(col, id) {
  return db[col].find((item) => item.id === id);
}

async function handleApi(req, res, pathname) {
  const method = req.method || 'GET';

  if (pathname === '/api/ping' && method === 'GET') return json(res, 200, { ok: true, version: VERSION });
  if (pathname === '/api/session' && method === 'GET') {
    return json(res, 200, {
      version: VERSION,
      locked: !isAuthed(req),
      pinEnabled: Boolean(db.settings.pinHash),
      lanExposed: Boolean(networkInfo().urls?.length),
      port: LISTEN_PORT
    });
  }
  if (pathname === '/api/login' && method === 'POST') {
    const ip = clientIp(req);
    if (loginBlocked(ip)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
    const body = await readJson(req);
    if (!verifyPin(body.pin, db.settings.pinHash)) {
      registerFailure(ip);
      throw new HttpError(401, 'PIN incorrecto.');
    }
    loginAttempts.delete(ip);
    const sid = createSession();
    res.setHeader('Set-Cookie', cookieHeader(sid));
    return json(res, 200, { ok: true });
  }
  if (pathname === '/api/logout' && method === 'POST') {
    const sid = readCookie(req, 'mc_session');
    if (sid) sessions.delete(sid);
    res.setHeader('Set-Cookie', 'mc_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  if (!isAuthed(req)) throw new HttpError(401, 'Bloqueado. Introduce tu PIN.');

  if (pathname === '/api/revision' && method === 'GET') {
    runRecurringAndSave();
    return json(res, 200, { rev: Number(db.rev) || 0 });
  }

  if (pathname === '/api/state' && method === 'GET') {
    runRecurringAndSave();
    return json(res, 200, publicState());
  }

  const runMatch = pathname.match(/^\/api\/recurring\/([^/]+)\/skip$/);
  if (runMatch && method === 'POST') {
    const rule = db.recurring.find((r) => r.id === decodeURIComponent(runMatch[1]));
    if (!rule) throw new HttpError(404, 'No existe.');
    rule.nextDate = advanceDate(rule.nextDate, rule.frequency, rule.anchorDay);
    if (rule.endDate && rule.nextDate > rule.endDate) rule.active = false;
    return json(res, 200, commit());
  }

  if (pathname === '/api/settings' && (method === 'PATCH' || method === 'PUT')) {
    const body = await readJson(req);
    if (body.theme !== undefined) {
      if (!THEMES.includes(body.theme)) throw bad('Tema no válido.');
      db.settings.theme = body.theme;
    }
    if (body.currency !== undefined) {
      const currency = String(body.currency).toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw bad('Moneda no válida.');
      db.settings.currency = currency;
    }
    if (body.locale !== undefined) db.settings.locale = validLocale(body.locale, db.settings.locale);
    if (body.autoPrices !== undefined) db.settings.autoPrices = Boolean(body.autoPrices);
    if (body.finnhubKey !== undefined) {
      const key = String(body.finnhubKey || '').trim();
      if (key && !/^[A-Za-z0-9]{12,64}$/.test(key)) throw bad('La clave de Finnhub no tiene el formato correcto.');
      db.settings.finnhubKey = key;
    }
    if (body.marketProxy !== undefined) {
      const proxy = String(body.marketProxy || '').trim().slice(0, 300);
      if (proxy && !/^https:\/\/[^\s]+$/i.test(proxy)) throw bad('El intermediario debe ser una dirección https://');
      db.settings.marketProxy = proxy;
    }
    if (body.profile !== undefined) {
      if (!PROFILES.includes(body.profile)) throw bad('Perfil no válido.');
      db.settings.profile = body.profile;
    }
    if (body.modules !== undefined) db.settings.modules = sanitizeModules(body.modules, db.settings.modules || defaultModules(db.settings.profile));
    if (body.onboarded !== undefined) db.settings.onboarded = Boolean(body.onboarded);
    if (body.business !== undefined) {
      const next = sanitizeBusiness(body.business, db.settings.business || {});
      if (next.nif && !validateNif(next.nif).ok) throw bad(`Tu NIF: ${validateNif(next.nif).message}.`);
      db.settings.business = next;
    }
    return json(res, 200, commit());
  }

  if (pathname === '/api/pin' && method === 'POST') {
    const body = await readJson(req);
    if (body.newPin && !/^\d{4,8}$/.test(String(body.newPin))) throw bad('El PIN debe tener entre 4 y 8 dígitos.');
    if (db.settings.pinHash && !verifyPin(body.currentPin, db.settings.pinHash)) {
      throw new HttpError(403, 'El PIN actual no es correcto.');
    }
    sessions.clear();
    if (body.newPin) {
      db.settings.pinHash = hashPin(body.newPin);
      const sid = createSession();
      res.setHeader('Set-Cookie', cookieHeader(sid));
    } else {
      db.settings.pinHash = null;
      res.setHeader('Set-Cookie', 'mc_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    }
    return json(res, 200, commit());
  }

  if (pathname === '/api/budgets' && method === 'POST') {
    const body = await readJson(req);
    const budgets = body.budgets && typeof body.budgets === 'object' ? body.budgets : {};
    for (const [id, value] of Object.entries(budgets)) {
      const category = db.categories.find((c) => c.id === id && c.kind === 'expense');
      if (category) category.budget = Math.max(0, round2(value));
    }
    return json(res, 200, commit());
  }

  if (pathname === '/api/network' && method === 'GET') return json(res, 200, networkInfo());

  if (pathname === '/api/backups' && method === 'GET') return json(res, 200, { backups: listBackups() });
  if (pathname === '/api/backups' && method === 'POST') {
    const name = saveBackupNow('manual');
    return json(res, 200, { ok: true, name, backups: listBackups() });
  }
  if (pathname === '/api/backups/restore' && method === 'POST') {
    const body = await readJson(req);
    const snapshot = readBackup(body.name);
    const { state, counts } = importState(snapshot);
    saveBackupNow('antes-de-restaurar');
    db = state;
    runRecurring();
    return json(res, 200, { ...commit(), imported: counts });
  }

  if (pathname === '/api/market/search' && method === 'POST') {
    const body = await readJson(req);
    try { return json(res, 200, { results: await marketSearch(body.q) }); }
    catch (err) { throw bad(err.message); }
  }

  if (pathname === '/api/market/quote' && method === 'POST') {
    const body = await readJson(req);
    const symbol = String(body.symbol || '').trim().toUpperCase();
    if (!SYMBOL_RE.test(symbol)) throw bad('Símbolo no válido.');
    try { return json(res, 200, { quote: await marketQuote(symbol, db.settings.currency || 'EUR') }); }
    catch (err) { throw bad(err.message); }
  }

  if (pathname === '/api/market/price' && method === 'POST') {
    const body = await readJson(req);
    const symbol = String(body.symbol || '').trim().toUpperCase();
    if (!SYMBOL_RE.test(symbol)) throw bad('Símbolo no válido.');
    try { return json(res, 200, { price: await marketPriceOn(symbol, String(body.date || ''), db.settings.currency || 'EUR') }); }
    catch (err) { throw bad(err.message); }
  }

  if (pathname === '/api/prices/refresh' && method === 'POST') {
    const body = await readJson(req);
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : null;
    const results = await refreshPrices(ids);
    return json(res, 200, { ...commit(), results });
  }

  if (pathname === '/api/sync/seal' && method === 'POST') {
    const body = await readJson(req);
    const { pinHash, ...settings } = db.settings;
    return json(res, 200, { package: sealPackage(body.passphrase, { ...publicState(), settings }) });
  }
  if (pathname === '/api/sync/open' && method === 'POST') {
    const body = await readJson(req);
    return json(res, 200, { data: openPackage(body.passphrase, body.package) });
  }
  if (pathname === '/api/sync/merge' && method === 'POST') {
    const body = await readJson(req);
    if (!body.data || !Array.isArray(body.data.accounts)) throw bad('Los datos a combinar no son válidos.');
    const merged = mergeStates(db, body.data);
    const { state, counts } = importState(merged);
    saveBackupNow('antes-de-sincronizar');
    db = state;
    runRecurring();
    return json(res, 200, { ...commit(), imported: counts });
  }

  if (pathname === '/api/import' && method === 'POST') {
    const body = await readJson(req);
    const { state, counts } = importState(body.data);
    saveBackupNow('antes-de-importar');
    db = state;
    runRecurring();
    const result = commit();
    return json(res, 200, { ...result, imported: counts });
  }

  if (pathname === '/api/demo' && method === 'POST') {
    saveBackupNow('antes-de-demo');
    const settings = { ...db.settings };
    const demo = demoState(settings.profile || 'personal');
    db = demo;
    // Los datos fiscales de ejemplo solo se usan si aún no has puesto los tuyos.
    db.settings = { ...settings, business: settings.business?.nif ? settings.business : sanitizeBusiness(demo.settings.business) };
    runRecurring();
    return json(res, 200, commit());
  }

  if (pathname === '/api/reset' && method === 'POST') {
    saveBackupNow('antes-de-borrar');
    const settings = { ...db.settings };
    const rev = db.rev;
    db = defaultState();
    db.settings = settings;
    db.rev = rev;
    return json(res, 200, commit());
  }

  const invMatch = pathname.match(/^\/api\/invoices\/([^/]+)\/(issue|pay|unpay|rectify)$/);
  if (invMatch && method === 'POST') {
    const inv = db.invoices.find((i) => i.id === decodeURIComponent(invMatch[1]));
    if (!inv) throw new HttpError(404, 'No existe esa factura.');
    const body = await readJson(req);
    const action = invMatch[2];
    if (action === 'issue') {
      if (inv.status !== 'draft') throw bad('Esta factura ya está emitida.');
      issueInvoice(inv);
    } else if (action === 'pay') payInvoice(inv, body);
    else if (action === 'unpay') unpayInvoice(inv);
    else if (action === 'rectify') {
      const draft = rectifyInvoice(inv);
      return json(res, 200, { ...commit(), createdId: draft.id });
    }
    return json(res, 200, commit());
  }

  const match = pathname.match(/^\/api\/([a-z]+)(?:\/([^/]+))?$/);
  if (!match) throw new HttpError(404, 'Ruta no encontrada.');
  const col = match[1];
  const id = match[2] ? decodeURIComponent(match[2]) : null;
  if (!COLLECTIONS.includes(col)) throw new HttpError(404, 'Ruta no encontrada.');

  if (method === 'POST' && !id) {
    let body = await readJson(req);
    if (col === 'ops') body = await prepareMarketOp(body);
    if (col === 'investments') body = await prepareMarketInvestment(body);
    const item = sanitizeByCollection(col, body, null);
    item.updatedAt = new Date().toISOString();
    db[col].push(item);
    if (col === 'recurring') runRecurring();
    if (col === 'purchases') linkPurchaseTx(item);
    if (col === 'invoices' && body.issue) {
      try { issueInvoice(item); } catch (err) { db.invoices = db.invoices.filter((i) => i.id !== item.id); throw err; }
    }
    return json(res, 200, { ...commit(), createdId: item.id });
  }

  if ((method === 'PATCH' || method === 'PUT') && id) {
    const index = db[col].findIndex((item) => item.id === id);
    if (index < 0) throw new HttpError(404, 'No existe.');
    let body = await readJson(req);
    const prev = db[col][index];
    if (col === 'ops') body = await prepareMarketOp(body, prev);
    if (col === 'investments') body = await prepareMarketInvestment(body, prev);
    if (col === 'categories' && body.kind && body.kind !== prev.kind && db.transactions.some((t) => t.categoryId === id)) {
      throw bad('No puedes cambiar el tipo de una categoría que ya tiene movimientos.');
    }
    const merged = { ...prev, ...body, id: prev.id };
    const item = sanitizeByCollection(col, merged, prev, (next) =>
      db.ops.map((o) => (o.id === prev.id ? next : o)));
    item.updatedAt = new Date().toISOString();
    db[col][index] = item;
    if (col === 'recurring') runRecurring();
    if (col === 'purchases') linkPurchaseTx(item);
    if (col === 'invoices' && body.issue && item.status === 'draft') {
      try { issueInvoice(item); } catch (err) { db[col][index] = prev; throw err; }
    }
    return json(res, 200, commit());
  }

  if (method === 'DELETE' && id) {
    const item = collectionById(col, id);
    if (!item) throw new HttpError(404, 'No existe.');
    if (col === 'accounts') {
      const used = db.transactions.some((t) => t.accountId === id || t.toAccountId === id);
      if (used) throw bad('Esta cuenta tiene movimientos. Elimínalos o cámbialos de cuenta primero.');
      if (db.ops.some((o) => o.accountId === id)) throw bad('Esta cuenta tiene operaciones de inversión asociadas. Cámbialas de cuenta primero.');
      if (db.recurring.some((r) => r.accountId === id || r.toAccountId === id)) throw bad('Esta cuenta se usa en movimientos recurrentes. Edítalos o elimínalos primero.');
      for (const g of db.goals) if (g.accountId === id) g.accountId = null;
      for (const l of db.loans) if (l.accountId === id) l.accountId = null;
    }
    if (col === 'categories') {
      const used = db.transactions.some((t) => t.categoryId === id);
      if (used) throw bad('Esta categoría tiene movimientos. Elimínalos o cámbialos primero.');
      if (db.recurring.some((r) => r.categoryId === id)) throw bad('Esta categoría se usa en movimientos recurrentes. Edítalos o elimínalos primero.');
      for (const l of db.loans) if (l.categoryId === id) l.categoryId = null;
    }
    if (col === 'invoices' && item.status !== 'draft') {
      throw bad('Una factura emitida no se puede borrar (la numeración debe ser correlativa). Crea una factura rectificativa.');
    }
    if (col === 'clients' && db.invoices.some((i) => i.clientId === id && i.status !== 'draft')) {
      throw bad('Este cliente tiene facturas emitidas. Puedes editar sus datos, pero no borrarlo.');
    }
    if (col === 'clients') for (const i of db.invoices) if (i.clientId === id) i.clientId = null;
    if (col === 'purchases' && item.transactionId) {
      db.transactions = db.transactions.filter((t) => t.id !== item.transactionId);
      recordDeletion('transactions', item.transactionId);
    }
    if (col === 'transactions') {
      for (const i of db.invoices) if (i.transactionId === id) { i.transactionId = null; i.status = 'issued'; i.paidDate = null; }
      for (const p of db.purchases) if (p.transactionId === id) { p.transactionId = null; p.accountId = null; }
    }
    if (col === 'accounts') for (const p of db.purchases) if (p.accountId === id) p.accountId = null;
    db[col] = db[col].filter((x) => x.id !== id);
    recordDeletion(col, id);
    if (col === 'investments') {
      for (const o of db.ops) if (o.investmentId === id) recordDeletion('ops', o.id);
      db.ops = db.ops.filter((o) => o.investmentId !== id);
    }
    if (col === 'recurring') {
      for (const t of db.transactions) if (t.recurringId === id) t.recurringId = null;
      for (const l of db.loans) if (l.recurringId === id) l.recurringId = null;
    }
    return json(res, 200, commit());
  }

  throw new HttpError(405, 'Método no permitido.');
}

function sanitizeByCollection(col, obj, prev, candidateList) {
  switch (col) {
    case 'accounts': return sanitizeAccount(obj, prev);
    case 'categories': return sanitizeCategory(obj, prev);
    case 'transactions': return sanitizeTransaction(obj, prev);
    case 'investments': return sanitizeInvestment(obj, prev);
    case 'ops': return sanitizeOp(obj, prev, candidateList);
    case 'recurring': return sanitizeRecurring(obj, prev);
    case 'goals': return sanitizeGoal(obj, prev);
    case 'loans': return sanitizeLoan(obj, prev);
    case 'clients': return sanitizeClient(obj, prev);
    case 'invoices': return sanitizeInvoice(obj, prev);
    case 'purchases': return sanitizePurchase(obj, prev);
    default: throw new HttpError(404, 'Ruta no encontrada.');
  }
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  } catch {
    res.writeHead(400);
    return res.end('Petición no válida');
  }
  const done = (err) => {
    if (res.headersSent) return;
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    json(res, status, { error: err instanceof HttpError ? err.message : 'Error interno del servidor.' });
  };
  if (pathname.startsWith('/api/')) {
    try {
      assertLocalRequest(req);
      assertJsonBody(req);
    } catch (err) {
      return done(err);
    }
    Promise.resolve(handleApi(req, res, pathname)).catch(done);
  } else {
    try { serveStatic(req, res, pathname); } catch (err) { done(err); }
  }
});

// ---------------------------------------------------------------- protección de red
/** Nombre de host sin puerto ni corchetes (para Host y Origin). */
function hostNameOf(value) {
  const host = String(value || '').trim().toLowerCase();
  if (!host) return '';
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end > 0 ? host.slice(1, end).replace(/%[0-9a-z]+$/i, '') : host;
  }
  return host.replace(/%[0-9a-z]+$/i, '').replace(/:\d+$/, '');
}
let allowedHostsCache = { at: 0, set: new Set() };
/** Direcciones por las que se puede abrir la app: localhost, IPs de la máquina y MC_ALLOWED_HOSTS. */
function allowedHostNames() {
  if (Date.now() - allowedHostsCache.at < 30000) return allowedHostsCache.set;
  const set = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
  const hostname = String(os.hostname() || '').toLowerCase();
  if (hostname) { set.add(hostname); set.add(`${hostname}.local`); }
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface?.address) set.add(String(iface.address).toLowerCase().replace(/%[0-9a-z]+$/i, ''));
    }
  }
  for (const item of String(process.env.MC_ALLOWED_HOSTS || '').split(',')) {
    const value = hostNameOf(item);
    if (value) set.add(value);
  }
  allowedHostsCache = { at: Date.now(), set };
  return set;
}
/** Bloquea DNS rebinding (Host ajeno) y peticiones de otras webs al servidor local (Origin ajeno). */
function assertLocalRequest(req) {
  const allowed = allowedHostNames();
  const host = hostNameOf(req.headers.host);
  if (host && !allowed.has(host)) {
    throw new HttpError(403, 'Acceso bloqueado: abre Mi Cartera desde su dirección local.');
  }
  const origin = req.headers.origin;
  if (origin) {
    let parsed;
    try { parsed = new URL(String(origin)); } catch { throw new HttpError(403, 'Origen no permitido.'); }
    if (!allowed.has(hostNameOf(parsed.host)) || parsed.host.toLowerCase() !== String(req.headers.host || '').toLowerCase()) {
      throw new HttpError(403, 'Origen no permitido.');
    }
  }
}
/** Solo se aceptan cuerpos JSON: evita CSRF con formularios HTML o text/plain. */
function assertJsonBody(req) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
  const hasBody = Number(req.headers['content-length'] || 0) > 0 || Boolean(req.headers['transfer-encoding']);
  if (!hasBody) return;
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (!type.startsWith('application/json')) {
    throw new HttpError(415, 'Formato no admitido: envía la petición como application/json.');
  }
}

function openBrowser(url) {
  if (process.argv.includes('--no-open')) return;
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch { /* abrir el navegador es opcional */ }
}

/** ¿Lo que ocupa el puerto es otra Mi Cartera ya abierta? */
async function isMiCartera(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/ping`, { signal: AbortSignal.timeout(1500) });
    const body = await response.json();
    return body && body.ok === true && typeof body.version === 'string';
  } catch {
    return false;
  }
}

const PORT_FIXED = Boolean(process.env.PORT);
const MAX_PORT = PORT + 10;
server.on('error', async (err) => {
  if (err.code !== 'EADDRINUSE') {
    console.error(err);
    process.exit(1);
  }
  if (await isMiCartera(LISTEN_PORT)) {
    const url = `http://localhost:${LISTEN_PORT}`;
    console.log(`\n  Mi Cartera ya está abierta en ${url}. Te la abro en el navegador.\n`);
    openBrowser(url);
    setTimeout(() => process.exit(0), 800);
    return;
  }
  if (!PORT_FIXED && LISTEN_PORT < MAX_PORT) {
    console.log(`  El puerto ${LISTEN_PORT} lo usa otro programa. Probando con el ${LISTEN_PORT + 1}…`);
    LISTEN_PORT += 1;
    server.listen(LISTEN_PORT, LISTEN_HOST);
    return;
  }
  console.error(`\nEl puerto ${LISTEN_PORT} ya está en uso por otro programa. Ciérralo o elige otro: set PORT=4400 && node server.js\n`);
  process.exit(1);
});

try {
  const created = runRecurringAndSave();
  if (created) console.log(`  Recurrentes: ${created} movimiento(s) generado(s) al arrancar.`);
} catch (err) { console.error('No se pudieron generar los recurrentes:', err.message); }
setInterval(() => { try { runRecurringAndSave(); } catch { /* reintenta en la próxima vuelta */ } }, 60 * 60 * 1000).unref();

/** Si el usuario lo ha activado, actualiza las cotizaciones una vez al día. */
async function autoRefreshPrices() {
  if (!db.settings.autoPrices || !db.investments.length) return;
  const last = Date.parse(db.settings.pricesRefreshedAt || '') || 0;
  if (Date.now() - last < 30 * 60 * 1000) return;
  try {
    const results = await refreshPrices(null);
    commit();
    const ok = results.filter((r) => r.ok).length;
    console.log(`  Cotizaciones: ${ok} de ${results.length} actualizadas.`);
  } catch (err) { console.error('  No se pudieron actualizar las cotizaciones:', err.message); }
}

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  const local = `http://localhost:${LISTEN_PORT}`;
  console.log('\n  Mi Cartera · finanzas personales 100% locales\n');
  console.log(`  Ordenador:  ${local}`);
  for (const url of networkInfo().urls) console.log(`  Móvil:      ${url}   (misma Wi-Fi)`);
  console.log(`  Datos:      ${DB_FILE}`);
  if (process.platform === 'win32') console.log('  ¿El móvil no entra? Ejecuta una vez permitir-movil.bat (pide permiso de administrador).');
  console.log('\n  Para detener el servidor: Ctrl+C\n');
  setTimeout(() => openBrowser(local), 400);
  setTimeout(autoRefreshPrices, 5000).unref();
  setInterval(autoRefreshPrices, 30 * 60 * 1000).unref();
});
