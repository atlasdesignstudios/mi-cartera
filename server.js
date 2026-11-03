// Mi Cartera — servidor local sin dependencias externas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const PORT = Number(process.env.PORT) || 4321;
const VERSION = '1.1.0';

fs.mkdirSync(BACKUP_DIR, { recursive: true });

const ACCOUNT_TYPES = ['bank', 'savings', 'cash', 'card', 'broker', 'other'];
const INVEST_TYPES = ['stock', 'etf', 'fund', 'crypto', 'deposit', 'other'];
const TX_TYPES = ['income', 'expense', 'transfer'];
const COLLECTIONS = ['accounts', 'categories', 'transactions', 'investments', 'ops', 'recurring', 'goals'];
const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'];
const THEMES = ['auto', 'light', 'dark'];
const PALETTE = ['#0e9f6e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#f97316'];

const uid = () => crypto.randomUUID();
const pad = (n) => String(n).padStart(2, '0');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round8 = (n) => Math.round((Number(n) || 0) * 1e8) / 1e8;
const round6 = (n) => Math.round((Number(n) || 0) * 1e6) / 1e6;
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
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
    settings: { currency: 'EUR', locale: 'es-ES', theme: 'auto', pinHash: null },
    accounts: [
      acc('Cuenta principal', 'bank', '#0e9f6e'),
      acc('Ahorro', 'savings', '#3b82f6'),
      acc('Efectivo', 'cash', '#f59e0b')
    ],
    categories: [
      cat('Vivienda', 'expense', '🏠', '#6366f1'),
      cat('Alimentación', 'expense', '🛒', '#10b981'),
      cat('Transporte', 'expense', '🚗', '#f59e0b'),
      cat('Restaurantes', 'expense', '🍽️', '#f97316'),
      cat('Salud', 'expense', '💊', '#ef4444'),
      cat('Ocio', 'expense', '🎬', '#ec4899'),
      cat('Compras', 'expense', '🛍️', '#8b5cf6'),
      cat('Suscripciones', 'expense', '📺', '#06b6d4'),
      cat('Educación', 'expense', '📚', '#3b82f6'),
      cat('Viajes', 'expense', '✈️', '#14b8a6'),
      cat('Mascotas', 'expense', '🐾', '#a3e635'),
      cat('Impuestos', 'expense', '🧾', '#64748b'),
      cat('Otros gastos', 'expense', '📦', '#94a3b8'),
      cat('Nómina', 'income', '💼', '#0e9f6e'),
      cat('Freelance', 'income', '🧑‍💻', '#0ea5e9'),
      cat('Dividendos', 'income', '📈', '#8b5cf6'),
      cat('Intereses', 'income', '🏦', '#14b8a6'),
      cat('Ventas', 'income', '🏷️', '#f59e0b'),
      cat('Regalos', 'income', '🎁', '#ec4899'),
      cat('Otros ingresos', 'income', '➕', '#94a3b8')
    ],
    transactions: [],
    investments: [],
    ops: [],
    recurring: [],
    goals: []
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
      goals: Array.isArray(parsed.goals) ? parsed.goals : []
    };
    state.rev = Number(state.rev) || 0;
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

function createSession() {
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, Date.now() + SESSION_MS);
  return sid;
}
function cookieHeader(sid) {
  return `mc_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}`;
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
  if (entry.first + 10 * 60 * 1000 < Date.now()) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= 10;
}
function registerFailure(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || entry.first + 10 * 60 * 1000 < Date.now()) loginAttempts.set(ip, { count: 1, first: Date.now() });
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
    icon: clean(obj.icon, 8) || (kind === 'income' ? '➕' : '📦'),
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
  return {
    id: ensureId(obj, prev),
    type,
    amount,
    date: validDate(obj.date) ? obj.date : todayISO(),
    accountId: account.id,
    toAccountId,
    categoryId,
    note: clean(obj.note, 500),
    recurringId: prev ? prev.recurringId || null : (db.recurring.some((r) => r.id === obj.recurringId) ? obj.recurringId : null),
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
    color: validColor(obj.color) || '#8b5cf6',
    note: clean(obj.note, 300),
    createdAt: prev?.createdAt || new Date().toISOString()
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
  const op = {
    id: ensureId(obj, prev),
    investmentId: investment.id,
    accountId,
    type,
    units,
    price,
    fees,
    date: validDate(obj.date) ? obj.date : todayISO(),
    note: clean(obj.note, 300),
    createdAt: prev?.createdAt || new Date().toISOString()
  };
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
  const startDate = validDate(obj.startDate) ? obj.startDate : prev?.startDate || todayISO();
  const endDate = validDate(obj.endDate) ? obj.endDate : null;
  if (endDate && endDate < startDate) throw bad('La fecha de fin no puede ser anterior al inicio.');
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
  return {
    id: ensureId(obj, prev),
    name: clean(obj.name, 60) || 'Objetivo',
    icon: clean(obj.icon, 8) || '🎯',
    color: validColor(obj.color) || '#3b82f6',
    target,
    saved: accountId ? 0 : Math.max(0, round2(obj.saved)),
    accountId,
    deadline: validDate(obj.deadline) ? obj.deadline : null,
    note: clean(obj.note, 300),
    done: Boolean(obj.done),
    createdAt: prev?.createdAt || new Date().toISOString()
  };
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

function demoState() {
  const s = defaultState();
  const [main, savings, cash] = s.accounts;
  main.initialBalance = 2350;
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
    add('income', 2850, off, 1, main.id, 'Nómina', 'Nómina mensual');
    if (off === -4 || off === -1) add('income', 480, off, 12, main.id, 'Freelance', 'Proyecto web');
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

  const inv = (name, symbol, type, currentPrice, color, note) => {
    const item = {
      id: uid(), name, symbol, type, currentPrice, color,
      priceUpdatedAt: todayISO(), note, createdAt: new Date().toISOString()
    };
    s.investments.push(item);
    return item;
  };
  const op = (investmentId, type, units, price, fees, offset, day, note) =>
    s.ops.push({
      id: uid(), investmentId, type, units: round8(units), price, fees,
      date: monthDate(offset, day), note: note || '', createdAt: new Date().toISOString()
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
  rule('income', 2850, main.id, 'Nómina', 'Nómina mensual', 'monthly', 1);
  rule('expense', 950, main.id, 'Vivienda', 'Alquiler', 'monthly', 2);
  rule('expense', 59.9, main.id, 'Suscripciones', 'Internet y móvil', 'monthly', 3);
  rule('expense', 12.99, main.id, 'Suscripciones', 'Streaming', 'monthly', 4);
  rule('transfer', 350, main.id, null, 'Ahorro automático', 'monthly', 3, savings.id);
  rule('expense', 320, main.id, 'Impuestos', 'Seguro del coche', 'yearly', 15);

  s.goals.push(
    { id: uid(), name: 'Fondo de emergencia', icon: '🛟', color: '#3b82f6', target: 9000, saved: 0, accountId: savings.id, deadline: monthDate(10, 1), note: '6 meses de gastos', done: false, createdAt: new Date().toISOString() },
    { id: uid(), name: 'Viaje a Japón', icon: '✈️', color: '#ec4899', target: 3200, saved: 850, accountId: null, deadline: monthDate(8, 1), note: '', done: false, createdAt: new Date().toISOString() }
  );

  const world = inv('MSCI World', 'IWDA', 'etf', 112.4, '#3b82f6', 'ETF global acumulativo');
  op(world.id, 'buy', 8, 94.1, 1, -7, 10, 'Primera aportación');
  op(world.id, 'buy', 14, 101.3, 1, -4, 8, 'Aportación periódica');

  const aapl = inv('Apple', 'AAPL', 'stock', 214.5, '#64748b', 'Acciones');
  op(aapl.id, 'buy', 4, 181.2, 1, -5, 14, '');

  const btc = inv('Bitcoin', 'BTC', 'crypto', 61500, '#f59e0b', 'Criptomoneda');
  op(btc.id, 'buy', 0.018, 54000, 2, -6, 20, '');
  op(btc.id, 'buy', 0.024, 58000, 2, -2, 18, '');

  const fund = inv('Fondo indexado', 'FIDX', 'fund', 14.9, '#8b5cf6', 'Plan de pensiones');
  op(fund.id, 'buy', 82, 12.85, 0, -3, 5, 'Aportación anual');

  return s;
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
    icon: text(c.icon, 8, c.kind === 'income' ? '➕' : '📦'),
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
    color: validColor(i.color) || '#8b5cf6',
    note: text(i.note, 300),
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
      createdAt: text(o.createdAt, 40, new Date().toISOString())
    }))
    .filter((o) => o.units > 0 && investmentIds.has(o.investmentId));
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
      icon: text(g.icon, 8, '🎯'),
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
  state.rev = db.rev;
  return { state, counts: { accounts: state.accounts.length, categories: state.categories.length, transactions: state.transactions.length, investments: state.investments.length, ops: state.ops.length, recurring: state.recurring.length, goals: state.goals.length } };
}

// ---------------------------------------------------------------- HTTP
function json(res, code, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
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
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'"
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
      dataDir: DATA_DIR,
      port: PORT
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
    res.setHeader('Set-Cookie', 'mc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  if (!isAuthed(req)) throw new HttpError(401, 'Bloqueado. Introduce tu PIN.');

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
      res.setHeader('Set-Cookie', 'mc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
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

  if (pathname === '/api/import' && method === 'POST') {
    const body = await readJson(req);
    const { state, counts } = importState(body.data);
    db = state;
    runRecurring();
    const result = commit();
    return json(res, 200, { ...result, imported: counts });
  }

  if (pathname === '/api/demo' && method === 'POST') {
    const settings = { ...db.settings };
    db = demoState();
    db.settings = settings;
    runRecurring();
    return json(res, 200, commit());
  }

  if (pathname === '/api/reset' && method === 'POST') {
    const settings = { ...db.settings };
    const rev = db.rev;
    db = defaultState();
    db.settings = settings;
    db.rev = rev;
    return json(res, 200, commit());
  }

  const match = pathname.match(/^\/api\/([a-z]+)(?:\/([^/]+))?$/);
  if (!match) throw new HttpError(404, 'Ruta no encontrada.');
  const col = match[1];
  const id = match[2] ? decodeURIComponent(match[2]) : null;
  if (!COLLECTIONS.includes(col)) throw new HttpError(404, 'Ruta no encontrada.');

  if (method === 'POST' && !id) {
    const body = await readJson(req);
    const item = sanitizeByCollection(col, body, null);
    db[col].push(item);
    if (col === 'recurring') runRecurring();
    return json(res, 200, commit());
  }

  if ((method === 'PATCH' || method === 'PUT') && id) {
    const index = db[col].findIndex((item) => item.id === id);
    if (index < 0) throw new HttpError(404, 'No existe.');
    const body = await readJson(req);
    const prev = db[col][index];
    if (col === 'categories' && body.kind && body.kind !== prev.kind && db.transactions.some((t) => t.categoryId === id)) {
      throw bad('No puedes cambiar el tipo de una categoría que ya tiene movimientos.');
    }
    const merged = { ...prev, ...body, id: prev.id };
    const item = sanitizeByCollection(col, merged, prev, (next) =>
      db.ops.map((o) => (o.id === prev.id ? next : o)));
    db[col][index] = item;
    if (col === 'recurring') runRecurring();
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
    }
    if (col === 'categories') {
      const used = db.transactions.some((t) => t.categoryId === id);
      if (used) throw bad('Esta categoría tiene movimientos. Elimínalos o cámbialos primero.');
      if (db.recurring.some((r) => r.categoryId === id)) throw bad('Esta categoría se usa en movimientos recurrentes. Edítalos o elimínalos primero.');
    }
    db[col] = db[col].filter((x) => x.id !== id);
    if (col === 'investments') db.ops = db.ops.filter((o) => o.investmentId !== id);
    if (col === 'recurring') for (const t of db.transactions) if (t.recurringId === id) t.recurringId = null;
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
    Promise.resolve(handleApi(req, res, pathname)).catch(done);
  } else {
    try { serveStatic(req, res, pathname); } catch (err) { done(err); }
  }
});

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nEl puerto ${PORT} ya está en uso. Cierra la otra instancia o ejecuta: set PORT=4322 && node server.js\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

try {
  const created = runRecurringAndSave();
  if (created) console.log(`  Recurrentes: ${created} movimiento(s) generado(s) al arrancar.`);
} catch (err) { console.error('No se pudieron generar los recurrentes:', err.message); }
setInterval(() => { try { runRecurringAndSave(); } catch { /* reintenta en la próxima vuelta */ } }, 60 * 60 * 1000).unref();

server.listen(PORT, '0.0.0.0', () => {
  const local = `http://localhost:${PORT}`;
  console.log('\n  Mi Cartera · finanzas personales 100% locales\n');
  console.log(`  Ordenador:  ${local}`);
  for (const ip of lanAddresses()) console.log(`  Móvil:      http://${ip}:${PORT}   (misma Wi-Fi)`);
  console.log(`  Datos:      ${DB_FILE}`);
  console.log('\n  Para detener el servidor: Ctrl+C\n');
  if (!process.argv.includes('--no-open')) {
    setTimeout(() => {
      try {
        if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', local], { detached: true, stdio: 'ignore' }).unref();
        else if (process.platform === 'darwin') spawn('open', [local], { detached: true, stdio: 'ignore' }).unref();
        else spawn('xdg-open', [local], { detached: true, stdio: 'ignore' }).unref();
      } catch { /* abrir el navegador es opcional */ }
    }, 400);
  }
});
