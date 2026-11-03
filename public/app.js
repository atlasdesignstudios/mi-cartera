/* Mi Cartera — aplicación (sin dependencias) */
'use strict';
import * as F from './fiscal.js';
import { GLYPHS, glyphSVG, normalizeGlyph } from './glyphs.js';

const STORAGE_KEY = 'micartera.state.v1';
const APP_VERSION = '1.7.0';
// En la versión web (GitHub Pages) no hay servidor: los datos viven en este navegador.
const WEB = Boolean(globalThis.MC_WEB);
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'UYU', 'JPY'];
const ACCOUNT_TYPES = {
  bank: 'Cuenta bancaria', savings: 'Ahorro', cash: 'Efectivo',
  card: 'Tarjeta', broker: 'Broker', other: 'Otra'
};
const INVEST_TYPES = {
  stock: { label: 'Acciones', color: '#5d7a96' },
  etf: { label: 'ETF', color: '#4f8676' },
  fund: { label: 'Fondo', color: '#9a8466' },
  crypto: { label: 'Cripto', color: '#c19a52' },
  deposit: { label: 'Depósito', color: '#7c848d' },
  other: { label: 'Otro', color: '#aab0b6' }
};
const TX_LABELS = { income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia' };
const CATEGORY_GLYPHS = ['home', 'cart', 'car', 'fuel', 'utensils', 'coffee', 'pill', 'heart', 'dumbbell', 'film', 'music', 'bag', 'tv', 'wifi', 'phone', 'bolt', 'droplet', 'book', 'graduation', 'plane', 'umbrella', 'paw', 'baby', 'gift', 'receipt', 'invoice', 'shield', 'wrench', 'briefcase', 'laptop', 'trend', 'bank', 'coins', 'card', 'tag', 'globe', 'star', 'box', 'plusCircle'];
const PALETTE = ['#0e9f6e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#f97316'];
/* Colores de categoría en pantalla: se apagan (baja saturación) y los violetas y rosas quedan casi grises.
   Los datos guardados no cambian. */
const TONE_CACHE = new Map();
function tone(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  if (TONE_CACHE.has(hex)) return TONE_CACHE.get(hex);
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, sat = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  // violetas y rosas: casi grises (malva y rosa empolvado) para no parecer una app cripto
  const cap = h >= 228 && h < 345 ? 0.16 : 0.3;
  const s2 = Math.min(sat, cap) * (sat > 0.05 ? 1 : 0);
  const l2 = Math.min(0.58, Math.max(0.44, l));
  const k = (m) => (m + h / 30) % 12;
  const a = s2 * Math.min(l2, 1 - l2);
  const f = (m) => l2 - a * Math.max(-1, Math.min(k(m) - 3, Math.min(9 - k(m), 1)));
  const out = '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  TONE_CACHE.set(hex, out);
  return out;
}
const NAV = [
  { id: 'resumen', label: 'Resumen', icon: 'home' },
  { id: 'movimientos', label: 'Movimientos', icon: 'list' },
  { id: 'recurrentes', label: 'Recurrentes', icon: 'repeat' },
  { id: 'presupuestos', label: 'Presupuestos', icon: 'target' },
  { id: 'objetivos', label: 'Objetivos', icon: 'flag' },
  { id: 'inversiones', label: 'Inversiones', icon: 'trend' },
  { id: 'prestamos', label: 'Préstamos', icon: 'bank' },
  { id: 'cuentas', label: 'Cuentas', icon: 'wallet' },
  { id: 'facturas', label: 'Facturas', icon: 'invoice' },
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'gastos', label: 'Gastos del negocio', icon: 'receipt' },
  { id: 'impuestos', label: 'Impuestos', icon: 'percent' },
  { id: 'cuota', label: 'Cuota de autónomos', icon: 'shield' },
  { id: 'informes', label: 'Informes', icon: 'chart' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' }
];
const MORE_NAV = { id: 'mas', label: 'Más', icon: 'grid' };
const ROUTES = [...NAV.map((n) => n.id), 'mas'];
const FREQ_LABELS = { weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' };
const FREQ_PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

const ICONS = {
  invoice: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 16h5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  home: '<path d="M3 10.2 12 3l9 7.2"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M16 12h.01"/><path d="M4 8h16"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12h.01"/>',
  settings: '<path d="M4 6h7M17 6h3M4 12h3M13 12h7M4 18h9M19 18h1"/><circle cx="14" cy="6" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="16" cy="18" r="2.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  arrowUpRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  transfer: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  download: '<path d="M12 3v12M6 9l6 6 6-6"/><path d="M4 21h16"/>',
  upload: '<path d="M12 21V9M6 15l6-6 6 6"/><path d="M4 3h16"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17.5h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  coins: '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><path d="M4 11v4c0 1.4 2.2 2.5 5 2.5"/><path d="M11 15.5c.6 1.1 2.6 2 5 2 2.8 0 5-1.1 5-2.5V11"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9h9Z"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  skip: '<path d="M5 5v14l10-7z"/><path d="M19 5v14"/>',
  bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  sync: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7"/><path d="M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3"/><path d="M4 20v-4.7h4.7"/>',
  sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>'
};

const store = {
  data: null,
  session: null,
  view: 'resumen',
  offline: false
};
const ui = {
  filters: { q: '', type: 'all', category: '', account: '', month: '' },
  budgetMonth: '',
  reportYear: new Date().getFullYear()
};

/* ---------------------------------------------------------------- utilidades */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function icon(name, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseISO(value) {
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function monthKey(dateStr) { return String(dateStr || '').slice(0, 7); }
function addMonths(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthLabel(key, opts = {}) {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  const text = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: opts.short ? 'short' : 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function monthName(key) {
  const [y, m] = key.split('-').map(Number);
  const t = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function shortMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'short' }).replace('.', '');
}
function dateLabel(value) {
  if (!value) return '';
  if (value === todayISO()) return 'Hoy';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (value === isoDate(yesterday)) return 'Ayer';
  const text = parseISO(value).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function locale() { return store.data?.settings?.locale || 'es-ES'; }
function currencyCode() { return store.data?.settings?.currency || 'EUR'; }
function currencySymbol() {
  try {
    const part = new Intl.NumberFormat(locale(), { style: 'currency', currency: currencyCode() })
      .formatToParts(0).find((p) => p.type === 'currency');
    return part?.value || '€';
  } catch { return '€'; }
}
function money(value, opts = {}) {
  const n = Number(value) || 0;
  const decimals = opts.decimals ?? 2;
  try {
    return new Intl.NumberFormat(locale(), {
      style: 'currency', currency: currencyCode(),
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(n);
  } catch {
    return `${n.toFixed(decimals)} €`;
  }
}
function compact(value) {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat(locale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch { return String(Math.round(n)); }
}
function percent(value, decimals = 1) {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: decimals }).format(n);
  } catch { return `${(n * 100).toFixed(decimals)}%`; }
}
function unitsLabel(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: 8 }).format(n);
}
function sum(list, fn = (x) => x) { return list.reduce((acc, item) => acc + (Number(fn(item)) || 0), 0); }
function round(n, decimals = 2) { const f = 10 ** decimals; return Math.round((Number(n) || 0) * f) / f; }
function byId(list, id) { return list.find((item) => item.id === id); }
function categoryById(id) { return byId(store.data?.categories || [], id); }
function accountById(id) { return byId(store.data?.accounts || [], id); }
function investmentById(id) { return byId(store.data?.investments || [], id); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function progressClass(pct) { return pct > 1 ? 'over' : pct >= 0.85 ? 'warn' : ''; }
function todayLong() {
  const text = new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------------------------------------------------------------- datos derivados */
function accountBalance(account) {
  let balance = Number(account.initialBalance) || 0;
  for (const tx of store.data?.transactions || []) {
    if (tx.type === 'income' && tx.accountId === account.id) balance += tx.amount;
    else if (tx.type === 'expense' && tx.accountId === account.id) balance -= tx.amount;
    else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) balance -= tx.amount;
      if (tx.toAccountId === account.id) balance += tx.amount;
    }
  }
  for (const op of store.data?.ops || []) {
    if (op.accountId !== account.id) continue;
    balance += opCashFlow(op);
  }
  return round(balance);
}
/** Efecto de una operación de inversión en la cuenta asociada: compra resta, venta suma. */
function opCashFlow(op) {
  const gross = (Number(op.units) || 0) * (Number(op.price) || 0);
  const fees = Number(op.fees) || 0;
  return op.type === 'buy' ? -(gross + fees) : gross - fees;
}
function totalCash() {
  return round(sum(store.data?.accounts || [], (a) => accountBalance(a)));
}
function computeHoldings() {
  const ops = store.data?.ops || [];
  return (store.data?.investments || []).map((inv) => {
    const list = ops
      .filter((op) => op.investmentId === inv.id)
      .sort((a, b) => (a.date === b.date ? (a.createdAt || '').localeCompare(b.createdAt || '') : a.date.localeCompare(b.date)));
    let units = 0;
    let cost = 0;
    let realized = 0;
    for (const op of list) {
      if (op.type === 'buy') {
        units += Number(op.units) || 0;
        cost += (Number(op.units) || 0) * (Number(op.price) || 0) + (Number(op.fees) || 0);
      } else {
        const avg = units > 0 ? cost / units : 0;
        const sold = Math.min(units, Number(op.units) || 0);
        realized += sold * (Number(op.price) || 0) - (Number(op.fees) || 0) - sold * avg;
        cost -= sold * avg;
        units -= sold;
      }
    }
    units = Math.max(0, round(units, 8));
    cost = Math.max(0, round(cost, 2));
    realized = round(realized, 2);
    const value = round(units * (Number(inv.currentPrice) || 0));
    const pnl = round(value - cost);
    return {
      ...inv, ops: list, units, cost, realized, value, pnl,
      avg: units > 0 ? cost / units : 0,
      pnlPct: cost > 0 ? pnl / cost : 0
    };
  });
}
function portfolioTotals(holdings = computeHoldings()) {
  const value = round(sum(holdings, (h) => h.value));
  const cost = round(sum(holdings, (h) => h.cost));
  const realized = round(sum(holdings, (h) => h.realized));
  const pnl = round(value - cost);
  return { value, cost, realized, pnl, pnlPct: cost > 0 ? pnl / cost : 0 };
}
function netWorth() {
  return round(totalCash() + portfolioTotals().value - totalDebt());
}
function monthStats(key) {
  let income = 0;
  let expense = 0;
  for (const tx of store.data?.transactions || []) {
    if (monthKey(tx.date) !== key) continue;
    if (tx.type === 'income') income += tx.amount;
    else if (tx.type === 'expense') expense += tx.amount;
  }
  income = round(income);
  expense = round(expense);
  const net = round(income - expense);
  return { income, expense, net, rate: income > 0 ? net / income : 0 };
}
function monthlySeries(count = 6) {
  const current = monthKey(todayISO());
  return Array.from({ length: count }, (_, i) => {
    const key = addMonths(current, i - count + 1);
    return { key, ...monthStats(key) };
  });
}
function spendingByCategory(key) {
  const map = new Map();
  for (const tx of store.data?.transactions || []) {
    if (tx.type !== 'expense' || monthKey(tx.date) !== key) continue;
    map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
  }
  return Array.from(map.entries())
    .map(([id, value]) => {
      const cat = categoryById(id);
      return {
        id, value: round(value),
        name: cat?.name || 'Otros', icon: cat?.icon || 'box', color: tone(cat?.color || '#94a3b8')
      };
    })
    .sort((a, b) => b.value - a.value);
}
function budgetProgress(key) {
  const spend = new Map();
  for (const tx of store.data?.transactions || []) {
    if (tx.type !== 'expense' || monthKey(tx.date) !== key) continue;
    spend.set(tx.categoryId, (spend.get(tx.categoryId) || 0) + tx.amount);
  }
  return (store.data?.categories || [])
    .filter((c) => c.kind === 'expense')
    .map((c) => {
      const spent = round(spend.get(c.id) || 0);
      const budget = round(c.budget || 0);
      return { ...c, spent, budget, remaining: round(budget - spent), pct: budget > 0 ? spent / budget : 0 };
    })
    .sort((a, b) => (b.budget - a.budget) || (b.spent - a.spent));
}
function recentTransactions(limit = 6) {
  return [...(store.data?.transactions || [])]
    .sort((a, b) => (b.date === a.date ? (b.createdAt || '').localeCompare(a.createdAt || '') : b.date.localeCompare(a.date)))
    .slice(0, limit);
}
function txTitle(tx) {
  if (tx.type === 'transfer') return 'Transferencia';
  return categoryById(tx.categoryId)?.name || (tx.type === 'income' ? 'Ingreso' : 'Gasto');
}
function txMeta(tx) {
  const from = accountById(tx.accountId)?.name || 'Cuenta';
  if (tx.type === 'transfer') {
    const to = accountById(tx.toAccountId)?.name || 'Cuenta';
    return `${from} → ${to}${tx.recurringId ? ' · fijo' : ''}${tx.note ? ' · ' + tx.note : ''}`;
  }
  return `${from}${tx.recurringId ? ' · fijo' : ''}${tx.note ? ' · ' + tx.note : ''}`;
}
function txIconColor(tx) {
  if (tx.type === 'transfer') return { icon: 'transfer', bg: '#6b7280', emoji: false };
  const cat = categoryById(tx.categoryId);
  return { icon: cat?.icon || 'box', bg: cat?.color || '#94a3b8', emoji: true };
}

/* ---------------------------------------------------------------- tema */
function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function resolvedTheme() {
  const pref = store.data?.settings?.theme || 'auto';
  return pref === 'auto' ? (prefersDark() ? 'dark' : 'light') : pref;
}
function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  const meta = document.getElementById('metaTheme');
  if (meta) meta.content = theme === 'dark' ? '#000000' : '#f4f4f2';
  for (const el of $$('[data-theme-icon]')) {
    el.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon', 18);
  }
  for (const el of $$('[data-theme-label]')) {
    el.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }
}
function setTheme(theme) {
  if (store.data) store.data.settings.theme = theme;
  applyTheme();
  api('PATCH', 'api/settings', { theme }).catch((err) => toast(err.message, 'error'));
}
function toggleTheme() {
  setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark');
}

/* ---------------------------------------------------------------- api / caché */
function cacheState(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* sin caché */ }
}
function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ? parsed : null;
  } catch { return null; }
}
function setData(data) {
  store.data = data;
  store.offline = false;
  cacheState(data);
  if (typeof applyLiveAll === 'function') { applyLiveAll(); setTimeout(syncLive, 0); }
}
async function api(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    store.offline = true;
    throw new Error('No se puede conectar con el servidor local.');
  }
  if (response.status === 401) {
    showLock();
    throw new Error('Sesión bloqueada. Introduce tu PIN.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  if (data && typeof data.rev === 'number' && Array.isArray(data.accounts)) setData(data);
  return data;
}
async function loadState() {
  const response = await fetch('api/state', { credentials: 'same-origin' });
  if (response.status === 401) { showLock(); throw new Error('Bloqueado'); }
  if (!response.ok) throw new Error('No se pudieron cargar los datos.');
  const data = await response.json();
  setData(data);
}

/* ---------------------------------------------------------------- avisos */
function toast(message, type = 'success') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : 'check', 16)}<span>${esc(message)}</span>`;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = 'opacity .2s, transform .2s';
    setTimeout(() => el.remove(), 220);
  }, type === 'error' ? 5000 : 2800);
}

/* ---------------------------------------------------------------- navegación */
function navHTML(items, bottom = false) {
  return items.map((item) => {
    const def = item === 'mas' ? MORE_NAV : NAV.find((n) => n.id === item);
    return `<a href="#/${def.id}" data-nav="${def.id}"${bottom ? ' class="bottom-link"' : ''}>${icon(def.icon, bottom ? 21 : 19)}<span>${def.label}</span></a>`;
  }).join('');
}
function initChrome() {
  const side = document.getElementById('sideNav');
  const bottom = document.getElementById('bottomNav');
  if (side && store.data) renderNav();
  else if (bottom) bottom.innerHTML = '';
  const chip = document.getElementById('todayChip');
  if (chip) chip.innerHTML = `${icon('calendar', 16)}<span>${esc(todayLong())}</span>`;
  applyTheme();
}
function readRoute() {
  const hash = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return ROUTES.includes(hash) ? hash : 'resumen';
}
function updateNav(view) {
  for (const link of $$('[data-nav]')) {
    const id = link.dataset.nav;
    const isBottom = Boolean(link.closest('.bottomnav'));
    const active = id === view || (isBottom && id === 'mas' && moreViews().includes(view) && !bottomNavItems().includes(view));
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
function render() {
  if (!store.data) return;
  applyTheme();
  const host = document.getElementById('view');
  const onboarding = !store.data.settings?.onboarded && !store.offline;
  document.body.classList.toggle('is-onboarding', onboarding);
  if (onboarding) {
    store.view = 'bienvenida';
    host.innerHTML = viewOnboarding();
    return;
  }
  let view = readRoute();
  if (!viewEnabled(view)) view = 'resumen';
  store.view = view;
  renderNav();
  updateNav(view);
  host.innerHTML = VIEWS[view] ? VIEWS[view]() : '';
  if (view === 'movimientos') renderTxList();
  updateIsland();
  const foot = document.getElementById('footInfo');
  if (foot) foot.textContent = `${store.data.transactions.length} movimientos · rev ${store.data.rev}`;
  document.body.classList.toggle('is-offline', store.offline);
}
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
});

/* ---------------------------------------------------------------- arranque / bloqueo */
function hideBoot() {
  const boot = document.getElementById('boot');
  if (boot) boot.hidden = true;
}
function showApp() {
  const app = document.getElementById('app');
  if (app) app.hidden = false;
  if (WEB) {
    const chip = document.querySelector('.local-chip');
    if (chip) chip.innerHTML = '<span class="pulse"></span> Datos solo en este navegador';
    const foot = [...document.querySelectorAll('span')].find((el) => el.textContent.includes('tus datos no salen de tu ordenador'));
    if (foot) foot.textContent = 'Mi Cartera · versión web · tus datos no salen de este navegador';
  }
}
function showLock() {
  const app = document.getElementById('app');
  const boot = document.getElementById('boot');
  const lock = document.getElementById('lock');
  for (const dialog of $$('dialog.sheet[open]')) {
    try { dialog.close(); } catch { /* ya estaba cerrado */ }
    dialog.remove();
  }
  if (app) app.hidden = true;
  if (boot) boot.hidden = true;
  if (lock) lock.hidden = false;
  setTimeout(() => document.getElementById('pinInput')?.focus(), 80);
}
function showBootError(message) {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.hidden = false;
  boot.classList.add('error');
  boot.innerHTML = `<div class="boot-card">
    <span class="brand-mark brand-mark--big" aria-hidden="true"><i></i><i></i><i></i></span>
    <h2 style="margin-top:14px;font-size:18px">No se pudo conectar</h2>
    <p>${esc(message || 'Comprueba que el servidor esté en marcha y vuelve a intentarlo.')}</p>
    <button class="btn btn-primary" type="button" data-action="retry">Reintentar</button>
  </div>`;
}
async function unlock(event) {
  event?.preventDefault();
  const input = document.getElementById('pinInput');
  const error = document.getElementById('lockError');
  const button = event?.target?.querySelector?.('button[type="submit"]');
  if (error) error.hidden = true;
  try {
    if (button) button.disabled = true;
    const response = await fetch('api/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: input?.value || '' })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo entrar.');
    if (input) input.value = '';
    await loadState();
    document.getElementById('lock').hidden = true;
    showApp();
    render();
    startPolling();
    toast('Bienvenido de nuevo');
  } catch (err) {
    if (error) {
      error.hidden = false;
      error.textContent = err.message;
    }
    if (input) input.select();
  } finally {
    if (button) button.disabled = false;
  }
}
function startPolling() {
  if (startPolling.timer) clearInterval(startPolling.timer);
  startPolling.timer = setInterval(async () => {
    if (document.hidden || !store.data) return;
    try {
      const response = await fetch('api/state', { credentials: 'same-origin' });
      if (response.status === 401) { showLock(); return; }
      if (!response.ok) return;
      const data = await response.json();
      if (data.rev !== store.data.rev || store.offline) {
        setData(data);
        render();
      }
    } catch { /* sin conexión temporal */ }
  }, 15000);
}
// Al volver a la app (cambiar de pestaña o desbloquear el móvil) se recargan los datos al momento.
document.addEventListener('visibilitychange', async () => {
  if (document.hidden || !store.data) return;
  try {
    const response = await fetch('api/state', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (data.rev !== store.data.rev || store.offline) { setData(data); render(); }
  } catch { /* sin conexión */ }
});
async function boot() {
  initChrome();
  document.getElementById('lockForm')?.addEventListener('submit', unlock);
  let bootFailed = false;
  try {
    const response = await fetch('api/session', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('No se pudo iniciar la aplicación.');
    store.session = await response.json();
    if (store.session.locked) {
      showLock();
      return;
    }
    await loadState();
    showApp();
    render();
    startPolling();
    setupServiceWorker();
    if (store.session.version && store.session.version !== APP_VERSION && !sessionStorage.getItem('mc-updated')) {
      // El servidor ya va por otra versión: el navegador tenía archivos antiguos.
      sessionStorage.setItem('mc-updated', '1');
      forceUpdate();
      return;
    }
    setTimeout(maybeAutoRefreshPrices, 1500);
    if (!boot.priceTimer) boot.priceTimer = setInterval(maybeAutoRefreshPrices, 5 * 60 * 1000);
  } catch (err) {
    if (!document.getElementById('lock')?.hidden) return;
    const cached = readCache();
    if (cached) {
      store.data = cached.data;
      store.offline = true;
      showApp();
      render();
      startPolling();
      toast('Sin conexión: mostrando la última copia guardada.', 'error');
    } else {
      bootFailed = true;
      showBootError(err.message);
    }
  } finally {
    if (!bootFailed) hideBoot();
  }
}
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if ((store.data?.settings?.theme || 'auto') === 'auto') applyTheme();
});

/* ---------------------------------------------------------------- gráficos */
function barChart(data) {
  const W = 600, H = 220, pl = 46, pr = 10, pt = 16, pb = 30;
  const plotW = W - pl - pr;
  const plotH = H - pt - pb;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const step = plotW / Math.max(1, data.length);
  const bw = Math.min(13, step * 0.24);
  const gap = 3;
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos meses">`;
  for (let i = 0; i <= 2; i += 1) {
    const y = pt + (plotH * i) / 2;
    out += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/>`;
    out += `<text x="${pl - 8}" y="${y + 3}" text-anchor="end">${esc(compact(max * (1 - i / 2)))}</text>`;
  }
  data.forEach((d, i) => {
    const cx = pl + step * i + step / 2;
    const ih = Math.max(0, (d.income / max) * plotH);
    const eh = Math.max(0, (d.expense / max) * plotH);
    out += `<rect class="bar-income" x="${(cx - bw - gap / 2).toFixed(1)}" y="${(pt + plotH - ih).toFixed(1)}" width="${bw}" height="${ih.toFixed(1)}" rx="4"><title>${esc(monthLabel(d.key))}: ${esc(money(d.income))}</title></rect>`;
    out += `<rect class="bar-expense" x="${(cx + gap / 2).toFixed(1)}" y="${(pt + plotH - eh).toFixed(1)}" width="${bw}" height="${eh.toFixed(1)}" rx="4"><title>${esc(monthLabel(d.key))}: ${esc(money(d.expense))}</title></rect>`;
    out += `<text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(shortMonth(d.key))}</text>`;
  });
  out += '</svg>';
  return `<div class="chart">${out}</div>`;
}

function donutChart(rows, total) {
  const size = 172, stroke = 21;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  let offset = 0;
  const segments = rows.slice(0, 4);
  const rest = sum(rows.slice(4), (row) => row.value);
  if (rest > 0) segments.push({ name: 'Otros', value: rest, color: '#94a3b8', icon: 'box' });
  let svg = `<svg viewBox="0 0 ${size} ${size}" class="chart" role="img" aria-label="Gastos por categoría">`;
  svg += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>`;
  for (const seg of segments) {
    const pct = total > 0 ? seg.value / total : 0;
    const len = Math.max(0, pct * c - 3);
    if (len > 0) {
      svg += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${tone(seg.color)}" stroke-width="${stroke}" stroke-linecap="butt" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
    }
    offset += pct * c;
  }
  const totalText = Math.abs(total) >= 100000 ? `${compact(total)} ${currencySymbol()}` : money(total, { decimals: 0 });
  svg += `<text x="${cx}" y="${cx - 4}" text-anchor="middle" class="donut-label">Gastos</text>`;
  svg += `<text x="${cx}" y="${cx + 15}" text-anchor="middle" class="donut-value">${esc(totalText)}</text>`;
  svg += '</svg>';
  const legend = segments.map((seg) => `
    <div class="donut-row">
      <span class="donut-dot" style="background:${tone(seg.color)}"></span>
      <span class="donut-name">${esc(seg.name)}</span>
      <b>${esc(money(seg.value, { decimals: 0 }))}</b>
    </div>`).join('');
  return `<div class="donut-wrap"><div class="donut">${svg}</div><div class="donut-legend">${legend}</div></div>`;
}

function savingsSpark() {
  const series = monthlySeries(12);
  let running = 0;
  const values = series.map((month) => { running += month.net; return running; });
  const W = 320, H = 92, pad = 6;
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const span = max - min || 1;
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, values.length - 1);
  const y = (v) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${(H - 1).toFixed(1)} L${pad} ${(H - 1).toFixed(1)} Z`;
  return {
    total: running,
    svg: `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ahorro acumulado en 12 meses">
      <path d="${area}" fill="var(--accent)" fill-opacity=".08"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg></div>`
  };
}

function bigMoney(value) {
  const text = money(value);
  const m = text.match(/^(.*?)([.,]\d{1,2})(\s?[^\d\s]*)$/);
  if (!m) return esc(text);
  return `<span class="fig-int">${esc(m[1])}</span><span class="fig-dec">${esc(m[2] + m[3])}</span>`;
}
function longToday() {
  return new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
}
function compositionBar(cash, invested) {
  const total = Math.max(0, cash) + Math.max(0, invested);
  if (total <= 0) return '';
  const c = (Math.max(0, cash) / total) * 100;
  return `<div class="composition" role="img" aria-label="Efectivo ${percent(c / 100, 0)}, invertido ${percent(1 - c / 100, 0)}"><i class="cash" style="width:${c.toFixed(2)}%"></i><i class="inv" style="width:${(100 - c).toFixed(2)}%"></i></div>`;
}
function relativeDay(iso) {
  const today = todayISO();
  const diff = Math.round((new Date(iso + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
  if (diff <= 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff < 7) return `en ${diff} días`;
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' }).replace('.', '');
}
function updateIsland() {
  const el = document.getElementById('island');
  if (!el || !store.data) return;
  const next = upcomingOccurrences(60)[0];
  if (!next) {
    el.className = 'island is-idle';
    el.innerHTML = `<span class="island-dot"></span><span class="island-text">Sin cobros ni pagos próximos</span>`;
    el.setAttribute('aria-label', 'Sin cobros ni pagos próximos. Ver recurrentes');
    return;
  }
  const r = next.rule;
  const sign = r.type === 'income' ? '+' : r.type === 'expense' ? '−' : '';
  const kind = r.type === 'income' ? 'Cobro' : r.type === 'expense' ? 'Pago' : 'Traspaso';
  const when = relativeDay(next.date);
  el.className = `island is-${r.type}`;
  el.innerHTML = `<span class="island-dot"></span><span class="island-text"><span class="island-kind">${kind}</span> ${esc(ruleTitle(r))}</span><span class="island-amt">${sign}${esc(money(r.amount))}</span><span class="island-when">${esc(when)}</span>`;
  el.setAttribute('aria-label', `Próximo ${kind.toLowerCase()}: ${ruleTitle(r)}, ${sign}${money(r.amount)}, ${when}. Ver recurrentes`);
}

function deltaBadge(current, previous, invert = false) {
  if (!previous) return '<span class="delta flat">sin datos previos</span>';
  const change = (current - previous) / Math.abs(previous);
  if (Math.abs(change) < 0.001) return '<span class="delta flat">igual que el mes anterior</span>';
  const up = change > 0;
  const cls = up ? (invert ? 'down' : 'up') : (invert ? 'up' : 'down');
  return `<span class="delta ${cls}">${icon(up ? 'arrowUp' : 'arrowDown', 12)}${percent(Math.abs(change))}</span>`;
}

function statCard(label, value, foot, kind, iconName) {
  return `<article class="stat">
    <div class="stat-top">
      <span class="stat-label">${esc(label)}</span>
      <span class="stat-ico ${kind}">${icon(iconName, 16)}</span>
    </div>
    <div class="stat-value">${value}</div>
    <div class="stat-foot">${foot}</div>
  </article>`;
}

function txRow(tx) {
  const visual = txIconColor(tx);
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const amountClass = tx.type === 'income' ? 'income' : tx.type === 'transfer' ? 'transfer' : '';
  return `<button type="button" class="txrow" data-action="edit-tx" data-id="${esc(tx.id)}">
    <span class="tx-icon" style="background:${visual.bg}1f;color:${visual.bg}">${visual.emoji ? glyphSVG(visual.icon, 18) : icon(visual.icon, 18)}</span>
    <span class="tx-main">
      <span class="tx-title">${esc(txTitle(tx))}</span>
      <span class="tx-meta">${esc(txMeta(tx))}</span>
    </span>
    <span class="tx-amt ${amountClass}">${sign}${esc(money(tx.amount))}</span>
  </button>`;
}

function budgetMiniRow(row) {
  const pct = clamp(row.pct, 0, 1);
  return `<div class="budget-row">
    <span class="budget-icon" style="background:${tone(row.color)}1f;color:${tone(row.color)}">${glyphSVG(row.icon, 18)}</span>
    <div class="budget-info">
      <div class="budget-line"><b>${esc(row.name)}</b><span>${esc(money(row.spent, { decimals: 0 }))} de ${esc(money(row.budget, { decimals: 0 }))}</span></div>
      <div class="progress ${progressClass(row.pct)}"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
    </div>
    <span class="budget-amount ${row.remaining < 0 ? 'neg' : ''}"><b>${esc(money(row.remaining, { decimals: 0 }))}</b>restante</span>
  </div>`;
}

/* ---------------------------------------------------------------- vista: resumen */
function pairCards(cards) {
  const list = cards.filter(Boolean);
  let out = '';
  for (let i = 0; i < list.length; i += 2) out += `<div class="grid-2">${list[i]}${list[i + 1] || ''}</div>`;
  return out;
}
function viewResumen() {
  const now = monthKey(todayISO());
  const stats = monthStats(now);
  const prev = monthStats(addMonths(now, -1));
  const holdings = computeHoldings();
  const portfolio = portfolioTotals(holdings);
  const cash = totalCash();
  const debt = totalDebt();
  const worth = round(cash + portfolio.value - debt);
  const spend = spendingByCategory(now);
  const spendTotal = sum(spend, (s) => s.value);
  const recent = recentTransactions(5);
  const budgets = budgetProgress(now).filter((b) => b.budget > 0).slice(0, 4);
  const spark = savingsSpark();
  const series = monthlySeries(6);
  const upcoming = upcomingOccurrences(30);
  const upcomingNet = round(sum(upcoming, (u) => (u.rule.type === 'income' ? u.rule.amount : u.rule.type === 'expense' ? -u.rule.amount : 0)));
  const goals = (store.data.goals || []).map(goalProgress).sort((a, b) => a.reached - b.reached);

  return `
  ${store.offline ? `<div class="banner">${icon('alert', 17)}<span><b>Sin conexión.</b> Estás viendo la última copia guardada en este dispositivo.</span></div>` : ''}
  <section class="hero">
    <div class="hero-content">
      <div class="hero-label">Patrimonio neto <span>a ${esc(longToday())}</span></div>
      <div class="hero-value">${bigMoney(worth)}</div>
      ${compositionBar(cash, portfolio.value)}
      <div class="hero-meta">
        <span><span class="dot cash"></span>Efectivo <b>${esc(money(cash))}</b></span>
        <span><span class="dot inv"></span>Invertido <b>${esc(money(portfolio.value))}</b></span>
        ${debt > 0 ? `<a class="hero-debt" href="#/prestamos"><span class="dot debt"></span>Deudas <b>−${esc(money(debt))}</b></a>` : ''}
      </div>
      <div class="hero-actions">
        <button class="btn btn-light" type="button" data-action="new-tx" data-type="expense">${icon('plus', 16)} Añadir movimiento</button>
        ${hasBusiness() ? `<button class="btn btn-outline-light" type="button" data-action="new-invoice">${icon('invoice', 16)} Nueva factura</button>` : moduleOn('investments') ? `<a class="btn btn-outline-light" href="#/inversiones">Ver cartera ${icon('arrowRight', 16)}</a>` : ''}
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-caption"><span>Ahorro acumulado · 12 meses</span><b>${esc(money(spark.total, { decimals: 0 }))}</b></div>
      ${spark.svg}
      <div class="hero-foot">Actualizado a las ${esc(new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }))}</div>
    </div>
  </section>

  ${firstStepsCard()}
  ${businessSummaryHTML()}
  <div class="statgrid">
    ${statCard('Ingresos del mes', bigMoney(stats.income), `${deltaBadge(stats.income, prev.income)} <span>vs. mes anterior</span>`, 'income', 'arrowUp')}
    ${statCard('Gastos del mes', bigMoney(stats.expense), `${deltaBadge(stats.expense, prev.expense, true)} <span>vs. mes anterior</span>`, 'expense', 'wallet')}
    ${statCard('Ahorro del mes', bigMoney(stats.net), `<span>${esc(percent(stats.rate))} de tus ingresos</span>`, 'net', 'sparkles')}
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="card-head">
        <div><h2>Flujo mensual</h2><p>Ingresos y gastos de los últimos 6 meses</p></div>
        <div class="legend"><span><i style="background:var(--accent)"></i>Ingresos</span><span><i style="background:var(--chart-2)"></i>Gastos</span></div>
      </div>
      ${barChart(series)}
    </section>
    <section class="card">
      <div class="card-head">
        <div><h2>Gastos por categoría</h2><p>${esc(monthLabel(now))}</p></div>
        <a class="card-link" href="#/movimientos">Ver todo ${icon('arrowRight', 14)}</a>
      </div>
      ${spendTotal > 0 ? donutChart(spend, spendTotal) : `<div class="empty"><span class="empty-icon">${icon('pie', 24)}</span><h3>Sin gastos este mes</h3><p>Cuando registres gastos verás aquí el reparto por categorías.</p></div>`}
    </section>
  </div>

  ${pairCards([
    hasBusiness() ? recentInvoicesCard() : '',
    true ? `    <section class="card">
      <div class="card-head">
        <div><h2>Últimos movimientos</h2><p>Lo que ha entrado y salido</p></div>
        <a class="card-link" href="#/movimientos">Ver todos ${icon('arrowRight', 14)}</a>
      </div>
      ${recent.length
        ? `<div class="txlist compact">${recent.map(txRow).join('')}</div>`
        : `<div class="empty"><span class="empty-icon">${icon('receipt', 24)}</span><h3>Aún no hay movimientos</h3><p>Registra tu primer ingreso o gasto para empezar.</p><button class="btn btn-primary btn-sm" type="button" data-action="new-tx">Añadir movimiento</button></div>`}
    </section>` : '',
    moduleOn('budgets') ? `    <section class="card">
      <div class="card-head">
        <div><h2>Presupuestos</h2><p>${esc(monthLabel(now))}</p></div>
        <a class="card-link" href="#/presupuestos">Gestionar ${icon('arrowRight', 14)}</a>
      </div>
      ${budgets.length
        ? budgets.map(budgetMiniRow).join('')
        : `<div class="empty"><span class="empty-icon">${icon('target', 24)}</span><h3>Ponte un límite mensual</h3><p>Define cuánto quieres gastar en cada categoría y sigue tu progreso.</p><button class="btn btn-soft btn-sm" type="button" data-action="edit-budgets">Crear presupuesto</button></div>`}
    </section>` : '',
    moduleOn('recurring') ? `    <section class="card">
      <div class="card-head">
        <div><h2>Próximos cobros y pagos</h2><p>Recurrentes de los próximos 30 días</p></div>
        <a class="card-link" href="#/recurrentes">Gestionar ${icon('arrowRight', 14)}</a>
      </div>
      ${upcoming.length
        ? `<div class="txlist compact">${upcoming.slice(0, 5).map((u) => ruleRow(u.rule, u.date, true)).join('')}</div>
           <div class="upcoming-foot"><span>Previsto en 30 días</span><b class="${upcomingNet < 0 ? 'neg' : 'pos'}">${upcomingNet >= 0 ? '+' : '−'}${esc(money(Math.abs(upcomingNet)))}</b></div>`
        : `<div class="empty"><span class="empty-icon">${icon('repeat', 24)}</span><h3>Sin recurrentes</h3><p>Programa tu nómina, el alquiler o las suscripciones y se apuntarán solos.</p><button class="btn btn-soft btn-sm" type="button" data-action="new-recurring">Crear recurrente</button></div>`}
    </section>` : '',
    moduleOn('goals') ? `    <section class="card">
      <div class="card-head">
        <div><h2>Objetivos de ahorro</h2><p>Lo que estás construyendo</p></div>
        <a class="card-link" href="#/objetivos">Ver todos ${icon('arrowRight', 14)}</a>
      </div>
      ${goals.length
        ? goals.slice(0, 4).map((g) => `<button type="button" class="budget-row goal-mini" data-action="edit-goal" data-id="${esc(g.id)}">
            <span class="budget-icon" style="background:${tone(g.color)}1f;color:${tone(g.color)}">${glyphSVG(g.icon, 18, 'target')}</span>
            <div class="budget-info">
              <div class="budget-line"><b>${esc(g.name)}</b><span>${esc(money(g.saved, { decimals: 0 }))} de ${esc(money(g.target, { decimals: 0 }))}</span></div>
              <div class="progress${g.reached ? ' done' : ''}"><i style="width:${(clamp(g.pct, 0, 1) * 100).toFixed(1)}%;background:${tone(g.color)}"></i></div>
            </div>
            <span class="budget-amount"><b>${esc(percent(g.pct, 0))}</b>${g.reached ? 'conseguido' : g.perMonth ? esc(money(g.perMonth, { decimals: 0 })) + '/mes' : 'progreso'}</span>
          </button>`).join('')
        : `<div class="empty"><span class="empty-icon">${icon('flag', 24)}</span><h3>Define un objetivo</h3><p>Fondo de emergencia, viaje, coche… y sigue cuánto te falta.</p><button class="btn btn-soft btn-sm" type="button" data-action="new-goal">Crear objetivo</button></div>`}
    </section>` : ''
  ])}`;
}

/* ---------------------------------------------------------------- vista: movimientos */
function filteredTransactions() {
  const f = ui.filters;
  const query = f.q.trim().toLowerCase();
  return [...(store.data?.transactions || [])]
    .filter((tx) => {
      if (f.type !== 'all' && tx.type !== f.type) return false;
      if (f.month && monthKey(tx.date) !== f.month) return false;
      if (f.account && tx.accountId !== f.account && tx.toAccountId !== f.account) return false;
      if (f.category && tx.categoryId !== f.category) return false;
      if (query) {
        const text = [
          txTitle(tx), txMeta(tx), TX_LABELS[tx.type] || '', String(tx.amount),
          categoryById(tx.categoryId)?.name || '', accountById(tx.accountId)?.name || '',
          accountById(tx.toAccountId)?.name || ''
        ].join(' ').toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.date === a.date ? (b.createdAt || '').localeCompare(a.createdAt || '') : b.date.localeCompare(a.date)));
}

function viewMovimientos() {
  const f = ui.filters;
  const categories = store.data.categories;
  const expenseOptions = categories.filter((c) => c.kind === 'expense')
    .map((c) => `<option value="${esc(c.id)}"${f.category === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  const incomeOptions = categories.filter((c) => c.kind === 'income')
    .map((c) => `<option value="${esc(c.id)}"${f.category === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  const accountOptions = store.data.accounts
    .map((a) => `<option value="${esc(a.id)}"${f.account === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('');

  return `
  <div class="viewhead">
    <div><h1>Movimientos</h1><p>Todo lo que entra y sale, ordenado por día.</p></div>
    <div class="head-actions">
      <button class="btn btn-ghost" type="button" data-action="new-tx" data-type="transfer">${icon('transfer', 16)} Transferir</button>
      <button class="btn btn-primary" type="button" data-action="new-tx">${icon('plus', 16)} Nuevo movimiento</button>
    </div>
  </div>

  <section class="card filters">
    <div class="filter-grid">
      <div class="field filter-search">
        ${icon('search', 16)}
        <input class="input" id="txSearch" type="search" placeholder="Buscar por nota, categoría, cuenta…" value="${esc(f.q)}" aria-label="Buscar movimientos">
      </div>
      <div class="field">
        <select class="select" id="txTypeFilter" aria-label="Tipo de movimiento">
          <option value="all"${f.type === 'all' ? ' selected' : ''}>Todos los tipos</option>
          <option value="income"${f.type === 'income' ? ' selected' : ''}>Ingresos</option>
          <option value="expense"${f.type === 'expense' ? ' selected' : ''}>Gastos</option>
          <option value="transfer"${f.type === 'transfer' ? ' selected' : ''}>Transferencias</option>
        </select>
      </div>
      <div class="field">
        <select class="select" id="txCategoryFilter" aria-label="Categoría">
          <option value="">Todas las categorías</option>
          <optgroup label="Gastos">${expenseOptions}</optgroup>
          <optgroup label="Ingresos">${incomeOptions}</optgroup>
        </select>
      </div>
      <div class="field">
        <select class="select" id="txAccountFilter" aria-label="Cuenta">
          <option value="">Todas las cuentas</option>
          ${accountOptions}
        </select>
      </div>
      <div class="field filter-month">
        <input class="input" id="txMonth" type="month" value="${esc(f.month)}" aria-label="Mes">
      </div>
    </div>
    <div class="filter-foot">
      <span class="filter-count" id="filterCount"></span>
      <button class="btn btn-ghost btn-sm" type="button" data-action="clear-filters">Limpiar filtros</button>
    </div>
  </section>

  <div class="tx-summary" id="txSummary"></div>

  <section class="card">
    <div id="txList"></div>
  </section>`;
}

function renderTxList() {
  const host = document.getElementById('txList');
  const summary = document.getElementById('txSummary');
  const count = document.getElementById('filterCount');
  if (!host || !store.data) return;
  const list = filteredTransactions();
  const income = sum(list.filter((t) => t.type === 'income'), (t) => t.amount);
  const expense = sum(list.filter((t) => t.type === 'expense'), (t) => t.amount);
  if (count) count.textContent = `${list.length} de ${store.data.transactions.length} movimientos`;
  if (summary) {
    summary.innerHTML = `
      <div class="sum-chip"><span>Movimientos</span><b>${list.length}</b></div>
      <div class="sum-chip"><span>Ingresos</span><b class="income">${esc(money(income))}</b></div>
      <div class="sum-chip"><span>Gastos</span><b>${esc(money(expense))}</b></div>
      <div class="sum-chip"><span>Neto</span><b>${esc(money(income - expense))}</b></div>`;
  }
  if (!list.length) {
    const any = store.data.transactions.length > 0;
    host.innerHTML = `<div class="empty"><span class="empty-icon">${icon(any ? 'search' : 'receipt', 24)}</span>
      <h3>${any ? 'Ningún movimiento coincide' : 'Aún no hay movimientos'}</h3>
      <p>${any ? 'Prueba a cambiar los filtros o la búsqueda.' : 'Registra tu primer ingreso o gasto y empieza a ver tu dinero con claridad.'}</p>
      <button class="btn ${any ? 'btn-ghost' : 'btn-primary'} btn-sm" type="button" data-action="${any ? 'clear-filters' : 'new-tx'}">${any ? 'Limpiar filtros' : 'Añadir movimiento'}</button>
    </div>`;
    return;
  }
  const groups = new Map();
  for (const tx of list) {
    if (!groups.has(tx.date)) groups.set(tx.date, []);
    groups.get(tx.date).push(tx);
  }
  host.innerHTML = `<div class="txlist">${Array.from(groups.entries()).map(([date, txs]) => {
    const net = sum(txs, (tx) => (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0));
    return `<div class="daygroup">
      <div class="dayhead"><h3>${esc(dateLabel(date))}</h3><span class="day-total">${net >= 0 ? '+' : '−'}${esc(money(Math.abs(net)))}</span></div>
      ${txs.map(txRow).join('')}
    </div>`;
  }).join('')}</div>`;
}

/* ---------------------------------------------------------------- vista: inversiones */
function allocationData(holdings) {
  const map = new Map();
  for (const h of holdings) {
    if (h.value <= 0) continue;
    map.set(h.type, (map.get(h.type) || 0) + h.value);
  }
  return Array.from(map.entries())
    .map(([type, value]) => ({
      type,
      label: INVEST_TYPES[type]?.label || 'Otro',
      color: INVEST_TYPES[type]?.color || '#94a3b8',
      value: round(value)
    }))
    .sort((a, b) => b.value - a.value);
}

function allocationBar(data) {
  const total = sum(data, (d) => d.value);
  if (total <= 0) return '';
  return `<div class="alloc">${data.map((d) => `<i style="width:${(d.value / total * 100).toFixed(2)}%;background:${d.color}" title="${esc(d.label)}: ${esc(money(d.value))}"></i>`).join('')}</div>
    <div class="alloc-legend">${data.map((d) => `<span><i style="background:${d.color}"></i>${esc(d.label)} ${esc(percent(d.value / total, 0))}</span>`).join('')}</div>`;
}

/* ---------------------------------------------------------------- mercado */
// Acciones, ETF, fondos y cripto se valoran siempre con el precio real del mercado (Coinbase, Finnhub, BCE y Yahoo Finance de respaldo).
const MARKET_TYPES = ['stock', 'etf', 'fund', 'crypto'];
function marketLinked(inv) { return Boolean(inv && MARKET_TYPES.includes(inv.type) && inv.quoteSymbol); }
function needsMarketLink(inv) { return Boolean(inv && MARKET_TYPES.includes(inv.type) && !inv.quoteSymbol); }
function pctLabel(p, decimals = 2) {
  const n = Number(p) || 0;
  const abs = Math.abs(n).toLocaleString(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${abs} %`;
}
function changeChip(p, suffix = '') {
  if (p === null || p === undefined || p === '' || !Number.isFinite(Number(p))) return '';
  const up = Number(p) >= 0;
  return `<span class="chg ${up ? 'up' : 'down'}">${icon(up ? 'arrowUpRight' : 'arrowDown', 12)}${esc(pctLabel(p))}${suffix ? ` <small>${esc(suffix)}</small>` : ''}</span>`;
}
function nativeMoney(value, currency) {
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: value < 10 ? 4 : 2 }).format(value);
  } catch { return `${value} ${currency}`; }
}
function sparkline(values, { width = 132, height = 36 } = {}) {
  const v = (values || []).map(Number).filter((n) => n > 0);
  if (v.length < 2) return '';
  const min = Math.min(...v);
  const span = Math.max(...v) - min || 1;
  const pts = v.map((n, i) => `${((i / (v.length - 1)) * width).toFixed(1)},${(height - 2 - ((n - min) / span) * (height - 4)).toFixed(1)}`).join(' ');
  const up = v[v.length - 1] >= v[0];
  return `<svg class="spark ${up ? 'up' : 'down'}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function agoLabel(iso) {
  const t = Date.parse(iso || '');
  if (!t) return '';
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const d = new Date(t);
  if (d.toDateString() === new Date().toDateString()) return `hoy a las ${d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
/** Lectura del momento de la compra o venta: cómo iba el valor ese día y el mes anterior. */
function entryContext(op, m = op.market) {
  if (!m) return null;
  const buy = op.type === 'buy';
  const d = m.dayChangePct;
  const t = m.trend30Pct;
  const hasD = d !== null && d !== undefined;
  const hasT = t !== null && t !== undefined;
  let verdict = '';
  let tone = 'neutral';
  if (hasT && Math.abs(t) >= 5) {
    const falling = t < 0;
    verdict = `${buy ? 'Compraste' : 'Vendiste'} ${falling ? 'tras una caída' : 'tras una subida'} (${pctLabel(t, 1)} en el mes anterior)`;
    tone = buy ? (falling ? 'good' : 'warn') : (falling ? 'warn' : 'good');
  } else if (hasD) {
    verdict = `${buy ? 'Compraste' : 'Vendiste'} en un día de ${d < 0 ? 'bajada' : 'subida'} (${pctLabel(d, 1)})${hasT ? `, con el mes anterior ${Math.abs(t) < 2 ? 'estable' : t < 0 ? 'algo a la baja' : 'algo al alza'} (${pctLabel(t, 1)})` : ''}`;
  }
  const price = Number(op.price) || 0;
  const outOfRange = m.low > 0 && m.high > 0 && (price < m.low * 0.985 || price > m.high * 1.015);
  const dev = m.close > 0 ? (price / m.close - 1) * 100 : 0;
  return { verdict, tone, outOfRange, dev };
}
function priceModeTag(op, inv) {
  if (!marketLinked(inv)) return '';
  if (op.priceMode === 'market') return '<span class="badge">Cierre de mercado</span>';
  if (op.priceMode === 'execution') return '<span class="badge">Precio de ejecución</span>';
  if (op.priceMode === 'pending') return '<span class="badge badge--warn">Pendiente de comprobar</span>';
  return '<span class="badge badge--warn">Precio a mano</span>';
}

function holdingCard(h) {
  const meta = INVEST_TYPES[h.type] || INVEST_TYPES.other;
  const up = h.pnl >= 0;
  const linked = marketLinked(h);
  const dayEur = linked && h.prevClose > 0 && h.units > 0 ? round(h.units * (h.currentPrice - h.prevClose)) : null;
  const foreign = linked && h.nativeCurrency && h.nativeCurrency !== currencyCode() && h.nativePrice > 0;
  return `<article class="card holding">
    <div class="holding-head">
      <span class="asset-badge" style="background:${meta.color}20;color:${meta.color}">${esc(meta.label)}</span>
      <button class="icon-btn" type="button" data-action="edit-investment" data-id="${esc(h.id)}" aria-label="Editar ${esc(h.name)}">${icon('edit', 17)}</button>
    </div>
    <h3>${esc(h.name)}</h3>
    <div class="symbol">${esc(h.quoteSymbol || h.symbol || 'SIN SÍMBOLO')}${h.exchange ? ` · ${esc(h.exchange)}` : ''}</div>
    <div class="holding-value">${esc(money(h.value))}</div>
    <span class="pnl ${up ? 'up' : 'down'}">${icon(up ? 'arrowUpRight' : 'arrowDown', 13)}${up ? '+' : ''}${esc(money(h.pnl))} · ${esc(percent(h.pnlPct))} desde que compraste</span>
    ${linked ? `<div class="holding-market">
      <div class="holding-price">
        <span>Precio de mercado</span>
        <b>${esc(money(h.currentPrice))}</b>
        ${changeChip(h.dayChangePct, 'hoy')}
      </div>
      ${sparkline(h.spark)}
    </div>
    <p class="holding-src">${foreign ? `${esc(nativeMoney(h.nativePrice, h.nativeCurrency))} al cambio · ` : ''}${liveLabel(h) ? `<span class="live-dot"></span>En directo · ${esc(h.priceSource || 'mercado')}` : `${esc(h.priceSource || 'Mercado')} · ${esc(agoLabel(h.priceAt) || 'sin consultar')}`}</p>`
    : needsMarketLink(h) ? `<div class="holding-warn">${icon('alert', 15)}<span>Precio puesto a mano: puede no ser real. <button type="button" class="link-btn" data-action="edit-investment" data-id="${esc(h.id)}">Vincúlalo al mercado</button></span></div>` : ''}
    <dl class="metrics">
      <div><dt>Unidades</dt><dd>${esc(unitsLabel(h.units))}</dd></div>
      <div><dt>Precio medio</dt><dd>${esc(money(h.avg))}</dd></div>
      ${dayEur !== null ? `<div><dt>Hoy</dt><dd class="${dayEur >= 0 ? 'num-up' : 'num-down'}">${dayEur >= 0 ? '+' : ''}${esc(money(dayEur))}</dd></div>` : `<div><dt>Precio actual</dt><dd>${esc(money(h.currentPrice))}</dd></div>`}
    </dl>
    ${h.units <= 0 ? '<div class="holding-empty">Sin posición abierta. Solo hay operaciones registradas.</div>' : ''}
    <div class="holding-actions">
      <button class="btn btn-sm btn-ghost" type="button" data-action="new-op" data-id="${esc(h.id)}">${icon('plus', 14)} Operación</button>
      <button class="btn btn-sm btn-ghost" type="button" data-action="history" data-id="${esc(h.id)}">${icon('list', 14)} Historial</button>
      <button class="icon-btn" type="button" data-action="update-price" data-id="${esc(h.id)}" aria-label="${linked ? 'Actualizar cotización' : 'Actualizar precio'}" title="${linked ? 'Actualizar cotización' : 'Actualizar precio'}">${icon('refresh', 17)}</button>
    </div>
  </article>`;
}

function opRow(op) {
  const inv = investmentById(op.investmentId);
  if (!inv) return '';
  const buy = op.type === 'buy';
  const total = round(op.units * op.price + (buy ? 1 : -1) * (op.fees || 0));
  const ctx = marketLinked(inv) ? entryContext(op) : null;
  const since = buy && marketLinked(inv) && op.price > 0 && inv.currentPrice > 0 ? (inv.currentPrice / op.price - 1) * 100 : null;
  return `<button type="button" class="history-row" data-action="edit-op" data-id="${esc(op.id)}">
    <span class="tx-icon" style="width:32px;height:32px;border-radius:10px;background:${buy ? 'var(--accent-soft)' : 'var(--danger-soft)'};color:${buy ? 'var(--accent-2)' : 'var(--danger)'}">${icon(buy ? 'arrowDown' : 'arrowUp', 15)}</span>
    <span class="tx-main">
      <span class="tx-title">${esc(inv.name)} <span class="tiny">${buy ? 'Compra' : 'Venta'} · ${esc(unitsLabel(op.units))} u.</span></span>
      <span class="tx-meta">${esc(dateLabel(op.date))}${ctx?.verdict ? ' · ' + esc(ctx.verdict) : op.note ? ' · ' + esc(op.note) : ''}</span>
    </span>
    <span class="side"><b>${esc(money(total))}</b><small>${esc(money(op.price))} / u.${since !== null ? ` · ${esc(pctLabel(since, 1))} desde entonces` : op.accountId ? ' · ' + esc(accountById(op.accountId)?.name || '') : ''}</small></span>
    <span style="color:var(--muted-2)">${icon('chevronRight', 16)}</span>
  </button>`;
}

function portfolioDay(holdings) {
  let change = 0;
  let base = 0;
  for (const h of holdings) {
    if (!marketLinked(h) || !(h.prevClose > 0) || !(h.units > 0)) continue;
    change += h.units * (h.currentPrice - h.prevClose);
    base += h.units * h.prevClose;
  }
  return base > 0 ? { change: round(change), pct: (change / base) * 100 } : null;
}

function viewInversiones() {
  const holdings = computeHoldings().sort((a, b) => b.value - a.value);
  const totals = portfolioTotals(holdings);
  const alloc = allocationData(holdings);
  const up = totals.pnl >= 0;
  const day = portfolioDay(holdings);
  const anyLinked = (store.data.investments || []).some(marketLinked);
  const unlinked = (store.data.investments || []).filter(needsMarketLink);
  const recentOps = [...(store.data.ops || [])]
    .sort((a, b) => (b.date === a.date ? (b.createdAt || '').localeCompare(a.createdAt || '') : b.date.localeCompare(a.date)))
    .slice(0, 6);
  const refreshed = store.data.settings?.pricesRefreshedAt;

  return `
  ${store.offline ? `<div class="banner">${icon('alert', 17)}<span><b>Sin conexión.</b> Mostrando la última copia guardada.</span></div>` : ''}
  <div class="viewhead">
    <div><h1>Inversiones</h1><p>${anyLinked ? `Valoradas con el precio real del mercado${liveConnected() ? ' · <span class="live-dot"></span>en directo' : refreshed ? ` · actualizado ${esc(agoLabel(refreshed))}` : ''}.` : 'Tu cartera, sus aportaciones y lo que está ganando.'}</p></div>
    <div class="head-actions">
      ${anyLinked ? `<button class="btn btn-ghost" type="button" data-action="refresh-prices" title="Consulta los precios actuales del mercado">${icon('refresh', 16)} Actualizar precios</button>` : ''}
      <button class="btn btn-ghost" type="button" data-action="new-op">${icon('plus', 16)} Operación</button>
      <button class="btn btn-primary" type="button" data-action="new-investment">${icon('plus', 16)} Nueva inversión</button>
    </div>
  </div>

  ${unlinked.length ? `<div class="banner banner--warn">${icon('alert', 17)}<span><b>${unlinked.length === 1 ? `${esc(unlinked[0].name)} tiene` : `${unlinked.length} inversiones tienen`} el precio puesto a mano.</b> Edítala${unlinked.length === 1 ? '' : 's'} y búscala en el mercado para que su valor sea real.</span><button class="btn btn-sm btn-ghost" type="button" data-action="edit-investment" data-id="${esc(unlinked[0].id)}">Vincular</button></div>` : ''}

  ${holdings.length ? `
  <section class="hero hero--invest">
    <div class="hero-content">
      <div class="hero-label">Valor actual de la cartera</div>
      <div class="hero-value">${bigMoney(totals.value)}</div>
      <span class="pnl ${up ? 'up' : 'down'}">${icon(up ? 'arrowUpRight' : 'arrowDown', 14)}${up ? '+' : ''}${esc(money(totals.pnl))} no realizado · ${esc(percent(totals.pnlPct))}</span>
      ${day ? `<span class="pnl ${day.change >= 0 ? 'up' : 'down'} pnl-day">Hoy ${day.change >= 0 ? '+' : ''}${esc(money(day.change))} · ${esc(pctLabel(day.pct))}</span>` : ''}
      <div class="portfolio-stats">
        <div class="portfolio-stat"><span>Aportado</span><b>${esc(money(totals.cost))}</b></div>
        <div class="portfolio-stat"><span>Ganancia latente</span><b>${up ? '+' : ''}${esc(money(totals.pnl))}</b></div>
        <div class="portfolio-stat"><span>Ganancia realizada</span><b>${esc(money(totals.realized))}</b></div>
      </div>
    </div>
    <div class="hero-visual">
      ${alloc.length ? allocationBar(alloc) : ''}
      <div class="hero-caption"><span>Distribución por tipo de activo</span><b>${alloc.length}</b></div>
    </div>
  </section>

  <div class="holding-grid">${holdings.map(holdingCard).join('')}</div>

  ${recentOps.length ? `<section class="card">
    <div class="card-head"><div><h2>Últimas operaciones</h2><p>Con el precio del mercado de cada día y cómo iba el valor cuando compraste</p></div></div>
    <div class="history-list">${recentOps.map(opRow).join('')}</div>
  </section>` : ''}
  <p class="tiny legal-note">Cripto en tiempo real de Coinbase Exchange${store.data?.settings?.finnhubKey ? ', acciones y ETF de EE. UU. en tiempo real de Finnhub' : ''}; el resto de bolsas y los fondos, de Yahoo Finance como respaldo (con el retraso habitual). Las divisas se convierten con el cambio oficial del Banco Central Europeo. Información orientativa, no es asesoramiento financiero.</p>
  ` : `<section class="card">
    <div class="empty">
      <span class="empty-icon">${icon('trend', 26)}</span>
      <h3>Empieza tu cartera</h3>
      <p>Busca tus acciones, ETF, fondos indexados o criptomonedas por nombre, ticker o ISIN. El precio sale siempre del mercado, también el del día en que compraste.</p>
      <button class="btn btn-primary" type="button" data-action="new-investment">${icon('plus', 16)} Añadir inversión</button>
    </div>
    <div class="settings-grid" style="margin-top:16px">
      <div class="banner">${icon('search', 17)}<span><b>1.</b> Busca el valor (por ejemplo Apple, IWDA o IE00B03HD191).</span></div>
      <div class="banner">${icon('calendar', 17)}<span><b>2.</b> Registra tus compras con su fecha: usamos el precio real de ese día.</span></div>
    </div>
  </section>`}`;
}

/* ---------------------------------------------------------------- vista: cuentas */
function viewCuentas() {
  const accounts = store.data.accounts;
  const cash = totalCash();
  const portfolio = portfolioTotals();
  return `
  <div class="viewhead">
    <div><h1>Cuentas</h1><p>El dinero disponible, separado por dónde está.</p></div>
    <div class="head-actions">
      <button class="btn btn-ghost" type="button" data-action="new-tx" data-type="transfer">${icon('transfer', 16)} Transferir</button>
      <button class="btn btn-primary" type="button" data-action="new-account">${icon('plus', 16)} Nueva cuenta</button>
    </div>
  </div>

  <div class="statgrid">
    ${statCard('Efectivo disponible', bigMoney(cash), '<span>Suma de todas tus cuentas</span>', 'income', 'wallet')}
    ${statCard('Invertido', bigMoney(portfolio.value), `<span>${esc(percent(portfolio.pnlPct))} de rentabilidad latente</span>`, 'net', 'trend')}
    ${statCard('Patrimonio neto', bigMoney(netWorth()), `<span>${(store.data.loans || []).length ? 'Efectivo + cartera − préstamos' : 'Efectivo + valor de la cartera'}</span>`, 'net', 'coins')}
  </div>

  ${accounts.length ? `<div class="account-grid">
    ${accounts.map((a) => `<button type="button" class="card account-card" style="--c:${tone(a.color)}" data-action="edit-account" data-id="${esc(a.id)}">
      <div class="acct-top">
        <span class="acct-type">${esc(ACCOUNT_TYPES[a.type] || 'Cuenta')}</span>
        <span class="badge">${icon('wallet', 12)} editar</span>
      </div>
      <div class="acct-name">${esc(a.name)}</div>
      <div class="acct-balance">${esc(money(accountBalance(a)))}</div>
      <div class="acct-note">${esc(a.note || 'Sin notas')}</div>
      <div class="acct-foot"><span>Saldo inicial ${esc(money(a.initialBalance))}</span><span>${esc(String(ACCOUNT_TYPES[a.type] || 'Cuenta').toLowerCase())}</span></div>
    </button>`).join('')}
  </div>` : `<section class="card"><div class="empty"><span class="empty-icon">${icon('bank', 24)}</span><h3>Sin cuentas todavía</h3><p>Crea una cuenta para poder registrar ingresos, gastos y transferencias.</p><button class="btn btn-primary" type="button" data-action="new-account">Crear cuenta</button></div></section>`}
  <p class="tiny">El saldo se calcula automáticamente: saldo inicial + ingresos − gastos ± transferencias.</p>`;
}

/* ---------------------------------------------------------------- vista: presupuestos */
function viewPresupuestos() {
  const now = monthKey(todayISO());
  if (!/^\d{4}-\d{2}$/.test(ui.budgetMonth)) ui.budgetMonth = now;
  const month = ui.budgetMonth;
  const rows = budgetProgress(month);
  const totalBudget = round(sum(rows, (r) => r.budget));
  const totalSpent = round(sum(rows, (r) => r.spent));
  const available = round(totalBudget - totalSpent);
  const pct = totalBudget > 0 ? totalSpent / totalBudget : 0;

  return `
  <div class="viewhead">
    <div><h1>Presupuestos</h1><p>Un límite claro para cada categoría, mes a mes.</p></div>
    <div class="head-actions">
      <button class="btn btn-ghost" type="button" data-action="budget-month" data-delta="-1">${icon('chevronLeft', 16)}</button>
      <button class="btn btn-primary" type="button" data-action="edit-budgets">${icon('edit', 16)} Editar presupuestos</button>
      <button class="btn btn-ghost" type="button" data-action="budget-month" data-delta="1">${icon('chevronRight', 16)}</button>
    </div>
  </div>

  <div class="card monthbar">
    <button class="icon-btn" type="button" data-action="budget-month" data-delta="-1" aria-label="Mes anterior">${icon('chevronLeft', 18)}</button>
    <div class="month-title"><strong>${esc(monthLabel(month))}</strong><span>${month === now ? 'Mes actual' : 'Ver presupuesto'}</span></div>
    <button class="icon-btn" type="button" data-action="budget-month" data-delta="1" aria-label="Mes siguiente">${icon('chevronRight', 18)}</button>
    ${month !== now ? `<button class="btn btn-ghost btn-sm" type="button" data-action="budget-today">Hoy</button>` : ''}
  </div>

  <section class="card">
    <div class="budget-total">
      <div>
        <div class="tiny">Presupuesto total</div>
        <div class="big">${esc(money(totalBudget))}</div>
        <div class="muted">${esc(money(totalSpent))} gastados</div>
      </div>
      <div class="right">
        <div class="tiny">${available >= 0 ? 'Disponible' : 'Excedido'}</div>
        <div class="big" style="color:${available < 0 ? 'var(--danger)' : 'var(--accent-2)'}">${esc(money(Math.abs(available)))}</div>
        <div class="muted">${esc(percent(pct))} utilizado</div>
      </div>
    </div>
    <div class="progress budget-total-bar ${progressClass(pct)}"><i style="width:${(clamp(pct, 0, 1) * 100).toFixed(1)}%"></i></div>
    ${totalBudget === 0 ? `<div class="banner" style="margin-top:14px">${icon('alert', 17)}<span>Todavía no has definido ningún límite. Pulsa <b>Editar presupuestos</b> para empezar.</span></div>` : ''}
  </section>

  <section class="card">
    <div class="card-head"><div><h2>Categorías</h2><p>Gasto real frente al límite mensual</p></div></div>
    ${rows.length ? rows.map((row) => {
      const hasBudget = row.budget > 0;
      return `<div class="budget-row">
        <span class="budget-icon" style="background:${tone(row.color)}1f;color:${tone(row.color)}">${glyphSVG(row.icon, 18)}</span>
        <div class="budget-info">
          <div class="budget-line"><b>${esc(row.name)}</b><span>${hasBudget ? `${esc(money(row.spent, { decimals: 0 }))} de ${esc(money(row.budget, { decimals: 0 }))}` : `${esc(money(row.spent, { decimals: 0 }))} gastados · sin límite`}</span></div>
          ${hasBudget ? `<div class="progress ${progressClass(row.pct)}"><i style="width:${(clamp(row.pct, 0, 1) * 100).toFixed(1)}%"></i></div>` : ''}
        </div>
        <span class="budget-amount ${row.remaining < 0 ? 'neg' : ''}">
          ${hasBudget ? `<b>${esc(money(row.remaining, { decimals: 0 }))}</b>${row.remaining < 0 ? 'excedido' : 'restante'}` : `<b>${esc(money(row.spent, { decimals: 0 }))}</b>gastado`}
        </span>
      </div>`;
    }).join('') : `<div class="empty"><span class="empty-icon">${icon('target', 24)}</span><h3>No hay categorías de gasto</h3><p>Crea categorías en Ajustes para poder presupuestar.</p><a class="btn btn-soft btn-sm" href="#/ajustes">Ir a Ajustes</a></div>`}
  </section>`;
}

/* ---------------------------------------------------------------- recurrentes: cálculos */
function advanceDate(dateStr, frequency, anchorDay) {
  const d = parseISO(dateStr);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
    return isoDate(d);
  }
  const step = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
  const target = new Date(d.getFullYear(), d.getMonth() + step, 1);
  const max = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(anchorDay || d.getDate(), max));
  return isoDate(target);
}
function upcomingOccurrences(days = 30) {
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  const until = isoDate(limit);
  const out = [];
  for (const rule of store.data?.recurring || []) {
    if (rule.active === false) continue;
    let date = rule.nextDate;
    let guard = 0;
    while (date && date <= until && (!rule.endDate || date <= rule.endDate) && guard < 60) {
      out.push({ rule, date });
      date = advanceDate(date, rule.frequency, rule.anchorDay);
      guard += 1;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (b.rule.amount - a.rule.amount));
}
function monthlyEquivalent(rule) {
  return (Number(rule.amount) || 0) * (FREQ_PER_MONTH[rule.frequency] || 1);
}
function recurringTotals() {
  const active = (store.data?.recurring || []).filter((r) => r.active !== false);
  const income = round(sum(active.filter((r) => r.type === 'income'), monthlyEquivalent));
  const expense = round(sum(active.filter((r) => r.type === 'expense'), monthlyEquivalent));
  const transfer = round(sum(active.filter((r) => r.type === 'transfer'), monthlyEquivalent));
  return { income, expense, transfer, free: round(income - expense) };
}
function ruleTitle(rule) {
  if (rule.type === 'transfer') return rule.note || 'Transferencia';
  return rule.note || categoryById(rule.categoryId)?.name || TX_LABELS[rule.type];
}
function ruleMeta(rule) {
  const from = accountById(rule.accountId)?.name || 'Cuenta';
  const cat = rule.type === 'transfer'
    ? `${from} → ${accountById(rule.toAccountId)?.name || 'Cuenta'}`
    : `${categoryById(rule.categoryId)?.name || ''} · ${from}`;
  return `${FREQ_LABELS[rule.frequency] || ''} · ${cat}`;
}
function ruleVisual(rule) {
  if (rule.type === 'transfer') return { emoji: false, icon: 'transfer', bg: '#6b7280' };
  const cat = categoryById(rule.categoryId);
  return { emoji: true, icon: cat?.icon || 'box', bg: cat?.color || '#94a3b8' };
}
function ruleRow(rule, date, compact = false) {
  const v = ruleVisual(rule);
  const sign = rule.type === 'income' ? '+' : rule.type === 'expense' ? '−' : '';
  const cls = rule.type === 'income' ? 'income' : rule.type === 'transfer' ? 'transfer' : '';
  const paused = rule.active === false;
  return `<button type="button" class="txrow${paused ? ' is-paused' : ''}" data-action="edit-recurring" data-id="${esc(rule.id)}">
    <span class="tx-icon" style="background:${v.bg}1f;color:${v.bg}">${v.emoji ? glyphSVG(v.icon, 18) : icon(v.icon, 18)}</span>
    <span class="tx-main">
      <span class="tx-title">${esc(ruleTitle(rule))}${paused ? ' <span class="badge">en pausa</span>' : ''}</span>
      <span class="tx-meta">${compact ? esc(dateLabel(date)) + ' · ' : ''}${esc(ruleMeta(rule))}</span>
    </span>
    <span class="tx-side">
      <span class="tx-amt ${cls}">${sign}${esc(money(rule.amount))}</span>
      ${compact ? '' : `<span class="tx-sub">${paused ? 'pausado' : rule.nextDate ? 'próximo ' + esc(dateLabel(rule.nextDate)).toLowerCase() : 'finalizado'}</span>`}
    </span>
  </button>`;
}

/* ---------------------------------------------------------------- vista: recurrentes */
function viewRecurrentes() {
  const rules = [...(store.data.recurring || [])];
  const totals = recurringTotals();
  const upcoming = upcomingOccurrences(45);
  const groups = [
    { kind: 'income', title: 'Ingresos fijos' },
    { kind: 'expense', title: 'Gastos fijos' },
    { kind: 'transfer', title: 'Traspasos automáticos' }
  ];
  const order = (a, b) => (a.active === false) - (b.active === false) || monthlyEquivalent(b) - monthlyEquivalent(a);
  return `
  <div class="viewhead">
    <div><h1>Recurrentes</h1><p>Nómina, alquiler, suscripciones… se apuntan solos cuando llega la fecha.</p></div>
    <div class="head-actions">
      <button class="btn btn-primary" type="button" data-action="new-recurring">${icon('plus', 16)} Nuevo recurrente</button>
    </div>
  </div>

  <div class="statgrid">
    ${statCard('Ingresos fijos / mes', bigMoney(totals.income), '<span>Equivalente mensual</span>', 'income', 'arrowUp')}
    ${statCard('Gastos fijos / mes', bigMoney(totals.expense), `<span>${totals.income > 0 ? esc(percent(totals.expense / totals.income)) + ' de tus ingresos fijos' : 'Equivalente mensual'}</span>`, 'expense', 'repeat')}
    ${statCard('Margen libre / mes', bigMoney(totals.free), `<span>${totals.transfer > 0 ? esc(money(totals.transfer, { decimals: 0 })) + ' en traspasos automáticos' : 'Lo que queda tras lo fijo'}</span>`, 'net', 'sparkles')}
  </div>

  ${rules.length ? `<div class="grid-2 grid-2--wide-left">
    <section class="card">
      ${groups.map((g) => {
        const list = rules.filter((r) => r.type === g.kind).sort(order);
        if (!list.length) return '';
        return `<div class="rule-group"><div class="dayhead"><h3>${g.title}</h3><span class="day-total">${esc(money(sum(list.filter((r) => r.active !== false), monthlyEquivalent)))} / mes</span></div>
          <div class="txlist">${list.map((r) => ruleRow(r)).join('')}</div></div>`;
      }).join('')}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Próximos 45 días</h2><p>Lo que se apuntará automáticamente</p></div></div>
      ${upcoming.length ? `<div class="txlist compact">${upcoming.slice(0, 14).map((u) => ruleRow(u.rule, u.date, true)).join('')}</div>`
        : `<div class="empty"><span class="empty-icon">${icon('calendar', 24)}</span><h3>Nada a la vista</h3><p>No hay cobros ni pagos programados en las próximas semanas.</p></div>`}
    </section>
  </div>` : `<section class="card"><div class="empty">
    <span class="empty-icon">${icon('repeat', 24)}</span>
    <h3>Automatiza lo que se repite</h3>
    <p>Crea un recurrente para tu nómina, el alquiler o una suscripción. Cada vez que llegue la fecha se añadirá el movimiento solo.</p>
    <button class="btn btn-primary btn-sm" type="button" data-action="new-recurring">${icon('plus', 14)} Crear recurrente</button>
  </div></section>`}
  <p class="tiny">Los movimientos se generan al abrir la app o cada hora mientras el servidor está en marcha. Puedes editarlos o borrarlos como cualquier otro.</p>`;
}

/* ---------------------------------------------------------------- objetivos: cálculos */
function goalProgress(goal) {
  const account = goal.accountId ? accountById(goal.accountId) : null;
  const saved = round(account ? Math.max(0, accountBalance(account)) : Number(goal.saved) || 0);
  const target = Number(goal.target) || 0;
  const remaining = round(Math.max(0, target - saved));
  const pct = target > 0 ? saved / target : 0;
  let monthsLeft = null;
  let perMonth = null;
  if (goal.deadline) {
    const now = new Date();
    const end = parseISO(goal.deadline);
    monthsLeft = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    if (end.getDate() < now.getDate()) monthsLeft -= 1;
    monthsLeft = Math.max(0, monthsLeft);
    perMonth = remaining > 0 ? round(remaining / Math.max(1, monthsLeft)) : 0;
  }
  return { ...goal, account, saved, target, remaining, pct, monthsLeft, perMonth, reached: saved >= target };
}
function goalCard(g) {
  const pct = clamp(g.pct, 0, 1);
  const deadlineText = g.deadline
    ? (g.reached ? 'Conseguido' : g.monthsLeft === 0 ? `Vence ${dateLabel(g.deadline).toLowerCase()}` : `${g.monthsLeft} ${g.monthsLeft === 1 ? 'mes' : 'meses'} · ${money(g.perMonth, { decimals: 0 })}/mes`)
    : (g.reached ? 'Conseguido' : 'Sin fecha límite');
  return `<article class="card goal" style="--c:${tone(g.color)}">
    <div class="goal-head">
      <span class="goal-icon" style="color:${tone(g.color)}">${glyphSVG(g.icon, 22, 'target')}</span>
      <div class="goal-title"><h3>${esc(g.name)}</h3><span>${g.account ? 'Saldo de ' + esc(g.account.name) : 'Aportaciones manuales'}</span></div>
      <button class="icon-btn" type="button" data-action="edit-goal" data-id="${esc(g.id)}" aria-label="Editar ${esc(g.name)}">${icon('edit', 17)}</button>
    </div>
    <div class="goal-amounts"><b>${esc(money(g.saved, { decimals: 0 }))}</b><span>de ${esc(money(g.target, { decimals: 0 }))}</span><em>${esc(percent(g.pct, 0))}</em></div>
    <div class="progress goal-bar${g.reached ? ' done' : ''}"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
    <div class="goal-foot">
      <span>${g.reached ? icon('check', 13) + ' ' : ''}${esc(deadlineText)}</span>
      ${!g.reached ? `<span>Faltan ${esc(money(g.remaining, { decimals: 0 }))}</span>` : ''}
    </div>
    ${g.note ? `<p class="goal-note">${esc(g.note)}</p>` : ''}
    ${!g.account ? `<div class="holding-actions"><button class="btn btn-sm btn-ghost" type="button" data-action="goal-add" data-id="${esc(g.id)}">${icon('plus', 14)} Aportar</button><button class="btn btn-sm btn-ghost" type="button" data-action="goal-withdraw" data-id="${esc(g.id)}">Retirar</button></div>` : ''}
  </article>`;
}

/* ---------------------------------------------------------------- vista: objetivos */
function viewObjetivos() {
  const goals = (store.data.goals || []).map(goalProgress)
    .sort((a, b) => a.reached - b.reached || (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  const totalTarget = round(sum(goals, (g) => g.target));
  const totalSaved = round(sum(goals, (g) => Math.min(g.saved, g.target)));
  const perMonth = round(sum(goals.filter((g) => !g.reached), (g) => g.perMonth || 0));
  return `
  <div class="viewhead">
    <div><h1>Objetivos</h1><p>Ponle nombre y fecha a lo que quieres conseguir.</p></div>
    <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-goal">${icon('plus', 16)} Nuevo objetivo</button></div>
  </div>
  ${goals.length ? `
  <div class="statgrid">
    ${statCard('Ahorrado para objetivos', bigMoney(totalSaved), `<span>${esc(percent(totalTarget > 0 ? totalSaved / totalTarget : 0, 0))} del total</span>`, 'income', 'flag')}
    ${statCard('Meta total', bigMoney(totalTarget), `<span>${goals.length} ${goals.length === 1 ? 'objetivo' : 'objetivos'} · ${goals.filter((g) => g.reached).length} conseguidos</span>`, 'net', 'target')}
    ${statCard('Necesitas apartar', bigMoney(perMonth), '<span>Al mes para llegar a tiempo</span>', 'expense', 'calendar')}
  </div>
  <div class="goal-grid">${goals.map(goalCard).join('')}</div>` : `<section class="card"><div class="empty">
    <span class="empty-icon">${icon('target', 24)}</span>
    <h3>¿Para qué estás ahorrando?</h3>
    <p>Un fondo de emergencia, un viaje, la entrada de un piso… Vincúlalo a una cuenta de ahorro y el progreso se actualiza solo.</p>
    <button class="btn btn-primary btn-sm" type="button" data-action="new-goal">${icon('plus', 14)} Crear objetivo</button>
  </div></section>`}`;
}

/* ---------------------------------------------------------------- informes: cálculos */
function holdingsAt(dateISO) {
  const ops = (store.data?.ops || []).filter((op) => op.date <= dateISO);
  let cost = 0;
  for (const inv of store.data?.investments || []) {
    const list = ops.filter((op) => op.investmentId === inv.id)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    let units = 0;
    let c = 0;
    for (const op of list) {
      if (op.type === 'buy') { units += Number(op.units) || 0; c += (Number(op.units) || 0) * (Number(op.price) || 0) + (Number(op.fees) || 0); }
      else { const avg = units > 0 ? c / units : 0; const sold = Math.min(units, Number(op.units) || 0); c -= sold * avg; units -= sold; }
    }
    cost += Math.max(0, c);
  }
  return round(cost);
}
function cashAt(dateISO) {
  let total = sum(store.data?.accounts || [], (a) => Number(a.initialBalance) || 0);
  for (const tx of store.data?.transactions || []) {
    if (tx.date > dateISO) continue;
    if (tx.type === 'income') total += tx.amount;
    else if (tx.type === 'expense') total -= tx.amount;
  }
  for (const op of store.data?.ops || []) {
    if (op.accountId && op.date <= dateISO) total += opCashFlow(op);
  }
  return round(total);
}
function monthEnd(key) {
  const [y, m] = key.split('-').map(Number);
  return isoDate(new Date(y, m, 0));
}
function yearsWithData() {
  const years = new Set([new Date().getFullYear()]);
  for (const tx of store.data?.transactions || []) years.add(Number(tx.date.slice(0, 4)));
  for (const op of store.data?.ops || []) years.add(Number(op.date.slice(0, 4)));
  return Array.from(years).filter(Boolean).sort();
}
function lineChart(points, opts = {}) {
  const W = 600, H = 200, pl = 52, pr = 12, pt = 14, pb = 28;
  if (!points.length) return '';
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const padV = (max - min) * 0.12;
  min -= padV; max += padV;
  const x = (i) => pl + (i * (W - pl - pr)) / Math.max(1, points.length - 1);
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H - pb} L${x(0).toFixed(1)} ${H - pb} Z`;
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Evolución')}">`;
  out += `<defs><linearGradient id="lcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>`;
  for (let i = 0; i <= 2; i += 1) {
    const v = max - ((max - min) * i) / 2;
    const yy = y(v);
    out += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/>`;
    out += `<text x="${pl - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${esc(compact(v))}</text>`;
  }
  out += `<path d="${area}" fill="url(#lcg)"/>`;
  out += `<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  points.forEach((p, i) => {
    out += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.2" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"><title>${esc(p.title || p.label)}: ${esc(money(p.value))}</title></circle>`;
    out += `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>`;
  });
  out += '</svg>';
  return `<div class="chart">${out}</div>`;
}

/* ---------------------------------------------------------------- vista: informes */
function viewInformes() {
  const year = Number(ui.reportYear) || new Date().getFullYear();
  const nowKey = monthKey(todayISO());
  const keys = Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);
  const months = keys.map((key) => ({ key, ...monthStats(key) }));
  const elapsed = keys.filter((k) => k <= nowKey);
  const income = round(sum(months, (m) => m.income));
  const expense = round(sum(months, (m) => m.expense));
  const net = round(income - expense);
  const divisor = Math.max(1, elapsed.length);
  const prevYear = keys.map((k) => monthStats(`${year - 1}${k.slice(4)}`));
  const prevIncome = sum(prevYear, (m) => m.income);
  const prevExpense = sum(prevYear, (m) => m.expense);

  const byCat = new Map();
  const byIncome = new Map();
  for (const tx of store.data.transactions) {
    if (!tx.date.startsWith(String(year))) continue;
    if (tx.type === 'expense') byCat.set(tx.categoryId, (byCat.get(tx.categoryId) || 0) + tx.amount);
    if (tx.type === 'income') byIncome.set(tx.categoryId, (byIncome.get(tx.categoryId) || 0) + tx.amount);
  }
  const catRows = (map, total) => Array.from(map.entries())
    .map(([id, value]) => ({ cat: categoryById(id), value: round(value), share: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
  const expenseRows = catRows(byCat, expense);
  const incomeRows = catRows(byIncome, income);

  const worthPoints = elapsed.map((key) => {
    const end = key === nowKey ? todayISO() : monthEnd(key);
    const invested = key === nowKey ? portfolioTotals().value : holdingsAt(end);
    return { label: shortMonth(key), title: monthLabel(key), value: round(cashAt(end) + invested - totalDebt(end)) };
  });
  const worthStart = worthPoints[0]?.value || 0;
  const worthEnd = worthPoints[worthPoints.length - 1]?.value || 0;

  const yearOps = store.data.ops.filter((op) => op.date.startsWith(String(year)));
  const invested = round(sum(yearOps.filter((o) => o.type === 'buy'), (o) => o.units * o.price + (o.fees || 0)));
  const withdrawn = round(sum(yearOps.filter((o) => o.type === 'sell'), (o) => o.units * o.price - (o.fees || 0)));
  const years = yearsWithData();

  const bestMonth = months.filter((m) => m.key <= nowKey && (m.income || m.expense)).sort((a, b) => b.net - a.net)[0];
  const topCat = expenseRows[0];

  return `
  <div class="viewhead">
    <div><h1>Informes</h1><p>Tu año en números: de dónde viene y a dónde va el dinero.</p></div>
    <div class="head-actions">
      <button class="btn btn-ghost btn-sm" type="button" data-action="export-report">${icon('download', 14)} Exportar CSV</button>
    </div>
  </div>

  <div class="card monthbar">
    <button class="icon-btn" type="button" data-action="report-year" data-delta="-1" aria-label="Año anterior"${year <= years[0] ? ' disabled' : ''}>${icon('chevronLeft', 18)}</button>
    <div class="month-title"><strong>${year}</strong><span>${year === new Date().getFullYear() ? `Año en curso · ${elapsed.length} ${elapsed.length === 1 ? 'mes' : 'meses'}` : 'Año completo'}</span></div>
    <button class="icon-btn" type="button" data-action="report-year" data-delta="1" aria-label="Año siguiente"${year >= new Date().getFullYear() ? ' disabled' : ''}>${icon('chevronRight', 18)}</button>
  </div>

  <div class="statgrid">
    ${statCard('Ingresos del año', bigMoney(income), `${deltaBadge(income, prevIncome)} <span>vs. ${year - 1}</span>`, 'income', 'arrowUp')}
    ${statCard('Gastos del año', bigMoney(expense), `${deltaBadge(expense, prevExpense, true)} <span>vs. ${year - 1}</span>`, 'expense', 'wallet')}
    ${statCard('Ahorro del año', bigMoney(net), `<span>${esc(percent(income > 0 ? net / income : 0))} de tus ingresos · ${esc(money(net / divisor, { decimals: 0 }))}/mes</span>`, 'net', 'sparkles')}
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="card-head">
        <div><h2>Ingresos y gastos</h2><p>Mes a mes en ${year}</p></div>
        <div class="legend"><span><i style="background:var(--accent)"></i>Ingresos</span><span><i style="background:var(--chart-2)"></i>Gastos</span></div>
      </div>
      ${barChart(months)}
    </section>
    <section class="card">
      <div class="card-head">
        <div><h2>Evolución del patrimonio</h2><p>Efectivo + inversiones al cierre de cada mes</p></div>
        ${worthPoints.length > 1 ? `<span class="delta ${worthEnd >= worthStart ? 'up' : 'down'}">${icon(worthEnd >= worthStart ? 'arrowUp' : 'arrowDown', 12)}${esc(money(worthEnd - worthStart, { decimals: 0 }))}</span>` : ''}
      </div>
      ${worthPoints.length ? lineChart(worthPoints, { label: 'Patrimonio neto por mes' }) : `<div class="empty"><span class="empty-icon">${icon('chart', 24)}</span><h3>Sin datos</h3><p>Este año aún no ha empezado.</p></div>`}
      <p class="tiny" style="margin-top:6px">Meses cerrados: inversiones a precio de coste. Mes actual: a valor de mercado.</p>
    </section>
  </div>

  ${(bestMonth || topCat || invested || withdrawn) ? `<div class="insights">
    ${bestMonth ? `<div class="insight"><span>${glyphSVG('star', 18)}</span><div><b>Mejor mes</b><p>${esc(monthLabel(bestMonth.key))}: ahorraste ${esc(money(bestMonth.net, { decimals: 0 }))}.</p></div></div>` : ''}
    ${topCat ? `<div class="insight"><span>${glyphSVG(topCat.cat?.icon, 18)}</span><div><b>Mayor gasto</b><p>${esc(topCat.cat?.name || 'Otros')}: ${esc(money(topCat.value, { decimals: 0 }))} (${esc(percent(topCat.share, 0))} del total).</p></div></div>` : ''}
    ${(invested || withdrawn) ? `<div class="insight"><span>${icon('trend', 18)}</span><div><b>Inversión</b><p>Aportaste ${esc(money(invested, { decimals: 0 }))}${withdrawn ? ` y retiraste ${esc(money(withdrawn, { decimals: 0 }))}` : ''} este año.</p></div></div>` : ''}
  </div>` : ''}

  <section class="card">
    <div class="card-head"><div><h2>Resumen mensual</h2><p>Ingresos, gastos y ahorro de cada mes</p></div></div>
    <div class="table-wrap"><table class="report-table">
      <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Ahorro</th><th>Tasa</th></tr></thead>
      <tbody>${months.map((m) => {
        const future = m.key > nowKey;
        return `<tr class="${future ? 'is-future' : ''}${m.key === nowKey ? ' is-current' : ''}">
          <td>${esc(monthName(m.key))}</td>
          <td class="income">${future ? '—' : esc(money(m.income))}</td>
          <td>${future ? '—' : esc(money(m.expense))}</td>
          <td class="${m.net < 0 ? 'neg' : ''}">${future ? '—' : esc(money(m.net))}</td>
          <td>${future || !m.income ? '—' : esc(percent(m.rate, 0))}</td>
        </tr>`;
      }).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="income">${esc(money(income))}</td><td>${esc(money(expense))}</td><td class="${net < 0 ? 'neg' : ''}">${esc(money(net))}</td><td>${income > 0 ? esc(percent(net / income, 0)) : '—'}</td></tr></tfoot>
    </table></div>
  </section>

  <div class="grid-2">
    <section class="card">
      <div class="card-head"><div><h2>Gastos por categoría</h2><p>Total del año y media mensual</p></div></div>
      ${expenseRows.length ? expenseRows.map((r) => catBarRow(r, divisor)).join('') : `<div class="empty"><span class="empty-icon">${icon('receipt', 24)}</span><h3>Sin gastos en ${year}</h3></div>`}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Fuentes de ingreso</h2><p>De dónde viene tu dinero</p></div></div>
      ${incomeRows.length ? incomeRows.map((r) => catBarRow(r, divisor)).join('') : `<div class="empty"><span class="empty-icon">${glyphSVG('briefcase', 24)}</span><h3>Sin ingresos en ${year}</h3></div>`}
    </section>
  </div>`;
}
function catBarRow(r, divisor) {
  const cat = r.cat || { icon: 'box', name: 'Otros', color: '#94a3b8' };
  return `<div class="budget-row">
    <span class="budget-icon" style="background:${tone(cat.color)}1f;color:${tone(cat.color)}">${glyphSVG(cat.icon, 18)}</span>
    <div class="budget-info">
      <div class="budget-line"><b>${esc(cat.name)}</b><span>${esc(percent(r.share, 0))} · ${esc(money(r.value / divisor, { decimals: 0 }))}/mes</span></div>
      <div class="progress"><i style="width:${(clamp(r.share, 0, 1) * 100).toFixed(1)}%;background:${tone(cat.color)}"></i></div>
    </div>
    <span class="budget-amount"><b>${esc(money(r.value, { decimals: 0 }))}</b>en el año</span>
  </div>`;
}
function exportReportCSV() {
  const year = Number(ui.reportYear) || new Date().getFullYear();
  const rows = [['Mes', 'Ingresos', 'Gastos', 'Ahorro', 'Tasa de ahorro']];
  for (let i = 1; i <= 12; i += 1) {
    const key = `${year}-${pad(i)}`;
    const m = monthStats(key);
    rows.push([monthLabel(key), decimalComma(m.income), decimalComma(m.expense), decimalComma(m.net), m.income > 0 ? decimalComma(m.rate * 100) + ' %' : '']);
  }
  rows.push([]);
  rows.push(['Categoría', 'Tipo', 'Total']);
  const totals = new Map();
  for (const tx of store.data.transactions) {
    if (tx.type === 'transfer' || !tx.date.startsWith(String(year))) continue;
    totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + tx.amount);
  }
  for (const [id, value] of [...totals.entries()].sort((a, b) => b[1] - a[1])) {
    const cat = categoryById(id);
    rows.push([cat?.name || 'Otros', cat?.kind === 'income' ? 'Ingreso' : 'Gasto', decimalComma(value)]);
  }
  downloadFile(`mi-cartera-informe-${year}.csv`, csvText(rows), 'text/csv;charset=utf-8');
  toast('Informe exportado');
}

/* ---------------------------------------------------------------- vista: más (móvil) */
function viewMas() {
  const totals = recurringTotals();
  const goals = (store.data.goals || []).map(goalProgress);
  const budgets = budgetProgress(monthKey(todayISO())).filter((b) => b.budget > 0);
  const over = budgets.filter((b) => b.pct > 1).length;
  const items = [
    { id: 'cuentas', icon: 'wallet', title: 'Cuentas', text: `${store.data.accounts.length} cuentas · ${money(totalCash(), { decimals: 0 })}` },
    { id: 'presupuestos', icon: 'target', title: 'Presupuestos', text: budgets.length ? `${budgets.length} límites${over ? ` · ${over} excedidos` : ''}` : 'Sin límites definidos' },
    { id: 'recurrentes', icon: 'repeat', title: 'Recurrentes', text: (store.data.recurring || []).length ? `${money(totals.expense, { decimals: 0 })} fijos al mes` : 'Automatiza nómina y recibos' },
    { id: 'objetivos', icon: 'flag', title: 'Objetivos', text: goals.length ? `${goals.length} objetivos · ${goals.filter((g) => g.reached).length} conseguidos` : 'Ahorra con propósito' },
    { id: 'prestamos', icon: 'bank', title: 'Préstamos', text: (store.data.loans || []).length ? `${(store.data.loans || []).length} · ${money(totalDebt(), { decimals: 0 })} pendientes` : 'Hipotecas y préstamos' },
    { id: 'informes', icon: 'chart', title: 'Informes', text: 'Tu año en números' },
    { id: 'ajustes', icon: 'settings', title: 'Ajustes', text: 'Perfil, secciones, negocio, PIN y copias' }
  ];
  const d = store.data;
  const pendingInv = (d.invoices || []).filter((i) => i.status === 'issued').length;
  const next = hasBusiness() ? F.upcomingDeadlines(todayISO(), { count: 1 })[0] : null;
  items.unshift(
    { id: 'facturas', icon: 'invoice', title: 'Facturas', text: pendingInv ? `${pendingInv} pendientes de cobro` : `${(d.invoices || []).length} facturas` },
    { id: 'clientes', icon: 'users', title: 'Clientes', text: `${(d.clients || []).length} clientes` },
    { id: 'gastos', icon: 'receipt', title: 'Gastos del negocio', text: 'Facturas recibidas y deducibles' },
    { id: 'impuestos', icon: 'percent', title: 'Impuestos', text: next ? `${next.title.split(':')[0]} · hasta ${fmtDate(next.to)}` : 'Modelos 303 y 130' },
    { id: 'cuota', icon: 'shield', title: 'Cuota de autónomos', text: 'Tramo, tarifa plana y regularización' }
  );
  const bottom = bottomNavItems();
  const visible = items.filter((it) => viewEnabled(it.id) && !bottom.includes(it.id));
  return `
  <div class="viewhead"><div><h1>Más</h1><p>Todas las secciones de Mi Cartera.</p></div></div>
  <div class="more-grid">${visible.map((it) => `<a class="card more-item" href="#/${it.id}">
    <span class="more-icon">${icon(it.icon, 20)}</span>
    <span class="more-text"><b>${esc(it.title)}</b><span>${esc(it.text)}</span></span>
    <span class="more-arrow">${icon('chevronRight', 18)}</span>
  </a>`).join('')}</div>`;
}

/* ---------------------------------------------------------------- vista: ajustes */
function categoryGroups() {
  const cats = store.data.categories;
  return ['expense', 'income'].map((kind) => {
    const list = cats.filter((c) => c.kind === kind);
    return `<div class="cat-group">
      <h3>${kind === 'expense' ? 'Gastos' : 'Ingresos'}</h3>
      <div class="cat-list">
        ${list.map((c) => `<button type="button" class="cat-item" data-action="edit-category" data-id="${esc(c.id)}">
          <span class="cat-emoji" style="background:${tone(c.color)}1f;color:${tone(c.color)}">${glyphSVG(c.icon, 17)}</span>
          <span class="cat-name">${esc(c.name)}</span>
          ${kind === 'expense' ? `<span class="cat-budget">${c.budget > 0 ? esc(money(c.budget, { decimals: 0 })) : 'sin límite'}</span>` : ''}
        </button>`).join('')}
      </div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="new-category" data-kind="${kind}">${icon('plus', 14)} Añadir categoría de ${kind === 'expense' ? 'gasto' : 'ingreso'}</button>
    </div>`;
  }).join('');
}

function viewAjustes() {
  const s = store.data.settings;
  const theme = s.theme || 'auto';
  const pin = Boolean(s.pinEnabled);
  const dataDir = store.session?.dataDir || '';
  return `
  <div class="viewhead">
    <div><h1>Ajustes</h1><p>Tu app, tus reglas. Todo se guarda en ${WEB ? 'este navegador' : 'tu ordenador'}.</p></div>
  </div>

  <div class="settings-grid">
    ${settingsProfileHTML()}
    <section class="card setting-card">
      <h2>Apariencia y moneda</h2>
      <p>Así se ve Mi Cartera en este dispositivo.</p>
      <div class="setting-row">
        <div><h3>Tema</h3><p>Claro, oscuro o el que use tu sistema.</p></div>
        <div class="seg" role="group" aria-label="Tema">
          <button type="button" data-action="set-theme" data-theme="auto" class="${theme === 'auto' ? 'active' : ''}">Auto</button>
          <button type="button" data-action="set-theme" data-theme="light" class="${theme === 'light' ? 'active' : ''}">Claro</button>
          <button type="button" data-action="set-theme" data-theme="dark" class="${theme === 'dark' ? 'active' : ''}">Oscuro</button>
        </div>
      </div>
      <div class="setting-row">
        <div><h3>Moneda</h3><p>Solo cambia el símbolo. No convierte los importes.</p></div>
        <select class="select select--sm" id="currencySelect" aria-label="Moneda">
          ${CURRENCIES.map((c) => `<option value="${c}"${s.currency === c ? ' selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
    </section>

    <section class="card setting-card">
      <h2>Seguridad</h2>
      <p>Protege el acceso con un PIN de 4 a 8 dígitos.</p>
      <div class="setting-row">
        <div><h3>PIN de acceso</h3><p>${pin ? 'Activado. Se pedirá al abrir la app o tras 30 días.' : (WEB ? 'Desactivado. Cualquiera con acceso a este navegador podría entrar.' : 'Desactivado. Cualquiera en tu red podría entrar.')}</p></div>
        <span class="badge ${pin ? 'badge--soft' : ''}">${pin ? 'Activado' : 'Desactivado'}</span>
      </div>
      <div class="setting-row">
        <div><h3>${pin ? 'Cambiar o quitar PIN' : 'Crear un PIN'}</h3><p>Se guarda cifrado en ${WEB ? 'este navegador' : 'el servidor local'}.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="pin">${icon('lock', 14)} ${pin ? 'Gestionar' : 'Configurar'}</button>
      </div>
      ${pin ? `<div class="setting-row">
        <div><h3>Bloquear ahora</h3><p>Cierra esta sesión en el dispositivo actual.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="logout">${icon('lock', 14)} Bloquear</button>
      </div>` : ''}
    </section>

    <section class="card setting-card">
      <h2>Datos y copias</h2>
      <p>${WEB ? 'Versión web: tu información vive solo en <b>este navegador</b> (no se envía a ningún servidor). Exporta copias a menudo: si borras los datos del navegador, se pierden.' : 'Tu información vive en <b>data/db.json</b>. Sin nube.'}</p>
      <div class="setting-row">
        <div><h3>Copia de seguridad</h3><p>Descarga todo en un archivo JSON que puedes volver a importar.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="export-json">${icon('download', 14)} Exportar</button>
      </div>
      <div class="setting-row">
        <div><h3>Exportar CSV</h3><p>Movimientos o cartera para abrir en Excel o Sheets.</p></div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" type="button" data-action="export-csv">Movimientos</button>
          <button class="btn btn-ghost btn-sm" type="button" data-action="export-portfolio">Cartera</button>
        </div>
      </div>
      <div class="setting-row">
        <div><h3>Copias automáticas</h3><p>Una al día y otra antes de cada cambio grande. Restaura cualquiera con un clic.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="backups">${icon('refresh', 14)} Ver y restaurar</button>
      </div>
      <div class="setting-row">
        <div><h3>Importar copia</h3><p>Reemplaza los datos actuales. Antes se guarda una copia de seguridad.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="import-json">${icon('upload', 14)} Importar</button>
        <input type="file" id="importFile" accept="application/json,.json" hidden>
      </div>
      ${WEB ? '' : `<div class="path-box" title="Carpeta de datos">${esc(dataDir || 'data/')}</div>
      <p class="tiny" style="margin-top:8px">Copias automáticas en <b>data/backups</b> (últimos 14 días).</p>`}
    </section>

    <section class="card setting-card">
      <h2>Tus dispositivos</h2>
      <p>Usa Mi Cartera en el móvil, en otro ordenador o en ambos, sin subir tus datos a ninguna nube.</p>
      <div class="setting-row">
        <div><h3>Abrir en el móvil</h3><p>${WEB ? 'Código QR de esta página.' : 'Dirección y código QR para entrar desde el móvil con la misma Wi-Fi.'}</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="phone">${icon('phone', 14)} Ver código</button>
      </div>
      <div class="setting-row">
        <div><h3>Sincronización cifrada</h3><p>Crea un paquete protegido con contraseña y ábrelo en el otro dispositivo para combinar los datos.</p></div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" type="button" data-action="sync-export">${icon('shield', 14)} Crear</button>
          <button class="btn btn-ghost btn-sm" type="button" data-action="sync-import">${icon('sync', 14)} Abrir</button>
        </div>
        <input type="file" id="syncFile" accept=".mcsync,application/json" hidden>
      </div>
      <details class="howto">
        <summary>Cómo cambiar de ordenador</summary>
        <ol class="steps">
          <li>En el ordenador antiguo: <b>Crear</b> paquete cifrado${WEB ? '' : ' (o copia la carpeta <b>data</b> entera)'}.</li>
          <li>En el nuevo: ${WEB ? 'abre esta misma página' : 'copia la carpeta de la app y abre <b>iniciar.bat</b>'}.</li>
          <li>Ajustes → Sincronización cifrada → <b>Abrir</b> → elige <b>Reemplazar todo</b>.</li>
        </ol>
        <p class="tiny">Para usar dos dispositivos a la vez, elige <b>Combinar</b> en los dos sentidos de vez en cuando: gana el cambio más reciente y los borrados se respetan.</p>
      </details>
    </section>

    <section class="card setting-card">
      <h2>Cotizaciones</h2>
      <p>Acciones, ETF, fondos indexados y cripto se valoran con el precio real del mercado, y cada compra se comprueba con el precio de ese día. Cada tipo de activo usa la fuente más fiable disponible gratis:</p>
      <ul class="tiny source-list">
        <li><b>Cripto:</b> Coinbase Exchange, en tiempo real y sin clave.</li>
        <li><b>Acciones y ETF de EE. UU.:</b> Finnhub, en tiempo real con una clave gratuita (abajo).${s.finnhubKey ? ' Activo.' : ' Sin clave se usa Yahoo Finance.'}</li>
        <li><b>Cambio de divisas:</b> tipos oficiales del Banco Central Europeo.</li>
        <li><b>ETF europeos y fondos indexados:</b> Yahoo Finance como respaldo. No existe una fuente oficial gratuita en directo para estas bolsas, y los fondos solo publican un valor liquidativo al día.</li>
      </ul>${WEB ? '<p class="tiny">Coinbase, Finnhub y el BCE se consultan directamente desde tu navegador. Solo las consultas a Yahoo (histórico y bolsas europeas) pasan por un intermediario público.</p>' : ''}
      <div class="setting-row">
        <div><h3>Precios automáticos</h3><p>En directo mientras la app está abierta: acciones, ETF y cripto se actualizan en cuanto cambian (en horario de mercado) y los fondos con su valor diario. Desactivado, solo se consulta cuando pulsas Actualizar o registras una operación.</p></div>
        <div class="seg" role="group" aria-label="Precios automáticos">
          <button type="button" data-action="auto-prices" data-value="off" class="${s.autoPrices ? '' : 'active'}">No</button>
          <button type="button" data-action="auto-prices" data-value="on" class="${s.autoPrices ? 'active' : ''}">Sí</button>
        </div>
      </div>
      <div class="setting-row">
        <div><h3>Actualizar ahora</h3><p>${s.pricesRefreshedAt ? `Última consulta: ${esc(new Date(s.pricesRefreshedAt).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}.` : 'Aún no se ha consultado ninguna cotización.'}</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="refresh-prices">${icon('refresh', 14)} Actualizar</button>
      </div>
      <form class="setting-row" data-finnhub-form>
        <div><h3>Clave de Finnhub (gratis)</h3><p>Para ver acciones y ETF de EE. UU. (Apple, S&amp;P 500…) al segundo. Crea una cuenta gratuita en <a href="https://finnhub.io/register" target="_blank" rel="noopener">finnhub.io</a>, copia tu «API key» y pégala aquí. Se guarda solo en este dispositivo.</p>
          <input class="input" name="finnhubKey" type="text" autocomplete="off" spellcheck="false" placeholder="Pega tu clave de Finnhub" value="${esc(s.finnhubKey || '')}" style="margin-top:8px"></div>
        <button class="btn btn-ghost btn-sm" type="submit">Guardar</button>
      </form>
      ${WEB ? `<form class="setting-row" data-proxy-form>
        <div><h3>Intermediario propio (opcional)</h3><p>Si el público falla a menudo, pega aquí la dirección de tu propio intermediario (en el README hay uno listo para Cloudflare, gratis). Usa <code>{url}</code> donde va la consulta o se añadirá al final.</p>
          <input class="input" name="marketProxy" type="url" placeholder="https://mi-proxy.workers.dev/?url=" value="${esc(s.marketProxy || '')}" style="margin-top:8px"></div>
        <button class="btn btn-ghost btn-sm" type="submit">Guardar</button>
      </form>` : ''}
      <p class="tiny" style="margin-top:8px">Solo se envía el símbolo (por ejemplo IWDA.AS) y la fecha. Nunca tus importes ni ningún dato personal.</p>
    </section>

    <section class="card setting-card">
      <h2>Zona de pruebas y reinicio</h2>
      <p>Útil para explorar la app antes de meter tus datos reales.</p>
      <div class="setting-row">
        <div><h3>Cargar datos de ejemplo</h3><p>${hasBusiness() ? 'Reemplaza todo con clientes, facturas y gastos de un autónomo ficticio, además de movimientos personales.' : 'Reemplaza todo con 6 meses de movimientos, recurrentes, objetivos e inversiones ficticias.'}</p></div>
        <button class="btn btn-soft btn-sm" type="button" data-action="demo">${icon('sparkles', 14)} Cargar demo</button>
      </div>
      <div class="setting-row">
        <div><h3>Empezar de cero</h3><p>Borra movimientos, recurrentes, objetivos, inversiones y cuentas. Mantiene tu PIN.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="reset" style="color:var(--danger)">${icon('trash', 14)} Borrar todo</button>
      </div>
      <div class="setting-row">
        <div><h3>Versión</h3><p>${esc(APP_VERSION)} · datos rev ${esc(store.data.rev)} · ${WEB ? 'versión web' : '100% local'}</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="force-update" title="Descarga de nuevo la app si ves datos o pantallas antiguas">${icon('refresh', 14)} Forzar actualización</button>
      </div>
    </section>
  </div>

  <section class="card setting-card">
    <div class="card-head">
      <div><h2>Categorías</h2><p>Personaliza cómo clasificas tu dinero. Pulsa una para editarla.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-action="new-category">${icon('plus', 14)} Nueva categoría</button>
    </div>
    ${categoryGroups()}
  </section>

  <p class="tiny" style="text-align:center">Hecho para uso personal · sin cuentas, sin anuncios, sin nube · ${esc(new Date().toLocaleDateString(locale(), { year: 'numeric', month: 'long', day: 'numeric' }))}</p>`;
}

/* ---------------------------------------------------------------- diálogos */
function openSheet(opts) {
  const dialog = document.createElement('dialog');
  dialog.className = 'sheet' + (opts.wide ? ' wide' : '');
  dialog.innerHTML = `<div class="sheet-card">
    <div class="sheet-head">
      <div><h2>${esc(opts.title)}</h2>${opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ''}</div>
      <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close', 18)}</button>
    </div>
    <form class="sheet-form" novalidate>
      <div class="sheet-body">
        ${opts.body || ''}
        <p class="form-error" hidden></p>
      </div>
      <div class="sheet-foot">
        ${opts.dangerLabel ? `<button type="button" class="btn btn-ghost btn-sm" data-danger style="color:var(--danger)">${esc(opts.dangerLabel)}</button>` : ''}
        ${opts.secondaryLabel ? `<button type="button" class="btn btn-ghost btn-sm" data-secondary>${opts.secondaryIcon ? icon(opts.secondaryIcon, 14) : ''}${esc(opts.secondaryLabel)}</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-close>${opts.hideSubmit ? 'Cerrar' : 'Cancelar'}</button>
        ${opts.hideSubmit ? '' : `<button type="submit" class="btn btn-primary">${esc(opts.submitLabel || 'Guardar')}</button>`}
      </div>
    </form>
  </div>`;
  document.body.appendChild(dialog);

  const form = dialog.querySelector('form');
  const close = () => {
    if (dialog.open) dialog.close();
    dialog.remove();
  };
  dialog.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', close));
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => dialog.remove());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = form.querySelector('.form-error');
    const submit = form.querySelector('[type="submit"]');
    if (error) error.hidden = true;
    try {
      if (submit) submit.disabled = true;
      const result = await opts.onSubmit?.(new FormData(form), dialog);
      if (result !== false) close();
    } catch (err) {
      if (error) {
        error.hidden = false;
        error.textContent = err.message;
      } else {
        toast(err.message, 'error');
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  dialog.querySelector('[data-danger]')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    try {
      btn.disabled = true;
      await opts.onDanger?.(dialog);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  dialog.querySelector('[data-secondary]')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    try {
      btn.disabled = true;
      await opts.onSecondary?.(dialog, form);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  dialog.showModal();
  opts.onMount?.(dialog, form, close);
  setTimeout(() => {
    const first = dialog.querySelector('.sheet-body input:not([type="hidden"]), .sheet-body select, .sheet-body textarea');
    if (first) {
      first.focus();
      if (first.type === 'number') first.select();
    }
  }, 60);
  return dialog;
}

function confirmDialog({ title, message, confirm = 'Eliminar', danger = true }) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'sheet';
    dialog.innerHTML = `<div class="sheet-card">
      <div class="sheet-head"><div><h2>${esc(title)}</h2><p>${esc(message)}</p></div></div>
      <div class="sheet-foot">
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-no>Cancelar</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(confirm)}</button>
      </div>
    </div>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    const finish = (value) => {
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(value);
    };
    dialog.querySelector('[data-no]').addEventListener('click', () => finish(false));
    dialog.querySelector('[data-yes]').addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); finish(false); });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) finish(false); });
    setTimeout(() => dialog.querySelector('[data-no]')?.focus(), 40);
  });
}

function swatchesHTML(selected) {
  return `<div class="swatches">${PALETTE.map((color) => `<label class="swatch" style="--c:${tone(color)}" title="${color}">
    <input type="radio" name="color" value="${color}"${selected === color ? ' checked' : ''}><span></span>
  </label>`).join('')}</div>`;
}

/* ---------------------------------------------------------------- modal: movimiento */
function openTransactionModal(tx = null, presetType, draft = null) {
  if (!store.data.accounts.length) {
    toast('Crea primero una cuenta para registrar movimientos.', 'error');
    openAccountModal();
    return;
  }
  const src = tx || draft || {};
  let type = src.type || presetType || 'expense';
  const accounts = store.data.accounts;
  const accountOptions = (selected) => accounts.map((a) => `<option value="${esc(a.id)}"${(selected || accounts[0]?.id) === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
  const categoryOptions = (kind, selected) => store.data.categories
    .filter((c) => c.kind === kind)
    .map((c) => `<option value="${esc(c.id)}"${selected === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  const defaultTarget = accounts.find((a) => a.id !== (src.accountId || accounts[0]?.id))?.id || accounts[0]?.id;

  openSheet({
    title: tx ? 'Editar movimiento' : draft ? 'Duplicar movimiento' : 'Nuevo movimiento',
    subtitle: tx ? 'Cambia cualquier dato del movimiento.' : 'Un ingreso, un gasto o un traspaso entre cuentas.',
    submitLabel: tx ? 'Guardar cambios' : 'Añadir movimiento',
    dangerLabel: tx ? 'Eliminar' : '',
    secondaryLabel: tx ? 'Duplicar' : '',
    secondaryIcon: 'copy',
    body: `
      <div class="seg seg--full" data-seg="tx-type">
        <button type="button" data-tx-type="expense" class="${type === 'expense' ? 'active' : ''}">Gasto</button>
        <button type="button" data-tx-type="income" class="${type === 'income' ? 'active' : ''}">Ingreso</button>
        <button type="button" data-tx-type="transfer" class="${type === 'transfer' ? 'active' : ''}">Transferencia</button>
      </div>
      <input type="hidden" name="type" value="${type}">
      <label class="amount-field"><span>${esc(currencySymbol())}</span>
        <input name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${src.amount ? esc(src.amount) : ''}" required>
      </label>
      <div class="form-grid">
        <div class="field"><span>Fecha</span><input type="date" name="date" value="${esc(tx?.date || todayISO())}" required></div>
        <div class="field"><span>Cuenta</span><select name="accountId">${accountOptions(src.accountId)}</select></div>
      </div>
      <div class="field" data-field="category"><span>Categoría</span><select name="categoryId">${categoryOptions(type === 'transfer' ? 'expense' : type, src.categoryId)}</select></div>
      <div class="field" data-field="to"${type === 'transfer' ? '' : ' hidden'}><span>Cuenta destino</span><select name="toAccountId">${accountOptions(src.toAccountId || defaultTarget)}</select></div>
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="500" placeholder="Ej. Compra del supermercado" value="${esc(src.note || '')}"></div>
      ${tx ? (tx.recurringId ? `<p class="seg-note">${icon('repeat', 13)} Generado por un recurrente. <a href="#/recurrentes" data-close-link>Ver recurrentes</a></p>` : '') : `
      <label class="checkbox"><input type="checkbox" name="repeat" value="1" data-repeat> Repetir automáticamente</label>
      <div class="field" data-repeat-freq hidden><span>Frecuencia</span><select name="frequency">
        ${Object.entries(FREQ_LABELS).map(([v, l]) => `<option value="${v}"${v === 'monthly' ? ' selected' : ''}>${l}</option>`).join('')}
      </select><span class="hint">Se creará un recurrente que empieza en la fecha indicada.</span></div>`}
    `,
    onMount(dialog) {
      const seg = dialog.querySelector('[data-seg="tx-type"]');
      const hidden = dialog.querySelector('input[name="type"]');
      const categoryField = dialog.querySelector('[data-field="category"]');
      const toField = dialog.querySelector('[data-field="to"]');
      const categorySelect = dialog.querySelector('select[name="categoryId"]');
      const sync = (next) => {
        type = next;
        hidden.value = next;
        for (const btn of seg.querySelectorAll('[data-tx-type]')) btn.classList.toggle('active', btn.dataset.txType === next);
        if (next === 'transfer') {
          categoryField.hidden = true;
          toField.hidden = false;
        } else {
          categoryField.hidden = false;
          toField.hidden = true;
          const previous = categorySelect.value;
          categorySelect.innerHTML = categoryOptions(next, previous);
        }
      };
      seg.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-tx-type]');
        if (btn) sync(btn.dataset.txType);
      });
      if (type === 'transfer') sync('transfer');
      const repeat = dialog.querySelector('[data-repeat]');
      const freq = dialog.querySelector('[data-repeat-freq]');
      repeat?.addEventListener('change', () => { freq.hidden = !repeat.checked; });
      dialog.querySelector('[data-close-link]')?.addEventListener('click', () => { dialog.close(); dialog.remove(); });
    },
    async onSubmit(formData) {
      const payload = {
        type: formData.get('type'),
        amount: Number(String(formData.get('amount') || '').replace(',', '.')),
        date: formData.get('date') || todayISO(),
        accountId: formData.get('accountId'),
        note: String(formData.get('note') || '')
      };
      if (!(payload.amount > 0)) throw new Error('Introduce un importe mayor que cero.');
      if (payload.type === 'transfer') {
        payload.toAccountId = formData.get('toAccountId');
        if (payload.toAccountId === payload.accountId) throw new Error('Elige dos cuentas distintas.');
      } else {
        payload.categoryId = formData.get('categoryId');
        if (!payload.categoryId) throw new Error('Elige una categoría.');
      }
      if (!tx && formData.get('repeat')) {
        const before = store.data.transactions.length;
        await api('POST', 'api/recurring', { ...payload, frequency: formData.get('frequency') || 'monthly', startDate: payload.date });
        const created = store.data.transactions.length - before;
        render();
        toast(created ? 'Movimiento añadido y programado para repetirse' : 'Recurrente programado para el ' + dateLabel(payload.date).toLowerCase());
        return;
      }
      if (tx) await api('PATCH', `api/transactions/${tx.id}`, payload);
      else await api('POST', 'api/transactions', payload);
      render();
      toast(tx ? 'Movimiento actualizado' : 'Movimiento añadido');
    },
    onSecondary(dialog) {
      dialog.close();
      dialog.remove();
      openTransactionModal(null, tx.type, { ...tx, id: undefined });
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({
        title: 'Eliminar movimiento',
        message: 'Esta acción no se puede deshacer.',
        confirm: 'Eliminar'
      });
      if (!ok) return;
      await api('DELETE', `api/transactions/${tx.id}`);
      dialog.close();
      dialog.remove();
      render();
      toast('Movimiento eliminado');
    }
  });
}

/* ---------------------------------------------------------------- modal: cuenta */
function openAccountModal(account = null) {
  const color = account?.color || PALETTE[store.data.accounts.length % PALETTE.length];
  openSheet({
    title: account ? 'Editar cuenta' : 'Nueva cuenta',
    subtitle: 'El saldo actual se calcula con el saldo inicial y sus movimientos.',
    submitLabel: account ? 'Guardar cambios' : 'Crear cuenta',
    dangerLabel: account ? 'Eliminar' : '',
    body: `
      <div class="field"><span>Nombre</span><input name="name" maxlength="60" placeholder="Ej. Cuenta principal" value="${esc(account?.name || '')}" required></div>
      <div class="form-grid">
        <div class="field"><span>Tipo</span><select name="type">
          ${Object.entries(ACCOUNT_TYPES).map(([value, label]) => `<option value="${value}"${(account?.type || 'bank') === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}
        </select></div>
        <div class="field"><span>Saldo inicial</span><input name="initialBalance" type="number" step="0.01" inputmode="decimal" value="${account ? esc(account.initialBalance) : '0'}"></div>
      </div>
      <div class="field"><span>Color</span>${swatchesHTML(color)}</div>
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="300" placeholder="Ej. Nómina y gastos fijos" value="${esc(account?.note || '')}"></div>
    `,
    async onSubmit(formData) {
      const payload = {
        name: String(formData.get('name') || '').trim(),
        type: formData.get('type'),
        initialBalance: Number(formData.get('initialBalance') || 0),
        color: formData.get('color') || color,
        note: String(formData.get('note') || '')
      };
      if (!payload.name) throw new Error('Ponle un nombre a la cuenta.');
      if (account) await api('PATCH', `api/accounts/${account.id}`, payload);
      else await api('POST', 'api/accounts', payload);
      render();
      toast(account ? 'Cuenta actualizada' : 'Cuenta creada');
    },
    async onDanger(dialog) {
      if (store.data.accounts.length <= 1) throw new Error('Debes tener al menos una cuenta.');
      const ok = await confirmDialog({
        title: 'Eliminar cuenta',
        message: 'Solo se puede eliminar si no tiene movimientos asociados.',
        confirm: 'Eliminar'
      });
      if (!ok) return;
      await api('DELETE', `api/accounts/${account.id}`);
      dialog.close();
      dialog.remove();
      render();
      toast('Cuenta eliminada');
    }
  });
}

/* ---------------------------------------------------------------- modal: categoría */
function openCategoryModal(category = null, kind = 'expense') {
  let currentKind = category?.kind || kind;
  const initialIcon = normalizeGlyph(category?.icon, currentKind === 'income' ? 'briefcase' : 'cart');
  const color = category?.color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
  openSheet({
    title: category ? 'Editar categoría' : 'Nueva categoría',
    subtitle: 'Las categorías de gasto pueden tener un presupuesto mensual.',
    submitLabel: category ? 'Guardar cambios' : 'Crear categoría',
    dangerLabel: category ? 'Eliminar' : '',
    body: `
      <div class="seg seg--full" data-seg="cat-kind">
        <button type="button" data-cat-kind="expense" class="${currentKind === 'expense' ? 'active' : ''}">Gasto</button>
        <button type="button" data-cat-kind="income" class="${currentKind === 'income' ? 'active' : ''}">Ingreso</button>
      </div>
      <input type="hidden" name="kind" value="${currentKind}">
      <div class="field"><span>Nombre</span><input name="name" maxlength="60" placeholder="Ej. Alimentación" value="${esc(category?.name || '')}" required></div>
      <div class="field"><span>Icono</span>
        <input type="hidden" name="icon" value="${esc(initialIcon)}">
        <div class="emoji-grid" data-emoji-grid>
          ${CATEGORY_GLYPHS.map((key) => `<button type="button" data-emoji="${key}" class="${key === initialIcon ? 'active' : ''}" title="${esc(GLYPHS[key].label)}" aria-label="${esc(GLYPHS[key].label)}">${glyphSVG(key, 20)}</button>`).join('')}
        </div>
      </div>
      <div class="field"><span>Color</span>${swatchesHTML(color)}</div>
      <div class="field" data-budget-field${currentKind === 'income' ? ' hidden' : ''}><span>Presupuesto mensual <span class="hint">(0 = sin límite)</span></span>
        <input name="budget" type="number" min="0" step="0.01" inputmode="decimal" value="${category ? esc(category.budget) : '0'}">
      </div>
    `,
    onMount(dialog) {
      const hiddenKind = dialog.querySelector('input[name="kind"]');
      const budgetField = dialog.querySelector('[data-budget-field]');
      const iconInput = dialog.querySelector('input[name="icon"]');
      dialog.querySelector('[data-seg="cat-kind"]').addEventListener('click', (event) => {
        const btn = event.target.closest('[data-cat-kind]');
        if (!btn) return;
        currentKind = btn.dataset.catKind;
        hiddenKind.value = currentKind;
        for (const b of dialog.querySelectorAll('[data-cat-kind]')) b.classList.toggle('active', b.dataset.catKind === currentKind);
        budgetField.hidden = currentKind === 'income';
      });
      dialog.querySelector('[data-emoji-grid]').addEventListener('click', (event) => {
        const btn = event.target.closest('[data-emoji]');
        if (!btn) return;
        iconInput.value = btn.dataset.emoji;
        for (const b of dialog.querySelectorAll('[data-emoji]')) b.classList.toggle('active', b === btn);
      });
    },
    async onSubmit(formData) {
      const payload = {
        kind: formData.get('kind'),
        name: String(formData.get('name') || '').trim(),
        icon: formData.get('icon') || 'box',
        color: formData.get('color') || color,
        budget: payloadNumber(formData.get('budget'))
      };
      if (!payload.name) throw new Error('Ponle un nombre a la categoría.');
      if (category) await api('PATCH', `api/categories/${category.id}`, payload);
      else await api('POST', 'api/categories', payload);
      render();
      toast(category ? 'Categoría actualizada' : 'Categoría creada');
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({
        title: 'Eliminar categoría',
        message: 'Solo se puede eliminar si no tiene movimientos asociados.',
        confirm: 'Eliminar'
      });
      if (!ok) return;
      await api('DELETE', `api/categories/${category.id}`);
      dialog.close();
      dialog.remove();
      render();
      toast('Categoría eliminada');
    }
  });
}

function payloadNumber(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/* ---------------------------------------------------------------- modal: presupuestos */
function openBudgetModal() {
  const categories = store.data.categories.filter((c) => c.kind === 'expense');
  if (!categories.length) {
    toast('Crea al menos una categoría de gasto.', 'error');
    openCategoryModal(null, 'expense');
    return;
  }
  const month = /^\d{4}-\d{2}$/.test(ui.budgetMonth) ? ui.budgetMonth : monthKey(todayISO());
  openSheet({
    title: 'Editar presupuestos',
    subtitle: `Límites mensuales · ${monthLabel(month)}`,
    submitLabel: 'Guardar presupuestos',
    wide: true,
    body: `
      <p class="seg-note">Estos límites se repiten todos los meses. Deja 0 si no quieres poner límite.</p>
      <div class="form-grid">
        ${categories.map((c) => `<div class="field"><span class="field-glyph"><i style="color:${tone(c.color)}">${glyphSVG(c.icon, 15)}</i>${esc(c.name)}</span>
          <input name="budget_${esc(c.id)}" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(c.budget || 0)}">
        </div>`).join('')}
      </div>`,
    async onSubmit(formData) {
      const budgets = {};
      for (const c of categories) {
        const value = payloadNumber(formData.get(`budget_${c.id}`));
        if (value < 0) throw new Error('Los presupuestos no pueden ser negativos.');
        budgets[c.id] = value;
      }
      await api('POST', 'api/budgets', { budgets });
      render();
      toast('Presupuestos actualizados');
    }
  });
}

/* ---------------------------------------------------------------- modal: inversión */
function openInvestmentModal(investment = null) {
  let type = investment?.type || 'etf';
  let color = investment?.color || INVEST_TYPES[type].color;
  let picked = investment?.quoteSymbol
    ? { symbol: investment.quoteSymbol, name: investment.marketName || investment.name, exchange: investment.exchange || '', type }
    : null;
  let found = [];
  let timer = null;
  let seq = 0;
  const isMarket = () => MARKET_TYPES.includes(type);
  openSheet({
    title: investment ? 'Editar inversión' : 'Nueva inversión',
    subtitle: 'Búscala en el mercado y Mi Cartera usará su precio real.',
    submitLabel: investment ? 'Guardar cambios' : 'Crear inversión',
    dangerLabel: investment ? 'Eliminar' : '',
    body: `
      <div class="field"><span>Tipo</span><select name="type">
        ${Object.entries(INVEST_TYPES).map(([value, meta]) => `<option value="${value}"${type === value ? ' selected' : ''}>${esc(meta.label)}</option>`).join('')}
      </select></div>
      <div data-market-block${isMarket() ? '' : ' hidden'}>
        <div class="field"><span>Busca el valor</span>
          <div class="search-field">${icon('search', 16)}<input name="q" type="search" autocomplete="off" spellcheck="false" placeholder="Nombre, ticker o ISIN · Ej. Apple, IWDA, IE00B03HD191"></div>
        </div>
        <div class="mkt-results" data-mkt-results></div>
        <div data-mkt-picked></div>
      </div>
      <div class="field"><span>Nombre</span><input name="name" maxlength="80" placeholder="Ej. MSCI World" value="${esc(investment?.name || '')}" required></div>
      <div data-manual-block${isMarket() ? ' hidden' : ''}>
        <div class="form-grid">
          <div class="field"><span>Valor actual por unidad</span><input name="currentPrice" type="number" min="0" step="any" inputmode="decimal" value="${investment && !isMarket() ? esc(investment.currentPrice) : ''}" placeholder="0,00"></div>
          <div class="field"><span>Fecha del valor</span><input name="priceDate" type="date" value="${esc(investment?.priceUpdatedAt || todayISO())}"></div>
        </div>
        <p class="seg-note">Los depósitos y otros activos que no cotizan se valoran con el importe que indiques.</p>
      </div>
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="300" placeholder="Ej. Aportación mensual automatizada" value="${esc(investment?.note || '')}"></div>
      <input type="hidden" name="color" value="${esc(color)}">
    `,
    onMount(dialog) {
      const select = dialog.querySelector('select[name="type"]');
      const hidden = dialog.querySelector('input[name="color"]');
      const marketBlock = dialog.querySelector('[data-market-block]');
      const manualBlock = dialog.querySelector('[data-manual-block]');
      const q = dialog.querySelector('input[name="q"]');
      const results = dialog.querySelector('[data-mkt-results]');
      const pickedEl = dialog.querySelector('[data-mkt-picked]');
      const nameInput = dialog.querySelector('input[name="name"]');
      if (!investment) nameInput.dataset.auto = '1';
      const toggle = () => {
        marketBlock.hidden = !isMarket();
        manualBlock.hidden = isMarket();
      };
      const renderPicked = async () => {
        if (!picked) { pickedEl.innerHTML = ''; return; }
        pickedEl.innerHTML = `<div class="mkt-picked">
          <span class="mkt-picked-main"><b>${esc(picked.name)}</b><span>${esc(picked.symbol)}${picked.exchange ? ` · ${esc(picked.exchange)}` : ''}</span></span>
          <span class="mkt-picked-live" data-live>Consultando precio…</span>
          <button type="button" class="btn btn-sm btn-ghost" data-unpick>Cambiar</button>
        </div>`;
        const live = pickedEl.querySelector('[data-live]');
        const symbol = picked.symbol;
        try {
          const { quote } = await api('POST', 'api/market/quote', { symbol });
          if (picked?.symbol !== symbol) return;
          live.innerHTML = `<b>${esc(money(quote.price))}</b> ${changeChip(quote.dayChangePct, 'hoy')}`;
        } catch (err) {
          live.innerHTML = `<span class="tiny">${esc(err.message)}</span>`;
        }
      };
      const pick = (r) => {
        picked = r;
        if (r.type && r.type !== type && INVEST_TYPES[r.type]) {
          type = r.type;
          select.value = type;
          color = INVEST_TYPES[type].color;
          hidden.value = color;
        }
        if (nameInput.dataset.auto || !nameInput.value.trim()) { nameInput.value = r.name; nameInput.dataset.auto = '1'; }
        results.innerHTML = '';
        q.value = '';
        renderPicked();
      };
      select.addEventListener('change', () => {
        type = select.value;
        color = INVEST_TYPES[type]?.color || '#8b5cf6';
        hidden.value = color;
        toggle();
      });
      nameInput.addEventListener('input', () => { delete nameInput.dataset.auto; });
      q.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (found[0]) pick(found[0]);
      });
      q.addEventListener('input', () => {
        clearTimeout(timer);
        const term = q.value.trim();
        if (term.length < 2) { results.innerHTML = ''; found = []; return; }
        results.innerHTML = '<p class="tiny mkt-status">Buscando en el mercado…</p>';
        timer = setTimeout(async () => {
          const mine = ++seq;
          try {
            const { results: list } = await api('POST', 'api/market/search', { q: term });
            if (mine !== seq) return;
            found = list || [];
            results.innerHTML = found.length
              ? found.map((r, i) => `<button type="button" class="mkt-result" data-pick="${i}">
                  <span><b>${esc(r.name)}</b><span>${esc(r.symbol)}${r.exchange ? ` · ${esc(r.exchange)}` : ''}</span></span>
                  <span class="asset-badge" style="background:${INVEST_TYPES[r.type]?.color || '#8b5cf6'}20;color:${INVEST_TYPES[r.type]?.color || '#8b5cf6'}">${esc(INVEST_TYPES[r.type]?.label || '')}</span>
                </button>`).join('')
              : '<p class="tiny mkt-status">No hay resultados. Prueba con el ticker (AAPL) o el ISIN del fondo.</p>';
          } catch (err) {
            if (mine === seq) results.innerHTML = `<p class="tiny mkt-status">${esc(err.message)}</p>`;
          }
        }, 350);
      });
      results.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-pick]');
        if (btn && found[Number(btn.dataset.pick)]) pick(found[Number(btn.dataset.pick)]);
      });
      pickedEl.addEventListener('click', (event) => {
        if (!event.target.closest('[data-unpick]')) return;
        picked = null;
        renderPicked();
        q.focus();
      });
      toggle();
      renderPicked();
    },
    async onSubmit(formData) {
      const payload = {
        name: String(formData.get('name') || '').trim(),
        type,
        note: String(formData.get('note') || ''),
        color: formData.get('color') || color
      };
      if (isMarket()) {
        if (!picked) throw new Error('Busca el valor y elígelo de la lista para usar su precio real del mercado.');
        payload.quoteSymbol = picked.symbol;
        payload.symbol = type === 'fund' ? '' : picked.symbol.split(/[.=]/)[0].replace(/-[A-Z]{3}$/, '').slice(0, 16);
        if (!payload.name) payload.name = picked.name;
      } else {
        payload.quoteSymbol = '';
        payload.symbol = investment?.symbol || '';
        payload.currentPrice = payloadNumber(formData.get('currentPrice'));
        payload.priceUpdatedAt = formData.get('priceDate') || todayISO();
        if (!(payload.currentPrice >= 0)) throw new Error('El valor no puede ser negativo.');
      }
      if (!payload.name) throw new Error('Ponle un nombre a la inversión.');
      if (investment) await api('PATCH', `api/investments/${investment.id}`, payload);
      else await api('POST', 'api/investments', payload);
      render();
      toast(investment ? 'Inversión actualizada' : isMarket() ? 'Inversión creada con su precio de mercado. Añade ahora tus compras.' : 'Inversión creada. Añade ahora sus operaciones.');
    },
    async onDanger(dialog) {
      const count = store.data.ops.filter((o) => o.investmentId === investment.id).length;
      const ok = await confirmDialog({
        title: 'Eliminar inversión',
        message: count ? `También se eliminarán sus ${count} operaciones. Esta acción no se puede deshacer.` : 'Esta acción no se puede deshacer.',
        confirm: 'Eliminar'
      });
      if (!ok) return;
      await api('DELETE', `api/investments/${investment.id}`);
      dialog.close();
      dialog.remove();
      render();
      toast('Inversión eliminada');
    }
  });
}

/* ---------------------------------------------------------------- modal: recurrente */
function openRecurringModal(rule = null, preset = {}) {
  if (!store.data.accounts.length) {
    toast('Crea primero una cuenta.', 'error');
    openAccountModal();
    return;
  }
  const accounts = store.data.accounts;
  let type = rule?.type || preset.type || 'expense';
  const accountOptions = (selected) => accounts.map((a) => `<option value="${esc(a.id)}"${(selected || accounts[0]?.id) === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
  const categoryOptions = (kind, selected) => store.data.categories
    .filter((c) => c.kind === kind)
    .map((c) => `<option value="${esc(c.id)}"${selected === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  const src = rule || preset;
  const defaultTarget = accounts.find((a) => a.id !== (src.accountId || accounts[0]?.id))?.id || accounts[0]?.id;
  const generated = rule ? store.data.transactions.filter((t) => t.recurringId === rule.id).length : 0;

  openSheet({
    title: rule ? 'Editar recurrente' : 'Nuevo recurrente',
    subtitle: rule ? `${generated} ${generated === 1 ? 'movimiento generado' : 'movimientos generados'} hasta ahora.` : 'Se añadirá el movimiento automáticamente en cada fecha.',
    submitLabel: rule ? 'Guardar cambios' : 'Crear recurrente',
    dangerLabel: rule ? 'Eliminar' : '',
    secondaryLabel: rule && rule.active !== false && rule.nextDate ? 'Saltar el próximo' : '',
    body: `
      <div class="seg seg--full" data-seg="tx-type">
        <button type="button" data-tx-type="expense" class="${type === 'expense' ? 'active' : ''}">Gasto</button>
        <button type="button" data-tx-type="income" class="${type === 'income' ? 'active' : ''}">Ingreso</button>
        <button type="button" data-tx-type="transfer" class="${type === 'transfer' ? 'active' : ''}">Transferencia</button>
      </div>
      <input type="hidden" name="type" value="${type}">
      <label class="amount-field"><span>${esc(currencySymbol())}</span>
        <input name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${src.amount ? esc(src.amount) : ''}" required>
      </label>
      <div class="field"><span>Concepto</span><input name="note" maxlength="500" placeholder="Ej. Alquiler, Nómina, Netflix…" value="${esc(src.note || '')}"></div>
      <div class="form-grid">
        <div class="field"><span>Frecuencia</span><select name="frequency">
          ${Object.entries(FREQ_LABELS).map(([v, l]) => `<option value="${v}"${(rule?.frequency || 'monthly') === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></div>
        <div class="field"><span>Cuenta</span><select name="accountId">${accountOptions(src.accountId)}</select></div>
      </div>
      <div class="field" data-field="category"><span>Categoría</span><select name="categoryId">${categoryOptions(type === 'transfer' ? 'expense' : type, src.categoryId)}</select></div>
      <div class="field" data-field="to"${type === 'transfer' ? '' : ' hidden'}><span>Cuenta destino</span><select name="toAccountId">${accountOptions(src.toAccountId || defaultTarget)}</select></div>
      <div class="form-grid">
        <div class="field"><span>Primera fecha</span><input type="date" name="startDate" value="${esc(rule?.startDate || src.date || todayISO())}" required></div>
        <div class="field"><span>Hasta <span class="hint">(opcional)</span></span><input type="date" name="endDate" value="${esc(rule?.endDate || '')}"></div>
      </div>
      ${rule ? `<div class="form-grid">
        <div class="field"><span>Próxima fecha</span><input type="date" name="nextDate" value="${esc(rule.nextDate || '')}"></div>
        <div class="field"><span>Estado</span><select name="active"><option value="1"${rule.active !== false ? ' selected' : ''}>Activo</option><option value="0"${rule.active === false ? ' selected' : ''}>En pausa</option></select></div>
      </div>` : ''}
      <p class="seg-note">${rule ? 'Cambiar el importe no modifica los movimientos ya generados.' : 'Si la primera fecha es hoy o ya ha pasado, se crearán al momento los movimientos pendientes desde esa fecha.'}</p>
    `,
    onMount(dialog) {
      const seg = dialog.querySelector('[data-seg="tx-type"]');
      const hidden = dialog.querySelector('input[name="type"]');
      const categoryField = dialog.querySelector('[data-field="category"]');
      const toField = dialog.querySelector('[data-field="to"]');
      const categorySelect = dialog.querySelector('select[name="categoryId"]');
      const sync = (next) => {
        type = next;
        hidden.value = next;
        for (const btn of seg.querySelectorAll('[data-tx-type]')) btn.classList.toggle('active', btn.dataset.txType === next);
        categoryField.hidden = next === 'transfer';
        toField.hidden = next !== 'transfer';
        if (next !== 'transfer') categorySelect.innerHTML = categoryOptions(next, categorySelect.value);
      };
      seg.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-tx-type]');
        if (btn) sync(btn.dataset.txType);
      });
    },
    async onSubmit(formData) {
      const payload = {
        type: formData.get('type'),
        amount: payloadNumber(formData.get('amount')),
        note: String(formData.get('note') || '').trim(),
        frequency: formData.get('frequency'),
        accountId: formData.get('accountId'),
        startDate: formData.get('startDate') || todayISO(),
        endDate: formData.get('endDate') || null
      };
      if (!(payload.amount > 0)) throw new Error('Introduce un importe mayor que cero.');
      if (payload.type === 'transfer') {
        payload.toAccountId = formData.get('toAccountId');
        if (payload.toAccountId === payload.accountId) throw new Error('Elige dos cuentas distintas.');
      } else {
        payload.categoryId = formData.get('categoryId');
        if (!payload.categoryId) throw new Error('Elige una categoría.');
      }
      if (rule) {
        if (formData.get('nextDate')) payload.nextDate = formData.get('nextDate');
        payload.active = formData.get('active') !== '0';
      }
      const before = store.data.transactions.length;
      if (rule) await api('PATCH', `api/recurring/${rule.id}`, payload);
      else await api('POST', 'api/recurring', payload);
      const created = store.data.transactions.length - before;
      render();
      toast(rule ? 'Recurrente actualizado' : created > 0 ? `Recurrente creado · ${created} movimiento${created === 1 ? '' : 's'} añadido${created === 1 ? '' : 's'}` : 'Recurrente creado');
    },
    async onSecondary(dialog) {
      await api('POST', `api/recurring/${rule.id}/skip`);
      dialog.close();
      dialog.remove();
      render();
      toast('Se ha saltado la próxima fecha');
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({
        title: 'Eliminar recurrente',
        message: 'Dejarán de generarse movimientos. Los que ya se crearon se conservan.',
        confirm: 'Eliminar'
      });
      if (!ok) return;
      await api('DELETE', `api/recurring/${rule.id}`);
      dialog.close();
      dialog.remove();
      render();
      toast('Recurrente eliminado');
    }
  });
}

/* ---------------------------------------------------------------- modal: objetivo */
const GOAL_GLYPHS = ['target', 'lifebuoy', 'plane', 'umbrella', 'home', 'car', 'bike', 'ring', 'graduation', 'laptop', 'baby', 'paw', 'music', 'phone', 'bank', 'gift', 'heart', 'star'];
function openGoalModal(goal = null) {
  const color = goal?.color || PALETTE[(store.data.goals || []).length % PALETTE.length];
  const initialIcon = normalizeGlyph(goal?.icon, 'target');
  let linked = Boolean(goal?.accountId);
  openSheet({
    title: goal ? 'Editar objetivo' : 'Nuevo objetivo',
    subtitle: 'Vincúlalo a una cuenta para seguirlo con su saldo, o ve apuntando aportaciones.',
    submitLabel: goal ? 'Guardar cambios' : 'Crear objetivo',
    dangerLabel: goal ? 'Eliminar' : '',
    body: `
      <div class="field"><span>Nombre</span><input name="name" maxlength="60" placeholder="Ej. Fondo de emergencia" value="${esc(goal?.name || '')}" required></div>
      <div class="field"><span>Icono</span>
        <input type="hidden" name="icon" value="${esc(initialIcon)}">
        <div class="emoji-grid" data-emoji-grid>${GOAL_GLYPHS.map((key) => `<button type="button" data-emoji="${key}" class="${key === initialIcon ? 'active' : ''}" title="${esc(GLYPHS[key].label)}" aria-label="${esc(GLYPHS[key].label)}">${glyphSVG(key, 20)}</button>`).join('')}</div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Cantidad objetivo</span><input name="target" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${goal ? esc(goal.target) : ''}" required></div>
        <div class="field"><span>Fecha límite <span class="hint">(opcional)</span></span><input name="deadline" type="date" value="${esc(goal?.deadline || '')}"></div>
      </div>
      <div class="field"><span>Cómo se mide el progreso</span><select name="accountId" data-goal-account>
        <option value="">Aportaciones manuales</option>
        ${store.data.accounts.map((a) => `<option value="${esc(a.id)}"${goal?.accountId === a.id ? ' selected' : ''}>Saldo de ${esc(a.name)} (${esc(money(accountBalance(a), { decimals: 0 }))})</option>`).join('')}
      </select></div>
      <div class="field" data-goal-saved${linked ? ' hidden' : ''}><span>Ya ahorrado</span><input name="saved" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(goal?.saved || 0)}"></div>
      <div class="field"><span>Color</span>${swatchesHTML(color)}</div>
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="300" placeholder="Ej. 6 meses de gastos" value="${esc(goal?.note || '')}"></div>
    `,
    onMount(dialog) {
      const iconInput = dialog.querySelector('input[name="icon"]');
      dialog.querySelector('[data-emoji-grid]').addEventListener('click', (event) => {
        const btn = event.target.closest('[data-emoji]');
        if (!btn) return;
        iconInput.value = btn.dataset.emoji;
        for (const b of dialog.querySelectorAll('[data-emoji]')) b.classList.toggle('active', b === btn);
      });
      const select = dialog.querySelector('[data-goal-account]');
      const savedField = dialog.querySelector('[data-goal-saved]');
      select.addEventListener('change', () => { linked = Boolean(select.value); savedField.hidden = linked; });
    },
    async onSubmit(formData) {
      const payload = {
        name: String(formData.get('name') || '').trim(),
        icon: formData.get('icon') || 'target',
        target: payloadNumber(formData.get('target')),
        deadline: formData.get('deadline') || null,
        accountId: formData.get('accountId') || null,
        saved: payloadNumber(formData.get('saved')),
        color: formData.get('color') || color,
        note: String(formData.get('note') || '')
      };
      if (!payload.name) throw new Error('Ponle un nombre al objetivo.');
      if (!(payload.target > 0)) throw new Error('La cantidad objetivo debe ser mayor que cero.');
      if (goal) await api('PATCH', `api/goals/${goal.id}`, payload);
      else await api('POST', 'api/goals', payload);
      render();
      toast(goal ? 'Objetivo actualizado' : 'Objetivo creado');
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({ title: 'Eliminar objetivo', message: 'No afecta a tus cuentas ni movimientos.', confirm: 'Eliminar' });
      if (!ok) return;
      await api('DELETE', `api/goals/${goal.id}`);
      dialog.close();
      dialog.remove();
      render();
      toast('Objetivo eliminado');
    }
  });
}
function openGoalAmountModal(goal, mode = 'add') {
  const add = mode === 'add';
  openSheet({
    title: add ? 'Aportar al objetivo' : 'Retirar del objetivo',
    subtitle: `${goal.name} · llevas ${money(goal.saved || 0)} de ${money(goal.target)}`,
    submitLabel: add ? 'Aportar' : 'Retirar',
    body: `
      <label class="amount-field"><span>${esc(currencySymbol())}</span>
        <input name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" required>
      </label>
      <p class="seg-note">Solo cambia el progreso del objetivo. Si el dinero se mueve entre cuentas, registra también una transferencia.</p>`,
    async onSubmit(formData) {
      const amount = payloadNumber(formData.get('amount'));
      if (!(amount > 0)) throw new Error('Introduce un importe mayor que cero.');
      const saved = Math.max(0, round((Number(goal.saved) || 0) + (add ? amount : -amount)));
      await api('PATCH', `api/goals/${goal.id}`, { saved });
      render();
      toast(add ? 'Aportación guardada' : 'Retirada guardada');
      if (add && saved >= goal.target && (goal.saved || 0) < goal.target) setTimeout(() => toast(`¡Objetivo «${goal.name}» conseguido!`), 400);
    }
  });
}

/* ---------------------------------------------------------------- modal: operación */
function marketBoxHTML(ctx, op, inv) {
  const moved = ctx.tradeDate !== ctx.date;
  const info = entryContext(op, ctx);
  const since = op.type === 'buy' && inv.currentPrice > 0 && ctx.close > 0 ? (inv.currentPrice / ctx.close - 1) * 100 : null;
  return `<div class="mkt-box-head">
      <span>Cierre del ${esc(fmtDate(ctx.tradeDate))}${moved ? ' <small>(último día con mercado abierto)</small>' : ''}</span>
      <b>${esc(money(ctx.close))}</b>
    </div>
    <div class="mkt-box-row"><span>Rango de ese día</span><b>${esc(money(ctx.low))} – ${esc(money(ctx.high))}</b></div>
    <div class="mkt-box-row"><span>Ese día</span>${changeChip(ctx.dayChangePct) || '<span class="tiny">sin dato</span>'}</div>
    <div class="mkt-box-row"><span>Mes anterior</span>${changeChip(ctx.trend30Pct) || '<span class="tiny">sin dato</span>'}</div>
    ${info?.verdict ? `<p class="mkt-verdict mkt-verdict--${info.tone}">${esc(info.verdict)}.</p>` : ''}
    ${since !== null ? `<p class="mkt-since">Desde entonces ${changeChip(since)} <span class="tiny">· precio actual ${esc(money(inv.currentPrice))}</span></p>` : ''}`;
}

function openOpModal(investmentId = null, op = null) {
  if (!store.data.investments.length) {
    toast('Crea primero una inversión.', 'error');
    openInvestmentModal();
    return;
  }
  const investments = store.data.investments;
  let selectedId = op?.investmentId || investmentId || investments[0].id;
  const fixed = Boolean(op || investmentId);
  let opType = op?.type || 'buy';
  let qtyMode = 'units';
  let ctx = null;
  let ctxSeq = 0;
  const inv = () => investmentById(selectedId);
  const linked = () => marketLinked(inv());
  const currentHolding = () => computeHoldings().find((h) => h.id === selectedId);
  const investmentOptions = () => investments.map((i) => `<option value="${esc(i.id)}"${selectedId === i.id ? ' selected' : ''}>${esc(i.name)}${i.symbol ? ` (${esc(i.symbol)})` : ''}</option>`).join('');
  const lastAccount = [...store.data.ops].filter((o) => o.investmentId === selectedId && o.accountId).sort((a, b) => b.date.localeCompare(a.date))[0]?.accountId;
  const accountId = op ? op.accountId || '' : lastAccount || '';
  const execInit = op ? op.priceMode !== 'market' : false;

  openSheet({
    title: op ? 'Editar operación' : 'Registrar operación',
    subtitle: 'El precio sale del mercado el día de la operación.',
    submitLabel: op ? 'Guardar cambios' : 'Guardar operación',
    dangerLabel: op ? 'Eliminar' : '',
    body: `
      ${fixed
        ? `<div class="banner">${icon('trend', 17)}<span><b>${esc(inv()?.name || '')}</b> · <span data-op-units>${esc(unitsLabel(currentHolding()?.units || 0))} unidades</span></span></div>`
        : `<div class="field"><span>Inversión</span><select name="investmentId" data-op-investment>${investmentOptions()}</select></div>`}
      <div class="seg seg--full" data-seg="op-type">
        <button type="button" data-op-type="buy" class="${opType === 'buy' ? 'active' : ''}">Compra</button>
        <button type="button" data-op-type="sell" class="${opType === 'sell' ? 'active' : ''}">Venta</button>
      </div>
      <input type="hidden" name="type" value="${opType}">
      <div class="form-grid">
        <div class="field"><span>Fecha</span><input name="date" type="date" max="${todayISO()}" value="${esc(op?.date || todayISO())}"></div>
        <div class="field"><span>Comisiones</span><input name="fees" type="number" min="0" step="0.01" inputmode="decimal" value="${op ? esc(op.fees || 0) : '0'}"></div>
      </div>
      <div class="mkt-box" data-mkt-box hidden></div>
      <div class="seg seg--full" data-seg="qty-mode" hidden>
        <button type="button" data-qty="units" class="active">Por unidades</button>
        <button type="button" data-qty="amount">Por importe</button>
      </div>
      <div class="form-grid">
        <div class="field" data-units-field><span>Unidades</span><input name="units" type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${op ? esc(op.units) : ''}"></div>
        <div class="field" data-amount-field hidden><span data-amount-label>Importe invertido</span><input name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"></div>
        <div class="field"><span data-price-label>Precio por unidad</span><input name="price" type="number" min="0" step="any" inputmode="decimal" placeholder="0,00" value="${op ? esc(op.price) : ''}"></div>
      </div>
      <label class="checkbox" data-exec-wrap hidden><input type="checkbox" name="execution" value="1"${execInit ? ' checked' : ''}> Mi bróker me dio otro precio ese día (precio de ejecución)</label>
      <div class="field"><span>Cuenta de cargo / abono</span><select name="accountId">
        <option value="">Ninguna (no mueve efectivo)</option>
        ${store.data.accounts.map((a) => `<option value="${esc(a.id)}"${accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}
      </select></div>
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="300" placeholder="Ej. Aportación mensual" value="${esc(op?.note || '')}"></div>
      <label class="checkbox" data-sync-wrap${op ? ' hidden' : ''}><input type="checkbox" name="syncPrice" value="1"> Usar este precio como valor actual de la inversión</label>
      <div class="op-total" data-op-total></div>
      <p class="seg-note" data-op-hint></p>
    `,
    onMount(dialog) {
      const $ = (sel) => dialog.querySelector(sel);
      const typeSeg = $('[data-seg="op-type"]');
      const qtySeg = $('[data-seg="qty-mode"]');
      const hiddenType = $('input[name="type"]');
      const select = $('[data-op-investment]');
      const hint = $('[data-op-hint]');
      const totalEl = $('[data-op-total]');
      const box = $('[data-mkt-box]');
      const priceInput = $('input[name="price"]');
      const dateInput = $('input[name="date"]');
      const exec = $('input[name="execution"]');
      const val = (name) => payloadNumber(dialog.querySelector(`[name="${name}"]`)?.value);
      const unitsNow = () => {
        if (qtyMode !== 'amount') return val('units');
        const price = val('price');
        if (!(price > 0)) return 0;
        const amount = val('amount');
        return round(opType === 'buy' ? (amount - val('fees')) / price : (amount + val('fees')) / price, 8);
      };
      const update = () => {
        const isLinked = linked();
        const holding = currentHolding();
        $('[data-exec-wrap]').hidden = !isLinked;
        qtySeg.hidden = !isLinked;
        $('[data-sync-wrap]').hidden = Boolean(op) || isLinked;
        $('[data-units-field]').hidden = isLinked && qtyMode === 'amount';
        $('[data-amount-field]').hidden = !(isLinked && qtyMode === 'amount');
        $('[data-amount-label]').textContent = opType === 'buy' ? 'Importe invertido' : 'Importe recibido';
        const marketPrice = isLinked && !exec.checked;
        priceInput.readOnly = marketPrice;
        priceInput.classList.toggle('is-locked', marketPrice);
        $('[data-price-label]').textContent = marketPrice ? 'Precio de mercado' : isLinked ? 'Tu precio de ejecución' : 'Precio por unidad';
        if (marketPrice && ctx) priceInput.value = String(round(ctx.close, ctx.close < 10 ? 6 : 4));
        const units = unitsNow();
        const price = val('price');
        const gross = units * price;
        const total = opType === 'buy' ? gross + val('fees') : gross - val('fees');
        const acc = $('select[name="accountId"]').value;
        totalEl.innerHTML = gross > 0
          ? `<span>${opType === 'buy' ? 'Total a pagar' : 'Total a recibir'}</span><b>${esc(money(total))}</b><small>${qtyMode === 'amount' && isLinked ? `${esc(unitsLabel(units))} unidades · ` : ''}${acc ? `${opType === 'buy' ? 'Se restará de' : 'Se sumará a'} ${esc(accountById(acc)?.name || '')}` : ''}</small>`
          : '';
        let msg = holding ? `Disponibles: ${unitsLabel(holding.units)} unidades · coste medio ${money(holding.avg)}.` : '';
        if (isLinked && exec.checked && ctx && price > 0 && (price < ctx.low * 0.985 || price > ctx.high * 1.015)) {
          msg = `Ese día ${inv().name} cotizó entre ${money(ctx.low)} y ${money(ctx.high)}. Revisa el precio o la fecha.`;
          hint.classList.add('is-error');
        } else hint.classList.remove('is-error');
        hint.textContent = msg;
      };
      const loadMarket = async () => {
        ctx = null;
        if (!linked()) { box.hidden = true; update(); return; }
        const date = dateInput.value || todayISO();
        const mine = ++ctxSeq;
        box.hidden = false;
        box.innerHTML = `<p class="tiny mkt-status">${icon('refresh', 14)} Consultando el precio de ${esc(inv().name)} el ${esc(fmtDate(date))}…</p>`;
        update();
        try {
          const { price } = await api('POST', 'api/market/price', { symbol: inv().quoteSymbol, date });
          if (mine !== ctxSeq) return;
          ctx = price;
          box.innerHTML = marketBoxHTML(ctx, { type: opType, price: ctx.close }, inv());
        } catch (err) {
          if (mine !== ctxSeq) return;
          const offlineMsg = /conect|conexión|respond/i.test(err.message || '');
          box.innerHTML = `<p class="mkt-status mkt-status--error">${icon('alert', 15)} ${esc(err.message)}</p>${offlineMsg ? '<p class="tiny">Puedes escribir el precio que te dio tu bróker: quedará como «pendiente de comprobar» y se contrastará con el mercado en la próxima actualización.</p>' : ''}`;
          if (offlineMsg) exec.checked = true;
        }
        update();
      };
      typeSeg.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-op-type]');
        if (!btn) return;
        opType = btn.dataset.opType;
        hiddenType.value = opType;
        for (const b of typeSeg.querySelectorAll('[data-op-type]')) b.classList.toggle('active', b === btn);
        if (ctx) box.innerHTML = marketBoxHTML(ctx, { type: opType, price: ctx.close }, inv());
        update();
      });
      qtySeg.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-qty]');
        if (!btn) return;
        qtyMode = btn.dataset.qty;
        for (const b of qtySeg.querySelectorAll('[data-qty]')) b.classList.toggle('active', b === btn);
        update();
      });
      select?.addEventListener('change', () => { selectedId = select.value; loadMarket(); });
      let dateTimer = null;
      dateInput.addEventListener('change', () => { clearTimeout(dateTimer); dateTimer = setTimeout(loadMarket, 250); });
      exec.addEventListener('change', update);
      dialog.querySelector('.sheet-body').addEventListener('input', (event) => { if (event.target !== dateInput) update(); });
      $('select[name="accountId"]').addEventListener('change', update);
      loadMarket();
    },
    async onSubmit(formData) {
      const investmentIdNow = fixed ? selectedId : formData.get('investmentId') || selectedId;
      const isLinked = marketLinked(investmentById(investmentIdNow));
      const exec = Boolean(formData.get('execution'));
      const fees = payloadNumber(formData.get('fees'));
      const price = payloadNumber(formData.get('price'));
      const amountMode = isLinked && qtyMode === 'amount';
      const amount = payloadNumber(formData.get('amount'));
      let units = payloadNumber(formData.get('units'));
      if (amountMode) {
        if (!(amount > 0)) throw new Error('Indica el importe de la operación.');
        units = price > 0 ? round(formData.get('type') === 'buy' ? (amount - fees) / price : (amount + fees) / price, 8) : 0;
      }
      const payload = {
        investmentId: investmentIdNow,
        type: formData.get('type'),
        units,
        price,
        fees,
        date: formData.get('date') || todayISO(),
        accountId: formData.get('accountId') || null,
        note: String(formData.get('note') || ''),
        priceMode: isLinked ? (exec ? 'execution' : 'market') : 'manual'
      };
      if (amountMode) Object.assign(payload, { amountMode: true, amount });
      if (payload.date > todayISO()) throw new Error('La fecha no puede ser futura.');
      if (!(payload.units > 0)) throw new Error(amountMode ? 'El importe no alcanza para ninguna unidad.' : 'Introduce al menos una unidad.');
      if (!isLinked && payload.price < 0) throw new Error('El precio no puede ser negativo.');
      if (op) await api('PATCH', `api/ops/${op.id}`, payload);
      else await api('POST', 'api/ops', payload);
      if (!isLinked && formData.get('syncPrice')) {
        await api('PATCH', `api/investments/${payload.investmentId}`, { currentPrice: payload.price, priceUpdatedAt: payload.date });
      }
      render();
      toast(op ? 'Operación actualizada' : `${payload.type === 'buy' ? 'Compra' : 'Venta'} registrada${isLinked ? (exec ? ' con tu precio de ejecución' : ' con el precio de cierre de ese día') : ''}`);
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({ title: 'Eliminar operación', message: 'Se recalcularán las unidades y el precio medio.', confirm: 'Eliminar' });
      if (!ok) return;
      await api('DELETE', `api/ops/${op.id}`);
      dialog.close();
      dialog.remove();
      render();
      toast('Operación eliminada');
    }
  });
}

/* ---------------------------------------------------------------- modal: historial */
function openHistoryModal(investmentId) {
  const holding = computeHoldings().find((h) => h.id === investmentId);
  if (!holding) return;
  const rows = [...holding.ops].reverse();
  openSheet({
    title: 'Historial de operaciones',
    subtitle: holding.name,
    wide: true,
    hideSubmit: true,
    body: `
      <div class="tx-summary">
        <div class="sum-chip"><span>Unidades</span><b>${esc(unitsLabel(holding.units))}</b></div>
        <div class="sum-chip"><span>Coste medio</span><b>${esc(money(holding.avg))}</b></div>
        <div class="sum-chip"><span>Valor actual</span><b>${esc(money(holding.value))}</b></div>
        <div class="sum-chip"><span>Realizado</span><b>${esc(money(holding.realized))}</b></div>
      </div>
      ${rows.length ? `<div class="history-list">${rows.map((op) => {
        const buy = op.type === 'buy';
        const total = round(op.units * op.price + (buy ? 1 : -1) * (op.fees || 0));
        const linkedInv = marketLinked(holding);
        const info = linkedInv ? entryContext(op) : null;
        const since = buy && linkedInv && op.price > 0 && holding.currentPrice > 0 ? (holding.currentPrice / op.price - 1) * 100 : null;
        const marketLine = info ? `<span class="op-context">
            ${priceModeTag(op, holding)}
            <span>Cierre de ese día ${esc(money(op.market.close))}${op.priceMode !== 'market' && Math.abs(info.dev) >= 0.05 ? ` · tu precio ${esc(pctLabel(info.dev, 1))}` : ''}</span>
            ${info.verdict ? `<span class="mkt-verdict mkt-verdict--${info.tone}">${esc(info.verdict)}</span>` : ''}
            ${since !== null ? `<span>Desde entonces ${changeChip(since)}</span>` : ''}
            ${info.outOfRange ? `<span class="op-alert">${icon('alert', 13)} Este precio no es posible: ese día cotizó entre ${esc(money(op.market.low))} y ${esc(money(op.market.high))}. <button type="button" class="link-btn" data-fix-op="${esc(op.id)}">Usar el precio de mercado</button></span>` : ''}
          </span>` : linkedInv && !op.market ? '<span class="op-context"><span class="tiny">Pendiente de comprobar con el mercado.</span></span>' : '';
        return `<div class="history-row history-row--rich">
          <span class="tx-icon" style="width:32px;height:32px;border-radius:10px;background:${buy ? 'var(--accent-soft)' : 'var(--danger-soft)'};color:${buy ? 'var(--accent-2)' : 'var(--danger)'}">${icon(buy ? 'arrowDown' : 'arrowUp', 15)}</span>
          <span class="tx-main">
            <span class="tx-title">${buy ? 'Compra' : 'Venta'} · ${esc(unitsLabel(op.units))} u.</span>
            <span class="tx-meta">${esc(dateLabel(op.date))} · ${esc(money(op.price))}/u.${op.fees ? ' · comisión ' + esc(money(op.fees)) : ''}${op.note ? ' · ' + esc(op.note) : ''}</span>
            ${marketLine}
          </span>
          <span class="side"><b>${esc(money(total))}</b>${op.accountId ? `<small>${esc(accountById(op.accountId)?.name || '')}</small>` : ''}</span>
          <span class="row-actions"><button type="button" class="icon-btn" data-edit-op="${esc(op.id)}" aria-label="Editar operación">${icon('edit', 16)}</button><button type="button" class="icon-btn danger" data-del-op="${esc(op.id)}" aria-label="Eliminar operación">${icon('trash', 16)}</button></span>
        </div>`;
      }).join('')}</div>` : `<div class="empty"><span class="empty-icon">${icon('list', 24)}</span><h3>Sin operaciones</h3><p>Añade una compra para empezar a calcular tu posición.</p></div>`}
    `,
    onMount(dialog, form, close) {
      form.querySelector('.sheet-body').addEventListener('click', async (event) => {
        const fixBtn = event.target.closest('[data-fix-op]');
        if (fixBtn) {
          try {
            await api('PATCH', `api/ops/${fixBtn.dataset.fixOp}`, { priceMode: 'market' });
            close();
            render();
            toast('Precio corregido con el cierre de ese día');
            openHistoryModal(investmentId);
          } catch (err) { toast(err.message, 'error'); }
          return;
        }
        const editBtn = event.target.closest('[data-edit-op]');
        if (editBtn) {
          const op = byId(store.data.ops, editBtn.dataset.editOp);
          if (op) { close(); openOpModal(op.investmentId, op); }
          return;
        }
        const btn = event.target.closest('[data-del-op]');
        if (!btn) return;
        const ok = await confirmDialog({
          title: 'Eliminar operación',
          message: 'Se recalcularán las unidades y el precio medio.',
          confirm: 'Eliminar'
        });
        if (!ok) return;
        try {
          await api('DELETE', `api/ops/${btn.dataset.delOp}`);
          close();
          render();
          toast('Operación eliminada');
          openHistoryModal(investmentId);
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }
  });
}

/* ---------------------------------------------------------------- modal: precio */
function openPriceModal(investment) {
  openSheet({
    title: 'Actualizar precio',
    subtitle: investment.name,
    submitLabel: 'Actualizar',
    body: `
      <div class="field"><span>Precio actual por unidad</span>
        <input name="price" type="number" min="0" step="any" inputmode="decimal" value="${esc(investment.currentPrice)}" required>
      </div>
      <p class="seg-note">Se usa para calcular el valor de la cartera. Última actualización: ${esc(dateLabel(investment.priceUpdatedAt))}.</p>
    `,
    async onSubmit(formData) {
      const price = payloadNumber(formData.get('price'));
      if (price < 0) throw new Error('El precio no puede ser negativo.');
      await api('PATCH', `api/investments/${investment.id}`, { currentPrice: price, priceUpdatedAt: todayISO() });
      render();
      toast('Precio actualizado');
    }
  });
}

/* ---------------------------------------------------------------- modal: PIN */
function openPinModal() {
  const enabled = Boolean(store.data.settings.pinEnabled);
  openSheet({
    title: enabled ? 'Gestionar PIN' : 'Crear un PIN',
    subtitle: `El PIN debe tener entre 4 y 8 dígitos y se guarda cifrado en ${WEB ? 'este navegador' : 'tu ordenador'}.`,
    submitLabel: enabled ? 'Guardar' : 'Activar PIN',
    body: `
      ${enabled ? `<div class="field"><span>PIN actual</span><input name="currentPin" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password"></div>` : ''}
      <div class="form-grid">
        <div class="field"><span>${enabled ? 'Nuevo PIN' : 'PIN'}</span><input name="newPin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>
        <div class="field"><span>Repite el PIN</span><input name="repeatPin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>
      </div>
      ${enabled ? '<p class="seg-note">Deja los dos campos vacíos y guarda para quitar el PIN.</p>' : (WEB ? '<p class="seg-note">En la versión web el PIN solo protege este navegador. Si lo olvidas, tendrás que borrar los datos del sitio.</p>' : '<p class="seg-note">Si olvidas el PIN, puedes quitarlo editando data/db.json (campo pinHash) con la app cerrada.</p>')}
    `,
    async onSubmit(formData) {
      const newPin = String(formData.get('newPin') || '');
      const repeatPin = String(formData.get('repeatPin') || '');
      const currentPin = String(formData.get('currentPin') || '');
      if (newPin !== repeatPin) throw new Error('Los PIN no coinciden.');
      if (newPin && !/^\d{4,8}$/.test(newPin)) throw new Error('El PIN debe tener entre 4 y 8 dígitos.');
      if (!newPin && enabled) {
        const ok = await confirmDialog({
          title: 'Quitar el PIN',
          message: WEB ? 'La app quedará accesible para cualquiera que use este navegador.' : 'La app quedará accesible para cualquiera que esté en tu red local.',
          confirm: 'Quitar PIN'
        });
        if (!ok) return false;
      }
      await api('POST', 'api/pin', { currentPin, newPin });
      render();
      toast(enabled && !newPin ? 'PIN desactivado' : 'PIN configurado');
    }
  });
}

/* ---------------------------------------------------------------- exportar / importar */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function exportJSON() {
  const data = store.data;
  const payload = {
    app: 'Mi Cartera',
    version: store.session?.version || '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      settings: {
        currency: data.settings.currency,
        locale: data.settings.locale,
        theme: data.settings.theme
      },
      accounts: data.accounts,
      categories: data.categories,
      transactions: data.transactions,
      investments: data.investments,
      ops: data.ops,
      recurring: data.recurring || [],
      goals: data.goals || []
    }
  };
  downloadFile(`mi-cartera-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  toast('Copia exportada');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function csvText(rows) {
  return '\ufeff' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}
function decimalComma(value) {
  return String(round(Number(value) || 0, 2)).replace('.', ',');
}

function exportTransactionsCSV() {
  const rows = [['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Cuenta destino', 'Importe', 'Nota']];
  const list = [...store.data.transactions].sort((a, b) => a.date.localeCompare(b.date));
  for (const tx of list) {
    rows.push([
      tx.date,
      TX_LABELS[tx.type] || tx.type,
      tx.type === 'transfer' ? '' : (categoryById(tx.categoryId)?.name || ''),
      accountById(tx.accountId)?.name || '',
      tx.type === 'transfer' ? (accountById(tx.toAccountId)?.name || '') : '',
      decimalComma(tx.type === 'expense' ? -tx.amount : tx.amount),
      tx.note || ''
    ]);
  }
  downloadFile(`mi-cartera-movimientos-${todayISO()}.csv`, csvText(rows), 'text/csv;charset=utf-8');
  toast('Movimientos exportados');
}

function exportPortfolioCSV() {
  const rows = [['Nombre', 'Símbolo', 'Tipo', 'Unidades', 'Precio medio', 'Precio actual', 'Valor', 'Ganancia latente']];
  for (const h of computeHoldings()) {
    rows.push([
      h.name, h.symbol || '', INVEST_TYPES[h.type]?.label || 'Otro',
      unitsLabel(h.units), decimalComma(h.avg), decimalComma(h.currentPrice),
      decimalComma(h.value), decimalComma(h.pnl)
    ]);
  }
  downloadFile(`mi-cartera-cartera-${todayISO()}.csv`, csvText(rows), 'text/csv;charset=utf-8');
  toast('Cartera exportada');
}

async function importFile(file) {
  if (!file) return;
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const data = parsed?.data?.accounts ? parsed.data : parsed;
  if (!data || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
    throw new Error('El archivo no parece una copia de Mi Cartera.');
  }
  const ok = await confirmDialog({
    title: 'Importar copia',
    message: `Se reemplazarán tus datos actuales por ${data.transactions.length} movimientos y ${data.accounts.length} cuentas. ¿Continuar?`,
    confirm: 'Importar',
    danger: false
  });
  if (!ok) return;
  const result = await api('POST', 'api/import', { data });
  render();
  toast(`Copia importada: ${result.imported?.transactions ?? data.transactions.length} movimientos`);
}

async function loadDemoData() {
  const ok = await confirmDialog({
    title: 'Cargar datos de ejemplo',
    message: 'Se reemplazarán todos los datos actuales (incluidas cuentas y categorías) por datos ficticios. Tus copias de seguridad no se tocan.',
    confirm: 'Cargar demo',
    danger: false
  });
  if (!ok) return;
  await api('POST', 'api/demo');
  ui.budgetMonth = monthKey(todayISO());
  ui.filters = { q: '', type: 'all', category: '', account: '', month: '' };
  render();
  toast('Datos de ejemplo cargados');
  refreshPricesNow({ silent: true }).catch(() => {});
}

async function resetData() {
  const ok = await confirmDialog({
    title: 'Empezar de cero',
    message: 'Se borrarán todos los movimientos, recurrentes, objetivos, inversiones, operaciones y cuentas. Se mantienen tus ajustes y tu PIN. Esta acción no se puede deshacer.',
    confirm: 'Borrar todo'
  });
  if (!ok) return;
  await api('POST', 'api/reset');
  ui.budgetMonth = monthKey(todayISO());
  ui.filters = { q: '', type: 'all', category: '', account: '', month: '' };
  render();
  toast('Datos borrados. Listo para empezar.');
}

/* ---------------------------------------------------------------- acciones */
document.addEventListener('submit', async (event) => {
  const finnhub = event.target.closest?.('[data-finnhub-form]');
  if (finnhub) {
    event.preventDefault();
    try {
      const data = await api('PATCH', 'api/settings', { finnhubKey: finnhub.querySelector('[name="finnhubKey"]').value.trim() });
      if (data?.settings) store.data.settings = data.settings;
      syncLive();
      render();
      toast(store.data.settings.finnhubKey ? 'Clave guardada. Las acciones de EE. UU. irán en directo con Finnhub.' : 'Clave quitada. Se usará Yahoo Finance de respaldo.');
    } catch (err) { toast(err.message, 'error'); }
    return;
  }
  const form = event.target.closest?.('[data-proxy-form]');
  if (!form) return;
  event.preventDefault();
  try {
    const data = await api('PATCH', 'api/settings', { marketProxy: form.querySelector('[name="marketProxy"]').value.trim() });
    if (data?.settings) store.data.settings = data.settings;
    toast('Intermediario guardado. Prueba con Actualizar.');
  } catch (err) { toast(err.message, 'error'); }
});

document.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const { action } = el.dataset;
  try {
    switch (action) {
      case 'retry':
        location.reload();
        break;
      case 'theme-toggle':
        toggleTheme();
        break;
      case 'set-theme':
        setTheme(el.dataset.theme);
        render();
        break;
      case 'new-tx':
        openTransactionModal(null, el.dataset.type || 'expense');
        break;
      case 'edit-tx': {
        const tx = byId(store.data.transactions, el.dataset.id);
        if (tx) openTransactionModal(tx);
        break;
      }
      case 'new-account':
        openAccountModal();
        break;
      case 'edit-account': {
        const account = accountById(el.dataset.id);
        if (account) openAccountModal(account);
        break;
      }
      case 'new-category':
        openCategoryModal(null, el.dataset.kind || 'expense');
        break;
      case 'edit-category': {
        const category = categoryById(el.dataset.id);
        if (category) openCategoryModal(category);
        break;
      }
      case 'edit-budgets':
        openBudgetModal();
        break;
      case 'new-investment':
        openInvestmentModal();
        break;
      case 'edit-investment': {
        const investment = investmentById(el.dataset.id);
        if (investment) openInvestmentModal(investment);
        break;
      }
      case 'new-op':
        openOpModal(el.dataset.id || null);
        break;
      case 'edit-op': {
        const op = byId(store.data.ops, el.dataset.id);
        if (op) openOpModal(op.investmentId, op);
        break;
      }
      case 'new-recurring':
        openRecurringModal(null, { type: el.dataset.type || 'expense' });
        break;
      case 'edit-recurring': {
        const rule = byId(store.data.recurring || [], el.dataset.id);
        if (rule) openRecurringModal(rule);
        break;
      }
      case 'new-goal':
        openGoalModal();
        break;
      case 'edit-goal': {
        const goal = byId(store.data.goals || [], el.dataset.id);
        if (goal) openGoalModal(goal);
        break;
      }
      case 'goal-add':
      case 'goal-withdraw': {
        const goal = byId(store.data.goals || [], el.dataset.id);
        if (goal) openGoalAmountModal(goal, action === 'goal-add' ? 'add' : 'withdraw');
        break;
      }
      case 'report-year':
        ui.reportYear = (Number(ui.reportYear) || new Date().getFullYear()) + (Number(el.dataset.delta) || 0);
        render();
        break;
      case 'export-report':
        exportReportCSV();
        break;
      case 'history':
        openHistoryModal(el.dataset.id);
        break;
      case 'update-price': {
        const investment = investmentById(el.dataset.id);
        if (investment && marketLinked(investment)) {
          el.disabled = true;
          try { await refreshPricesNow({ ids: [investment.id] }); } finally { el.disabled = false; }
        } else if (investment) openPriceModal(investment);
        break;
      }
      case 'pin':
        openPinModal();
        break;
      case 'new-loan':
        openLoanModal();
        break;
      case 'edit-loan': {
        const loan = byId(store.data.loans || [], el.dataset.id);
        if (loan) openLoanModal(loan);
        break;
      }
      case 'loan-table': {
        const loan = byId(store.data.loans || [], el.dataset.id);
        if (loan) openLoanTableModal(loan);
        break;
      }
      case 'loan-extra': {
        const loan = byId(store.data.loans || [], el.dataset.id);
        if (loan) openLoanExtraModal(loan);
        break;
      }
      case 'refresh-prices':
        el.disabled = true;
        try { await refreshPricesNow(); } finally { el.disabled = false; }
        break;
      case 'auto-prices':
        await api('PATCH', 'api/settings', { autoPrices: el.dataset.value === 'on' });
        render();
        toast(el.dataset.value === 'on' ? 'Precios automáticos activados' : 'Precios automáticos desactivados');
        if (el.dataset.value === 'on') maybeAutoRefreshPrices();
        break;
      case 'phone':
        await openPhoneModal();
        break;
      case 'backups':
        await openBackupsModal();
        break;
      case 'sync-export':
        openSyncExportModal();
        break;
      case 'sync-import':
        document.getElementById('syncFile')?.click();
        break;
      case 'force-update':
        await forceUpdate();
        break;
      case 'logout':
        await fetch('api/logout', { method: 'POST', credentials: 'same-origin' });
        store.data = null;
        showLock();
        break;
      case 'export-json':
        exportJSON();
        break;
      case 'export-csv':
        exportTransactionsCSV();
        break;
      case 'export-portfolio':
        exportPortfolioCSV();
        break;
      case 'import-json':
        document.getElementById('importFile')?.click();
        break;
      case 'demo':
        await loadDemoData();
        break;
      case 'reset':
        await resetData();
        break;
      case 'budget-month': {
        const current = /^\d{4}-\d{2}$/.test(ui.budgetMonth) ? ui.budgetMonth : monthKey(todayISO());
        ui.budgetMonth = addMonths(current, Number(el.dataset.delta) || 0);
        render();
        break;
      }
      case 'budget-today':
        ui.budgetMonth = monthKey(todayISO());
        render();
        break;
      case 'clear-filters':
        ui.filters = { q: '', type: 'all', category: '', account: '', month: '' };
        render();
        break;
      default:
        await handleBizAction(action, el);
        break;
    }
  } catch (err) {
    toast(err.message, 'error');
  }
});

let searchTimer;
document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.id === 'txSearch') {
    ui.filters.q = target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (store.view === 'movimientos' && document.getElementById('txList')) renderTxList();
    }, 140);
  }
  if (target.id === 'txMonth') {
    ui.filters.month = target.value;
    if (store.view === 'movimientos' && document.getElementById('txList')) renderTxList();
  }
});

document.addEventListener('change', async (event) => {
  const target = event.target;
  try {
    if (target.id === 'txTypeFilter') { ui.filters.type = target.value; renderTxList(); }
    if (target.id === 'txCategoryFilter') { ui.filters.category = target.value; renderTxList(); }
    if (target.id === 'txAccountFilter') { ui.filters.account = target.value; renderTxList(); }
    if (target.id === 'txMonth') { ui.filters.month = target.value; renderTxList(); }
    if (target.id === 'currencySelect') {
      const previous = store.data.settings.currency;
      if (target.value === previous) return;
      const ok = await confirmDialog({
        title: 'Cambiar moneda',
        message: 'Solo cambiará el símbolo que se muestra. Los importes guardados no se convierten.',
        confirm: 'Cambiar',
        danger: false
      });
      if (!ok) { target.value = previous; return; }
      await api('PATCH', 'api/settings', { currency: target.value });
      render();
      toast(`Moneda cambiada a ${target.value}`);
    }
    if (target.id === 'syncFile') {
      const file = target.files?.[0];
      target.value = '';
      if (file) openSyncImportModal(file);
    }
    if (target.id === 'importFile') {
      const file = target.files?.[0];
      target.value = '';
      if (file) await importFile(file);
    }
  } catch (err) {
    toast(err.message, 'error');
  }
});

/* ---------------------------------------------------------------- préstamos: cálculos */
const LOAN_TYPES = {
  mortgage: { label: 'Hipoteca', icon: 'home', category: 'Vivienda' },
  personal: { label: 'Préstamo personal', icon: 'card', category: 'Otros gastos' },
  car: { label: 'Coche', icon: 'car', category: 'Transporte' },
  student: { label: 'Estudios', icon: 'graduation', category: 'Educación' },
  other: { label: 'Otro', icon: 'file', category: 'Otros gastos' }
};
function loanPayment(balance, monthlyRate, months) {
  if (months <= 0) return balance;
  if (!monthlyRate) return balance / months;
  return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}
function addMonthsISO(iso, n, anchorDay) {
  const d = parseISO(iso);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const max = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(anchorDay || d.getDate(), max));
  return isoDate(target);
}
/** Cuadro de amortización (sistema francés) con amortizaciones anticipadas. */
function loanSchedule(loan, extras = loan.extraPayments || []) {
  const r = (Number(loan.annualRate) || 0) / 1200;
  const term = Math.max(1, Math.round(Number(loan.termMonths) || 1));
  const anchor = parseISO(loan.startDate).getDate();
  const queue = [...extras].filter((e) => Number(e.amount) > 0).sort((a, b) => a.date.localeCompare(b.date));
  let balance = Number(loan.principal) || 0;
  let payment = loanPayment(balance, r, term);
  let qi = 0;
  const rows = [];
  for (let i = 0; i < term && balance > 0.005; i += 1) {
    const date = addMonthsISO(loan.startDate, i, anchor);
    let extra = 0;
    while (qi < queue.length && queue[qi].date <= date && balance > 0.005) {
      const e = queue[qi++];
      const amount = Math.min(Number(e.amount), balance);
      balance -= amount;
      extra += amount;
      if (e.mode === 'payment' && balance > 0.005) payment = loanPayment(balance, r, term - i);
    }
    if (balance <= 0.005) {
      rows.push({ n: i + 1, date, payment: 0, interest: 0, capital: 0, extra, balance: 0 });
      balance = 0;
      break;
    }
    const interest = balance * r;
    let capital = payment - interest;
    if (capital > balance || i === term - 1) capital = balance;
    balance -= capital;
    rows.push({ n: i + 1, date, payment: capital + interest, interest, capital, extra, balance: Math.max(0, balance) });
  }
  const totalInterest = sum(rows, (x) => x.interest);
  const last = rows[rows.length - 1];
  return { rows, totalInterest, endDate: last?.date || loan.startDate, months: rows.filter((x) => x.payment > 0).length, initialPayment: loanPayment(Number(loan.principal) || 0, r, term) };
}
function loanStatus(loan, asOf = todayISO()) {
  const plan = loanSchedule(loan);
  const paidRows = plan.rows.filter((x) => x.date <= asOf);
  const extrasPaid = sum((loan.extraPayments || []).filter((e) => e.date <= asOf), (e) => e.amount);
  const capitalPaid = sum(paidRows, (x) => x.capital);
  const pending = round(Math.max(0, (Number(loan.principal) || 0) - capitalPaid - extrasPaid));
  const interestPaid = round(sum(paidRows, (x) => x.interest));
  const next = plan.rows.find((x) => x.date > asOf && x.payment > 0) || null;
  const remainingRows = plan.rows.filter((x) => x.date > asOf && x.payment > 0);
  const started = asOf >= addMonthsISO(loan.startDate, -1, parseISO(loan.startDate).getDate());
  return {
    plan,
    pending: started ? pending : 0,
    interestPaid,
    interestLeft: round(plan.totalInterest - interestPaid),
    next,
    payment: next ? round(next.payment) : 0,
    remaining: remainingRows.length,
    paidCount: paidRows.filter((x) => x.payment > 0).length,
    done: !next && pending <= 0.005,
    pct: loan.principal > 0 ? 1 - pending / loan.principal : 1
  };
}
function totalDebt(asOf = todayISO()) {
  return round(sum(store.data?.loans || [], (l) => loanStatus(l, asOf).pending));
}
function monthsText(n) {
  const years = Math.floor(n / 12);
  const months = n % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months || !years) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  return parts.join(' y ');
}
function monthYear(iso) {
  return parseISO(iso).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
}

/* ---------------------------------------------------------------- vista: préstamos */
function loanCard(loan) {
  const st = loanStatus(loan);
  const meta = LOAN_TYPES[loan.type] || LOAN_TYPES.other;
  const pct = clamp(st.pct, 0, 1);
  return `<article class="card goal loan" style="--c:${tone(loan.color || '#64748b')}">
    <div class="goal-head">
      <span class="goal-icon" style="background:var(--surface-2)">${glyphSVG(meta.icon, 22)}</span>
      <div class="goal-title"><h3>${esc(loan.name)}</h3><span>${esc(meta.label)} · TIN ${esc(String(loan.annualRate).replace('.', ','))} %</span></div>
      <button class="icon-btn" type="button" data-action="edit-loan" data-id="${esc(loan.id)}" aria-label="Editar ${esc(loan.name)}">${icon('edit', 17)}</button>
    </div>
    <div class="loan-label">Pendiente</div>
    <div class="goal-amounts"><b>${esc(money(st.pending, { decimals: 0 }))}</b><span>de ${esc(money(loan.principal, { decimals: 0 }))}</span><em>${esc(percent(pct, 0))} pagado</em></div>
    <div class="progress goal-bar${st.done ? ' done' : ''}"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
    <dl class="loan-facts">
      <div><dt>Cuota</dt><dd>${st.done ? '—' : esc(money(st.payment))}</dd></div>
      <div><dt>Próximo pago</dt><dd>${st.next ? esc(dateLabel(st.next.date)) : 'Pagado'}</dd></div>
      <div><dt>Termina</dt><dd>${esc(monthYear(st.plan.endDate))}${st.remaining ? ` <small>${esc(monthsText(st.remaining))}</small>` : ''}</dd></div>
      <div><dt>Intereses pendientes</dt><dd>${esc(money(st.interestLeft, { decimals: 0 }))}</dd></div>
    </dl>
    ${loan.recurringId ? `<p class="goal-note">${icon('repeat', 13)} La cuota se apunta sola cada mes.</p>` : ''}
    <div class="holding-actions">
      <button class="btn btn-sm btn-ghost" type="button" data-action="loan-table" data-id="${esc(loan.id)}">${icon('list', 14)} Cuadro</button>
      ${st.done ? '' : `<button class="btn btn-sm btn-ghost" type="button" data-action="loan-extra" data-id="${esc(loan.id)}">${icon('sparkles', 14)} Amortizar</button>`}
    </div>
  </article>`;
}
function viewPrestamos() {
  const loans = [...(store.data.loans || [])];
  const states = loans.map((l) => ({ loan: l, st: loanStatus(l) })).sort((a, b) => b.st.pending - a.st.pending);
  const debt = round(sum(states, (x) => x.st.pending));
  const monthly = round(sum(states, (x) => x.st.payment));
  const interestLeft = round(sum(states, (x) => x.st.interestLeft));
  const income = monthStats(addMonths(monthKey(todayISO()), -1)).income || monthStats(monthKey(todayISO())).income;
  const effort = income > 0 ? monthly / income : 0;
  return `
  <div class="viewhead">
    <div><h1>Préstamos</h1><p>Hipotecas y préstamos: cuánto debes, cuánto pagas de intereses y cuándo terminas.</p></div>
    <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-loan">${icon('plus', 16)} Nuevo préstamo</button></div>
  </div>
  ${loans.length ? `
  <div class="statgrid">
    ${statCard('Deuda pendiente', bigMoney(debt), `<span>${loans.length} ${loans.length === 1 ? 'préstamo' : 'préstamos'} · se resta de tu patrimonio</span>`, 'expense', 'bank')}
    ${statCard('Cuotas al mes', bigMoney(monthly), income > 0 ? `<span>${esc(percent(effort, 0))} de tus ingresos${effort > 0.35 ? ' · por encima del 35 % recomendado' : ''}</span>` : '<span>Suma de las próximas cuotas</span>', 'net', 'calendar')}
    ${statCard('Intereses por pagar', bigMoney(interestLeft), '<span>Lo que te costará la deuda si no amortizas</span>', 'income', 'coins')}
  </div>
  <div class="goal-grid">${states.map((x) => loanCard(x.loan)).join('')}</div>
  <p class="tiny" style="text-align:center">Cálculo con el sistema francés (cuota constante), el habitual en España. Si tu banco usa otro redondeo puede haber diferencias de céntimos.</p>` : `<section class="card"><div class="empty">
    <span class="empty-icon">${icon('bank', 24)}</span>
    <h3>Sin préstamos ni hipotecas</h3>
    <p>Añade tu hipoteca o un préstamo para ver el capital pendiente, los intereses que te quedan y cuánto ahorras si amortizas antes.</p>
    <button class="btn btn-primary btn-sm" type="button" data-action="new-loan">${icon('plus', 14)} Añadir préstamo</button>
  </div></section>`}`;
}

/* ---------------------------------------------------------------- modal: préstamo */
function expenseCategoryOptions(selected) {
  return store.data.categories.filter((c) => c.kind === 'expense')
    .map((c) => `<option value="${esc(c.id)}"${c.id === selected ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
}
function accountOptions(selected, allowEmpty = false) {
  return (allowEmpty ? '<option value="">Sin cuenta</option>' : '') + store.data.accounts
    .map((a) => `<option value="${esc(a.id)}"${a.id === selected ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
}
function defaultLoanCategory(type) {
  const name = (LOAN_TYPES[type] || LOAN_TYPES.other).category;
  return store.data.categories.find((c) => c.kind === 'expense' && c.name === name)?.id
    || store.data.categories.find((c) => c.kind === 'expense')?.id || '';
}
/** Mantiene la cuota recurrente alineada con el cuadro de amortización. */
async function syncLoanRecurring(loanId) {
  const loan = byId(store.data.loans || [], loanId);
  if (!loan?.recurringId) return;
  const rule = byId(store.data.recurring || [], loan.recurringId);
  if (!rule) return;
  const st = loanStatus(loan);
  const patch = {};
  if (st.next && Math.abs(round(st.next.payment) - rule.amount) >= 0.01) patch.amount = round(st.next.payment);
  if (st.plan.endDate !== rule.endDate && st.plan.endDate >= rule.startDate) patch.endDate = st.plan.endDate;
  if (!st.next) patch.active = false;
  if (Object.keys(patch).length) await api('PATCH', `api/recurring/${rule.id}`, patch);
}
async function createLoanRecurring(loan, accountId, categoryId) {
  const st = loanStatus(loan);
  if (!st.next) return;
  const before = new Set((store.data.recurring || []).map((r) => r.id));
  const data = await api('POST', 'api/recurring', {
    type: 'expense', amount: round(st.next.payment), accountId, categoryId,
    note: `Cuota ${loan.name}`, frequency: 'monthly', startDate: st.next.date, endDate: st.plan.endDate
  });
  const created = (data.recurring || []).find((r) => !before.has(r.id));
  if (created) await api('PATCH', `api/loans/${loan.id}`, { recurringId: created.id });
}
function openLoanModal(loan = null) {
  const type = loan?.type || 'mortgage';
  const hasRule = Boolean(loan?.recurringId);
  openSheet({
    title: loan ? 'Editar préstamo' : 'Nuevo préstamo',
    subtitle: 'Con estos datos calculamos la cuota, los intereses y el capital pendiente.',
    submitLabel: loan ? 'Guardar cambios' : 'Añadir préstamo',
    dangerLabel: loan ? 'Eliminar' : '',
    body: `
      <div class="form-grid">
        <div class="field"><span>Nombre</span><input name="name" maxlength="60" placeholder="Ej. Hipoteca piso" value="${esc(loan?.name || '')}" required></div>
        <div class="field"><span>Tipo</span><select name="type">
          ${Object.entries(LOAN_TYPES).map(([value, meta]) => `<option value="${value}"${type === value ? ' selected' : ''}>${esc(meta.label)}</option>`).join('')}
        </select></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Capital prestado</span><input name="principal" type="number" min="1" step="0.01" inputmode="decimal" placeholder="150000" value="${loan ? esc(loan.principal) : ''}" required></div>
        <div class="field"><span>Interés anual (TIN %)</span><input name="annualRate" type="number" min="0" max="60" step="0.001" inputmode="decimal" placeholder="2,9" value="${loan ? esc(loan.annualRate) : ''}" required></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Plazo (años)</span><input name="years" type="number" min="0.1" max="50" step="0.0834" inputmode="decimal" placeholder="25" value="${loan ? esc(round(loan.termMonths / 12, 2)) : ''}" required></div>
        <div class="field"><span>Primera cuota</span><input name="startDate" type="date" value="${esc(loan?.startDate || todayISO())}" required></div>
      </div>
      <div class="op-total" data-loan-preview></div>
      ${hasRule ? '<p class="seg-note">La cuota mensual ya está en Recurrentes y se ajusta sola si cambias los datos.</p>' : `
      <label class="checkbox"><input type="checkbox" name="makeRule" value="1"${loan ? '' : ' checked'} data-make-rule> Apuntar la cuota cada mes en Recurrentes</label>
      <div class="form-grid" data-rule-fields>
        <div class="field"><span>Se paga desde</span><select name="accountId">${accountOptions(loan?.accountId || store.data.accounts[0]?.id)}</select></div>
        <div class="field"><span>Categoría</span><select name="categoryId">${expenseCategoryOptions(loan?.categoryId || defaultLoanCategory(type))}</select></div>
      </div>`}
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="300" placeholder="Ej. Banco, tipo fijo" value="${esc(loan?.note || '')}"></div>
    `,
    onMount(dialog, form) {
      const preview = dialog.querySelector('[data-loan-preview]');
      const update = () => {
        const principal = payloadNumber(form.principal.value);
        const rate = payloadNumber(form.annualRate.value);
        const months = Math.round(payloadNumber(form.years.value) * 12);
        if (!(principal > 0) || !(months > 0) || !form.startDate.value) { preview.innerHTML = ''; return; }
        const plan = loanSchedule({ principal, annualRate: rate, termMonths: months, startDate: form.startDate.value, extraPayments: loan?.extraPayments || [] });
        preview.innerHTML = `<span>Cuota</span><b>${esc(money(plan.initialPayment))}</b><span>· ${esc(monthsText(months))}</span><small>Intereses totales ${esc(money(plan.totalInterest))} · terminas en ${esc(monthYear(plan.endDate))}</small>`;
      };
      form.addEventListener('input', update);
      update();
      const toggle = dialog.querySelector('[data-make-rule]');
      const fields = dialog.querySelector('[data-rule-fields]');
      const sync = () => { if (fields) fields.hidden = !toggle.checked; };
      toggle?.addEventListener('change', sync);
      sync();
      dialog.querySelector('select[name="type"]').addEventListener('change', (e) => {
        if (form.categoryId) form.categoryId.value = defaultLoanCategory(e.target.value);
      });
    },
    async onSubmit(formData) {
      const payload = {
        name: String(formData.get('name') || '').trim(),
        type: formData.get('type'),
        principal: payloadNumber(formData.get('principal')),
        annualRate: payloadNumber(formData.get('annualRate')),
        termMonths: Math.round(payloadNumber(formData.get('years')) * 12),
        startDate: formData.get('startDate'),
        note: String(formData.get('note') || '')
      };
      if (!payload.name) throw new Error('Ponle un nombre al préstamo.');
      if (!(payload.principal > 0)) throw new Error('El capital debe ser mayor que cero.');
      if (!(payload.termMonths >= 1)) throw new Error('El plazo debe ser de al menos un mes.');
      const makeRule = !hasRule && formData.get('makeRule') === '1';
      if (formData.get('accountId')) payload.accountId = formData.get('accountId');
      if (formData.get('categoryId')) payload.categoryId = formData.get('categoryId');
      let saved;
      if (loan) {
        await api('PATCH', `api/loans/${loan.id}`, payload);
        saved = byId(store.data.loans, loan.id);
        await syncLoanRecurring(loan.id);
      } else {
        const before = new Set((store.data.loans || []).map((l) => l.id));
        const data = await api('POST', 'api/loans', payload);
        saved = (data.loans || []).find((l) => !before.has(l.id));
      }
      if (saved && makeRule) await createLoanRecurring(saved, payload.accountId, payload.categoryId);
      render();
      toast(loan ? 'Préstamo actualizado' : 'Préstamo añadido');
    },
    async onDanger(dialog) {
      const rule = loan.recurringId ? byId(store.data.recurring || [], loan.recurringId) : null;
      const ok = await confirmDialog({
        title: 'Eliminar préstamo',
        message: rule ? 'También se eliminará su cuota de Recurrentes (los movimientos ya apuntados se conservan).' : 'Esta acción no se puede deshacer.',
        confirm: 'Eliminar'
      });
      if (!ok) return;
      await api('DELETE', `api/loans/${loan.id}`);
      if (rule) await api('DELETE', `api/recurring/${rule.id}`).catch(() => {});
      dialog.close();
      dialog.remove();
      render();
      toast('Préstamo eliminado');
    }
  });
}

function openLoanTableModal(loan) {
  const st = loanStatus(loan);
  const today = todayISO();
  const rows = st.plan.rows;
  const nextIdx = rows.findIndex((x) => x.date > today);
  const years = new Map();
  for (const x of rows) {
    const y = x.date.slice(0, 4);
    const acc = years.get(y) || { interest: 0, capital: 0, extra: 0, balance: 0 };
    acc.interest += x.interest; acc.capital += x.capital; acc.extra += x.extra; acc.balance = x.balance;
    years.set(y, acc);
  }
  openSheet({
    title: 'Cuadro de amortización',
    subtitle: `${loan.name} · ${money(loan.principal, { decimals: 0 })} al ${String(loan.annualRate).replace('.', ',')} % en ${monthsText(loan.termMonths)}`,
    wide: true,
    hideSubmit: true,
    secondaryLabel: 'Exportar CSV',
    secondaryIcon: 'download',
    body: `
      <div class="op-total"><span>Pendiente hoy</span><b>${esc(money(st.pending))}</b><span>· intereses pagados ${esc(money(st.interestPaid))} · por pagar ${esc(money(st.interestLeft))}</span><small>${st.paidCount} de ${st.plan.months} cuotas pagadas · última cuota en ${esc(monthYear(st.plan.endDate))}</small></div>
      <div class="seg" role="group" aria-label="Vista del cuadro" style="align-self:flex-start">
        <button type="button" class="active" data-tab="years">Por años</button>
        <button type="button" data-tab="months">Por meses</button>
      </div>
      <div class="table-wrap" data-pane="years"><table class="report-table">
        <thead><tr><th>Año</th><th>Intereses</th><th>Capital</th><th>Anticipado</th><th>Pendiente</th></tr></thead>
        <tbody>${[...years.entries()].map(([y, v]) => `<tr class="${y === today.slice(0, 4) ? 'is-current' : y > today.slice(0, 4) ? 'is-future' : ''}"><td>${y}</td><td>${esc(money(v.interest))}</td><td>${esc(money(v.capital))}</td><td>${v.extra ? esc(money(v.extra)) : '—'}</td><td>${esc(money(v.balance))}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="table-wrap" data-pane="months" hidden><table class="report-table">
        <thead><tr><th>Cuota</th><th>Fecha</th><th>Pago</th><th>Intereses</th><th>Capital</th><th>Pendiente</th></tr></thead>
        <tbody>${rows.map((x, i) => `<tr class="${i === nextIdx ? 'is-next' : x.date > today ? 'is-future' : ''}"><td>${x.n}</td><td>${esc(dateLabel(x.date))}</td><td>${esc(money(x.payment + x.extra))}</td><td>${esc(money(x.interest))}</td><td>${esc(money(x.capital + x.extra))}</td><td>${esc(money(x.balance))}</td></tr>`).join('')}</tbody>
      </table></div>`,
    onMount(dialog) {
      dialog.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => {
        dialog.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        dialog.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== btn.dataset.tab; });
      }));
    },
    onSecondary() {
      const head = ['Cuota', 'Fecha', 'Pago', 'Intereses', 'Capital', 'Amortización anticipada', 'Pendiente'];
      const body = rows.map((x) => [x.n, x.date, decimalComma(round(x.payment)), decimalComma(round(x.interest)), decimalComma(round(x.capital)), decimalComma(round(x.extra)), decimalComma(round(x.balance))]);
      downloadFile(`amortizacion-${loan.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`, csvText([head, ...body]), 'text/csv;charset=utf-8');
    }
  });
}

function openLoanExtraModal(loan) {
  const st = loanStatus(loan);
  const base = st.plan;
  openSheet({
    title: 'Amortizar anticipadamente',
    subtitle: `${loan.name} · pendiente ${money(st.pending)}`,
    submitLabel: 'Registrar amortización',
    body: `
      <div class="form-grid">
        <div class="field"><span>Importe</span><input name="amount" type="number" min="1" step="0.01" inputmode="decimal" placeholder="5000" required></div>
        <div class="field"><span>Fecha</span><input name="date" type="date" value="${esc(todayISO())}" required></div>
      </div>
      <div class="seg seg--full" role="group" aria-label="Qué reducir">
        <button type="button" data-mode="term" class="active">Reducir plazo</button>
        <button type="button" data-mode="payment">Reducir cuota</button>
      </div>
      <input type="hidden" name="mode" value="term">
      <div class="op-total" data-sim><span>Escribe un importe para ver cuánto ahorras.</span></div>
      <label class="checkbox"><input type="checkbox" name="asTx" value="1" checked data-as-tx> Apuntarlo como gasto en una cuenta</label>
      <div class="form-grid" data-tx-fields>
        <div class="field"><span>Cuenta</span><select name="accountId">${accountOptions(loan.accountId || store.data.accounts[0]?.id)}</select></div>
        <div class="field"><span>Categoría</span><select name="categoryId">${expenseCategoryOptions(loan.categoryId || defaultLoanCategory(loan.type))}</select></div>
      </div>
      <p class="seg-note">Reducir plazo suele ahorrar más intereses; reducir cuota libera dinero cada mes. Revisa si tu banco cobra comisión por amortizar.</p>
    `,
    onMount(dialog, form) {
      const out = dialog.querySelector('[data-sim]');
      dialog.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
        form.mode.value = btn.dataset.mode;
        dialog.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('active', x === btn));
        update();
      }));
      const update = () => {
        const amount = Math.min(payloadNumber(form.amount.value), st.pending);
        const mode = form.mode.value;
        const date = form.date.value || todayISO();
        if (!(amount > 0)) { out.innerHTML = '<span>Escribe un importe para ver cuánto ahorras.</span>'; return; }
        const sim = loanSchedule(loan, [...(loan.extraPayments || []), { date, amount, mode }]);
        const saved = base.totalInterest - sim.totalInterest;
        const monthsLess = base.months - sim.months;
        const nextSim = sim.rows.find((x) => x.date > date && x.payment > 0);
        const detail = mode === 'term'
          ? (monthsLess > 0 ? `terminas ${monthsText(monthsLess)} antes (${monthYear(sim.endDate)})` : 'mismo plazo')
          : (nextSim ? `tu cuota baja a ${money(nextSim.payment)} (antes ${money(st.payment)})` : 'liquidas el préstamo');
        out.innerHTML = `<span>Ahorras</span><b>${esc(money(Math.max(0, saved)))}</b><span>en intereses</span><small>${esc(detail.charAt(0).toUpperCase() + detail.slice(1))}.</small>`;
      };
      form.addEventListener('input', update);
      form.addEventListener('change', update);
      update();
      const toggle = dialog.querySelector('[data-as-tx]');
      const fields = dialog.querySelector('[data-tx-fields]');
      toggle.addEventListener('change', () => { fields.hidden = !toggle.checked; });
    },
    async onSubmit(formData) {
      const amount = round(Math.min(payloadNumber(formData.get('amount')), st.pending));
      if (!(amount > 0)) throw new Error('El importe debe ser mayor que cero.');
      const date = formData.get('date') || todayISO();
      const mode = formData.get('mode') === 'payment' ? 'payment' : 'term';
      const extraPayments = [...(loan.extraPayments || []), { date, amount, mode }];
      await api('PATCH', `api/loans/${loan.id}`, { extraPayments });
      await syncLoanRecurring(loan.id);
      if (formData.get('asTx') === '1') {
        await api('POST', 'api/transactions', { type: 'expense', amount, date, accountId: formData.get('accountId'), categoryId: formData.get('categoryId'), note: `Amortización anticipada ${loan.name}` });
      }
      render();
      toast('Amortización registrada');
    }
  });
}

/* ---------------------------------------------------------------- sincronización cifrada */
const SYNC_ITER = 310000;
const b64 = {
  encode(bytes) { let s = ''; const arr = new Uint8Array(bytes); for (let i = 0; i < arr.length; i += 0x8000) s += String.fromCharCode(...arr.subarray(i, i + 0x8000)); return btoa(s); },
  decode(text) { const s = atob(String(text)); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i); return out; }
};
function hasWebCrypto() { return Boolean(globalThis.crypto?.subtle && globalThis.isSecureContext); }
async function deriveKey(passphrase, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function syncPayload() {
  const { pinEnabled, ...settings } = store.data.settings;
  const { serverTime, ...rest } = store.data;
  return { ...rest, settings };
}
async function sealSync(passphrase) {
  if (passphrase.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (!hasWebCrypto()) return (await api('POST', 'api/sync/seal', { passphrase })).package;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, SYNC_ITER);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(syncPayload())));
  return { app: 'mi-cartera', kind: 'sync', v: 1, kdf: 'PBKDF2-SHA256', iter: SYNC_ITER, salt: b64.encode(salt), iv: b64.encode(iv), data: b64.encode(data), createdAt: new Date().toISOString() };
}
async function openSync(passphrase, pkg) {
  if (!pkg || pkg.app !== 'mi-cartera' || pkg.v !== 1) throw new Error('El archivo no es un paquete de Mi Cartera.');
  if (!hasWebCrypto()) return (await api('POST', 'api/sync/open', { passphrase, package: pkg })).data;
  try {
    const key = await deriveKey(passphrase, b64.decode(pkg.salt), Number(pkg.iter) || SYNC_ITER);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.decode(pkg.iv) }, key, b64.decode(pkg.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error('Contraseña incorrecta o archivo dañado.');
  }
}
function openSyncExportModal() {
  openSheet({
    title: 'Crear paquete cifrado',
    subtitle: 'Un archivo con todos tus datos protegido con contraseña (AES-256). Sin ella nadie puede abrirlo.',
    submitLabel: 'Crear y descargar',
    body: `
      <div class="field"><span>Contraseña <span class="hint">(mínimo 8 caracteres)</span></span><input name="pass" type="password" minlength="8" autocomplete="new-password" required></div>
      <div class="field"><span>Repite la contraseña</span><input name="pass2" type="password" minlength="8" autocomplete="new-password" required></div>
      <p class="seg-note">Guárdalo donde quieras: un pendrive, tu nube o envíatelo por correo. Si olvidas la contraseña no se puede recuperar.</p>`,
    async onSubmit(formData) {
      const pass = String(formData.get('pass') || '');
      if (pass !== String(formData.get('pass2') || '')) throw new Error('Las contraseñas no coinciden.');
      const pkg = await sealSync(pass);
      downloadFile(`mi-cartera-${todayISO()}.mcsync`, JSON.stringify(pkg), 'application/json');
      toast('Paquete cifrado descargado');
    }
  });
}
function openSyncImportModal(file) {
  openSheet({
    title: 'Abrir paquete cifrado',
    subtitle: file.name,
    submitLabel: 'Abrir',
    body: `
      <div class="field"><span>Contraseña del paquete</span><input name="pass" type="password" autocomplete="current-password" required></div>
      <div class="seg seg--full" role="group" aria-label="Qué hacer con los datos">
        <button type="button" data-mode="merge" class="active">Combinar</button>
        <button type="button" data-mode="replace">Reemplazar todo</button>
      </div>
      <input type="hidden" name="mode" value="merge">
      <p class="seg-note" data-mode-note>Une los datos de los dos dispositivos. Si algo se cambió en ambos, gana el cambio más reciente; lo que borraste se queda borrado.</p>
      <p class="seg-note">Antes de aplicar nada se guarda una copia automática de tus datos actuales.</p>`,
    onMount(dialog, form) {
      const note = dialog.querySelector('[data-mode-note]');
      dialog.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
        form.mode.value = btn.dataset.mode;
        dialog.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('active', x === btn));
        note.textContent = btn.dataset.mode === 'merge'
          ? 'Une los datos de los dos dispositivos. Si algo se cambió en ambos, gana el cambio más reciente; lo que borraste se queda borrado.'
          : 'Sustituye todo lo de este dispositivo por el contenido del paquete. Útil al cambiar de ordenador.';
      }));
    },
    async onSubmit(formData) {
      let pkg;
      try { pkg = JSON.parse(await file.text()); } catch { throw new Error('El archivo no es un paquete válido.'); }
      const data = await openSync(String(formData.get('pass') || ''), pkg);
      const mode = formData.get('mode');
      const result = mode === 'replace' ? await api('POST', 'api/import', { data }) : await api('POST', 'api/sync/merge', { data });
      render();
      toast(mode === 'replace' ? `Datos reemplazados: ${result.imported?.transactions ?? 0} movimientos` : `Sincronizado: ${store.data.transactions.length} movimientos en total`);
    }
  });
}

/* ---------------------------------------------------------------- copias automáticas */
const BACKUP_KIND = { daily: 'Diaria', manual: 'Manual', safety: 'Seguridad' };
function backupLabel(b) {
  const m = b.name.match(/^db-(?:([a-z-]+?)-)?(\d{4}-\d{2}-\d{2})/);
  const reason = m?.[1] && m[1] !== 'manual' ? m[1].replace(/^antes-de-/, 'antes de ').replace(/-/g, ' ') : '';
  return reason ? `Copia ${reason}` : b.kind === 'manual' ? 'Copia manual' : 'Copia diaria';
}
async function openBackupsModal() {
  const { backups } = await api('GET', 'api/backups');
  const when = (iso) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  openSheet({
    title: 'Copias automáticas',
    subtitle: WEB ? 'Guardadas en este navegador: una diaria (últimos 5 días) y una antes de cada cambio grande.' : 'Guardadas en data/backups: una diaria (14 días) y una antes de importar, sincronizar o borrar.',
    wide: true,
    hideSubmit: true,
    secondaryLabel: 'Crear copia ahora',
    secondaryIcon: 'plus',
    body: backups.length ? `<div class="txlist backup-list">${backups.map((b) => `<div class="txrow">
        <span class="tx-icon">${icon(b.kind === 'daily' ? 'calendar' : b.kind === 'manual' ? 'download' : 'shield', 17)}</span>
        <span class="tx-main"><span class="tx-title">${esc(backupLabel(b))}</span><span class="tx-meta">${esc(when(b.at))} · ${b.counts ? `${b.counts.transactions} movimientos · ${b.counts.accounts} cuentas` : 'sin detalles'}</span></span>
        <button class="btn btn-ghost btn-sm" type="button" data-restore="${esc(b.name)}">Restaurar</button>
      </div>`).join('')}</div>` : '<div class="empty"><span class="empty-icon">' + glyphSVG('file', 24) + '</span><h3>Aún no hay copias</h3><p>Se crean solas al guardar cambios.</p></div>',
    onMount(dialog) {
      dialog.querySelectorAll('[data-restore]').forEach((btn) => btn.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Restaurar copia', message: 'Tus datos actuales se sustituirán por los de esta copia. Antes se guarda una copia de seguridad de lo que tienes ahora.', confirm: 'Restaurar', danger: false });
        if (!ok) return;
        try {
          await api('POST', 'api/backups/restore', { name: btn.dataset.restore });
          dialog.close();
          render();
          toast('Copia restaurada');
        } catch (err) { toast(err.message, 'error'); }
      }));
    },
    async onSecondary(dialog) {
      await api('POST', 'api/backups');
      dialog.close();
      toast('Copia creada');
      openBackupsModal();
    }
  });
}

/* ---------------------------------------------------------------- abrir en el móvil */
function qrSVG(text) {
  const factory = globalThis.qrcode;
  if (typeof factory !== 'function') return '';
  const qr = factory(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let path = '';
  for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
  return `<svg class="qr" viewBox="-2 -2 ${n + 4} ${n + 4}" role="img" aria-label="Código QR de ${esc(text)}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${path}" fill="#111"/></svg>`;
}
async function openPhoneModal() {
  let info = { web: true };
  try { info = await api('GET', 'api/network'); } catch { /* sin datos */ }
  if (info.web) {
    const url = location.href.split('#')[0];
    openSheet({
      title: 'Abrir en el móvil',
      subtitle: 'Escanea el código con la cámara del móvil.',
      hideSubmit: true,
      body: `<div class="qr-wrap">${qrSVG(url)}<code class="path-box">${esc(url)}</code></div>
        <p class="seg-note">Ojo: en la versión web cada navegador guarda sus propios datos. Para llevarte los de aquí al móvil usa <b>Sincronización cifrada</b>.</p>
        <p class="seg-note">En el iPhone, pulsa Compartir → <b>Añadir a pantalla de inicio</b> y se abrirá como una app.</p>`
    });
    return;
  }
  const urls = info.urls || [];
  openSheet({
    title: 'Abrir en el móvil',
    subtitle: 'El móvil tiene que estar en la misma Wi-Fi que este ordenador.',
    hideSubmit: true,
    wide: urls.length > 1,
    body: urls.length ? `<div class="qr-grid">${urls.map((u) => `<div class="qr-wrap">${qrSVG(u)}<code class="path-box">${esc(u)}</code></div>`).join('')}</div>
      <ol class="steps">
        <li>Escanea el código con la cámara del móvil (o escribe la dirección).</li>
        <li>Si no carga, comprueba que el móvil no usa datos móviles ni una Wi-Fi de invitados.</li>
        ${info.platform === 'win32' ? '<li>Si sigue sin cargar, haz doble clic en <b>permitir-movil.bat</b> (en la carpeta de la app) y acepta el permiso de administrador. Abre el puerto solo en redes privadas.</li><li>En Windows, la Wi-Fi debe estar marcada como <b>red privada</b>: Configuración → Red e Internet → Wi-Fi → tu red → Perfil de red: Privada.</li>' : '<li>Si tienes cortafuegos, permite conexiones entrantes al puerto ' + esc(info.port) + '.</li>'}
        <li>En el iPhone: Compartir → <b>Añadir a pantalla de inicio</b>.</li>
      </ol>` : '<div class="empty"><span class="empty-icon">' + glyphSVG('wifi', 24) + '</span><h3>Sin red local</h3><p>Este ordenador no está conectado a ninguna Wi-Fi o red. Conéctalo y vuelve a abrir esta ventana.</p></div>'
  });
}

/* ---------------------------------------------------------------- cotizaciones */
function quotable(inv) { return marketLinked(inv); }
async function refreshPricesNow({ silent = false, ids = null } = {}) {
  const list = (store.data.investments || []).filter((i) => quotable(i) && (!ids || ids.includes(i.id)));
  if (!list.length) {
    if (!silent) toast('Ninguna inversión está vinculada al mercado. Edítala y búscala por nombre, ticker o ISIN.', 'error');
    return;
  }
  if (!silent) toast('Consultando el mercado…');
  const result = await api('POST', 'api/prices/refresh', ids ? { ids } : {});
  const ok = (result.results || []).filter((r) => r.ok);
  const failed = (result.results || []).filter((r) => !r.ok);
  render();
  if (!silent || failed.length) {
    if (failed.length) {
      const names = failed.slice(0, 3).map((f) => f.name).join(', ') + (failed.length > 3 ? '…' : '');
      toast(`${ok.length} de ${ok.length + failed.length} actualizadas. Sin precio: ${names}. ${failed[0].error}`, ok.length ? 'success' : 'error');
    }
    else toast(ok.length === 1 ? 'Precio actualizado con el mercado' : `${ok.length} precios actualizados con el mercado`);
  }
}
/** Mantiene los precios al día mientras la app está abierta (cada 15 minutos como mucho). */
async function maybeAutoRefreshPrices() {
  const s = store.data?.settings;
  if (!s?.autoPrices || store.offline || document.hidden) return;
  if (!(store.data.investments || []).some(quotable)) return;
  const last = Date.parse(s.pricesRefreshedAt || '') || 0;
  if (Date.now() - last < 15 * 60 * 1000) return;
  try { await refreshPricesNow({ silent: true }); } catch { /* sin conexión: se reintenta más tarde */ }
}


/* ---------------------------------------------------------------- precios en directo
   Cada tipo de activo usa la fuente más oficial que se puede consultar gratis desde el navegador
   (los WebSocket no tienen la restricción CORS, así que no hace falta intermediario):
   - Cripto: Coinbase Exchange, canal público «ticker» (sin clave).
   - Acciones y ETF de EE. UU.: Finnhub, operaciones en tiempo real (clave gratuita en Ajustes).
   - Lo demás (bolsas europeas): canal de Yahoo Finance como respaldo, porque no hay fuente oficial gratuita.
   Los fondos publican un valor liquidativo al día y no se siguen en directo. */
const CRYPTO_LIVE_RE = /^([A-Z0-9]{2,10})-(EUR|USD|GBP|USDC|USDT)$/;
const US_LIVE_RE = /^[A-Z]{1,5}$/;
const live = { feeds: {}, quotes: new Map(), renderTimer: null, lastRender: 0 };

function liveRoute(inv) {
  if (!marketLinked(inv) || inv.type === 'fund') return null;
  const sym = String(inv.quoteSymbol).toUpperCase();
  if (inv.type === 'crypto' && CRYPTO_LIVE_RE.test(sym)) return 'coinbase';
  if (US_LIVE_RE.test(sym) && store.data?.settings?.finnhubKey) return 'finnhub';
  return 'yahoo';
}
function usRegularSession(ms = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
    .formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return false;
  const min = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  return min >= 570 && min < 960; // 9:30 a 16:00 en Nueva York
}

const LIVE_SINT = new Set([3, 9, 14, 19, 21, 22, 24, 26, 27, 28, 29]);
function decodeYahooTick(b64) {
  let bytes;
  try { bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { return null; }
  const view = new DataView(bytes.buffer);
  const out = {};
  let i = 0;
  const varint = () => {
    let result = 0n;
    let shift = 0n;
    let b;
    do { b = bytes[i++]; result |= BigInt(b & 127) << shift; shift += 7n; } while (b & 128 && i < bytes.length);
    return result;
  };
  try {
    while (i < bytes.length) {
      const key = Number(varint());
      const field = key >> 3;
      const wire = key & 7;
      if (wire === 0) { const raw = varint(); out[field] = LIVE_SINT.has(field) ? Number((raw >> 1n) ^ -(raw & 1n)) : Number(BigInt.asIntN(64, raw)); }
      else if (wire === 5) { out[field] = view.getFloat32(i, true); i += 4; }
      else if (wire === 1) { out[field] = view.getFloat64(i, true); i += 8; }
      else if (wire === 2) { const len = Number(varint()); out[field] = new TextDecoder().decode(bytes.subarray(i, i + len)); i += len; }
      else break;
    }
  } catch { return null; }
  if (!out[1] || !(out[2] > 0)) return null;
  // 7 = horario (1 sesión regular); 6 = tipo (24 fondo). Fuera de sesión no se toca la valoración.
  if (out[6] === 24 || !(out[7] === 1 || out[7] === undefined)) return null;
  return { symbol: String(out[1]).toUpperCase(), price: out[2], at: out[3] || Date.now() };
}

const LIVE_FEEDS = {
  coinbase: {
    label: 'Coinbase',
    url: () => 'wss://ws-feed.exchange.coinbase.com',
    open: (ws, symbols) => ws.send(JSON.stringify({ type: 'subscribe', product_ids: symbols, channels: ['ticker'] })),
    parse(data) {
      const m = JSON.parse(data);
      if (m?.type !== 'ticker' || !m.product_id) return [];
      return [{ symbol: String(m.product_id).toUpperCase(), price: Number(m.price), at: Date.parse(m.time) || Date.now() }];
    }
  },
  finnhub: {
    label: 'Finnhub',
    url: () => `wss://ws.finnhub.io?token=${encodeURIComponent(store.data?.settings?.finnhubKey || '')}`,
    open: (ws, symbols) => { for (const symbol of symbols) ws.send(JSON.stringify({ type: 'subscribe', symbol })); },
    parse(data) {
      const m = JSON.parse(data);
      if (m?.type !== 'trade' || !Array.isArray(m.data)) return [];
      const last = new Map();
      for (const t of m.data) if (t && t.s && t.p > 0 && usRegularSession(t.t)) last.set(t.s, { symbol: String(t.s).toUpperCase(), price: Number(t.p), at: Number(t.t) || Date.now() });
      return [...last.values()];
    }
  },
  yahoo: {
    label: 'Yahoo Finance',
    url: () => 'wss://streamer.finance.yahoo.com/?version=2',
    open: (ws, symbols) => ws.send(JSON.stringify({ subscribe: symbols })),
    parse(data) {
      const m = JSON.parse(data);
      if (m?.type !== 'pricing' || typeof m.message !== 'string') return [];
      const tick = decodeYahooTick(m.message);
      return tick ? [tick] : [];
    }
  }
};

/** Aplica el último precio en directo a una inversión (en memoria; el servidor guarda el de referencia). */
function applyLiveTo(inv) {
  const route = liveRoute(inv);
  if (!route || !inv.nativeCurrency) return false;
  const tick = live.quotes.get(`${route}:${String(inv.quoteSymbol).toUpperCase()}`);
  if (!tick || !(tick.price > 0)) return false;
  if (tick.at <= (Date.parse(inv.priceAt || '') || 0) && !inv.live) return false;
  const refNative = Number(inv.nativePrice) || 0;
  const refPrice = Number(inv.currentPrice) || 0;
  if (!(refNative > 0 && refPrice > 0)) return false;
  let native = tick.price;
  if (native / refNative > 50 && Math.abs(native / 100 / refNative - 1) < 0.3) native /= 100; // peniques (GBp)
  const rate = refPrice / refNative; // tipo de cambio oficial del BCE de la última consulta
  const price = native * rate;
  const anchor = Number(inv.livePriceRef || refPrice);
  if (Math.abs(price / anchor - 1) > 0.35) return false; // dato raro: se ignora
  if (!inv.live) inv.livePriceRef = refPrice;
  const changed = Math.abs(price - refPrice) > 1e-9;
  inv.currentPrice = Math.round(price * 1e6) / 1e6;
  inv.nativePrice = Math.round(native * 1e6) / 1e6;
  if (inv.prevClose > 0) inv.dayChangePct = Math.round((inv.currentPrice / inv.prevClose - 1) * 10000) / 100;
  inv.priceAt = new Date(tick.at).toISOString();
  inv.priceSource = LIVE_FEEDS[route].label;
  inv.live = route;
  return changed;
}
function applyLiveAll() {
  let changed = false;
  for (const inv of store.data?.investments || []) if (applyLiveTo(inv)) changed = true;
  return changed;
}

function scheduleLiveRender() {
  if (live.renderTimer) return;
  const wait = Math.max(0, 3000 - (Date.now() - live.lastRender));
  live.renderTimer = setTimeout(() => {
    live.renderTimer = null;
    if (!['inversiones', 'resumen'].includes(store.view)) return;
    if (document.querySelector('dialog[open]')) { scheduleLiveRender(); return; }
    const active = document.activeElement;
    if (active && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName) && document.getElementById('view')?.contains(active)) { scheduleLiveRender(); return; }
    live.lastRender = Date.now();
    const y = window.scrollY;
    render();
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: 'instant' });
  }, wait);
}

function onLiveTicks(route, ticks) {
  let changed = false;
  for (const tick of ticks) {
    live.quotes.set(`${route}:${tick.symbol}`, tick);
    for (const inv of store.data?.investments || []) {
      if (String(inv.quoteSymbol || '').toUpperCase() === tick.symbol && liveRoute(inv) === route && applyLiveTo(inv)) changed = true;
    }
  }
  if (changed) scheduleLiveRender();
}

function stopFeed(route) {
  const f = live.feeds[route];
  if (!f) return;
  clearTimeout(f.timer);
  if (f.ws) { f.ws.onclose = null; try { f.ws.close(); } catch { /* nada */ } }
  delete live.feeds[route];
}
function stopLive() { for (const route of Object.keys(live.feeds)) stopFeed(route); }

function openFeed(route, symbols, key) {
  const def = LIVE_FEEDS[route];
  const prev = live.feeds[route];
  const f = { key, ws: null, timer: null, connected: false, retry: prev?.retry || 0 };
  stopFeed(route);
  live.feeds[route] = f;
  let ws;
  try { ws = new WebSocket(def.url()); } catch { return; }
  f.ws = ws;
  ws.onopen = () => { f.retry = 0; f.connected = true; def.open(ws, symbols); if (store.view === 'inversiones') scheduleLiveRender(); };
  ws.onmessage = (event) => { let ticks = []; try { ticks = def.parse(event.data); } catch { ticks = []; } if (ticks.length) onLiveTicks(route, ticks); };
  ws.onclose = () => {
    f.connected = false;
    f.ws = null;
    if (live.feeds[route] !== f || document.hidden) return;
    f.retry = Math.min(f.retry + 1, 6);
    f.timer = setTimeout(() => { if (live.feeds[route] === f) { f.key = ''; syncLive(); } }, Math.min(60000, 1500 * 2 ** f.retry));
  };
  ws.onerror = () => { /* onclose se encarga de reintentar */ };
}

/** Abre, ajusta o cierra cada canal según las inversiones vinculadas. */
function syncLive() {
  if (typeof WebSocket !== 'function') return;
  const want = { coinbase: new Set(), finnhub: new Set(), yahoo: new Set() };
  if (store.data && store.data.settings?.autoPrices !== false && !document.hidden && !store.offline) {
    for (const inv of store.data.investments || []) {
      const route = liveRoute(inv);
      if (route) want[route].add(String(inv.quoteSymbol).toUpperCase());
    }
  }
  for (const route of Object.keys(want)) {
    const symbols = [...want[route]].sort();
    const key = route === 'finnhub' ? `${symbols.join(',')}|${store.data?.settings?.finnhubKey || ''}` : symbols.join(',');
    if (!symbols.length) { stopFeed(route); continue; }
    const f = live.feeds[route];
    if (f && f.key === key && (f.ws || f.timer)) continue;
    openFeed(route, symbols, key);
  }
}
function liveConnected() { return Object.values(live.feeds).some((f) => f.connected); }
function liveLabel(h) {
  return Boolean(h.live) && live.feeds[h.live]?.connected && Date.now() - (Date.parse(h.priceAt || '') || 0) < 10 * 60 * 1000;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopLive(); else syncLive(); });
window.addEventListener('online', () => syncLive());

/* ---------------------------------------------------------------- actualizaciones de la app */
async function forceUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (globalThis.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('micartera')).map((k) => caches.delete(k)));
    }
  } catch { /* seguimos con la recarga */ }
  const url = new URL(location.href);
  url.searchParams.set('v', Date.now().toString(36));
  location.replace(url.toString());
}
function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    toast('Hay una versión nueva de Mi Cartera. Recargando…');
    setTimeout(() => location.reload(), 900);
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => { reg.update().catch(() => {}); })
    .catch(() => {});
}

/* ================================================================ negocio: autónomos en España (v1.4) */
const PROFILE_LABELS = {
  personal: { title: 'Particular', text: 'Controlar mis gastos, ahorro e inversiones.', icon: 'home' },
  autonomo: { title: 'Autónomo', text: 'Facturar con IVA e IRPF, preparar mis impuestos y calcular mi cuota.', icon: 'invoice' },
  ambos: { title: 'Las dos cosas', text: 'Soy autónomo y además quiero llevar mis finanzas personales.', icon: 'grid' }
};
const MODULE_INFO = {
  business: { title: 'Facturación e impuestos', text: 'Facturas, clientes, gastos deducibles, modelos 303 y 130 y cuota de autónomos.' },
  budgets: { title: 'Presupuestos', text: 'Límites de gasto mensuales por categoría.' },
  recurring: { title: 'Recurrentes', text: 'Nómina, alquiler y recibos que se apuntan solos.' },
  goals: { title: 'Objetivos de ahorro', text: 'Fondo de emergencia, viajes, entrada de un piso…' },
  investments: { title: 'Inversiones', text: 'Acciones, fondos, ETF y cripto con rentabilidad.' },
  loans: { title: 'Préstamos', text: 'Hipotecas y préstamos con cuadro de amortización.' },
  reports: { title: 'Informes', text: 'Tu año en números y exportación.' }
};
const CLIENT_KIND_LABELS = { empresa: 'Empresa', autonomo: 'Autónomo', particular: 'Particular' };
const PURCHASE_KIND_INFO = {
  compras: { label: 'Compras y mercaderías', pct: 100 },
  material: { label: 'Material y equipos', pct: 100, hint: 'Si cuesta más de 300 € y dura varios años, en el IRPF se amortiza (consúltalo con tu asesor).' },
  suministros: { label: 'Suministros (luz, agua, internet)', pct: 100, hint: 'Si trabajas desde casa: deduce el 30 % de la parte de la vivienda afecta a la actividad.' },
  alquiler: { label: 'Alquiler de local u oficina', pct: 100, irpf: 19, hint: 'El alquiler de local lleva normalmente retención del 19 % que tú ingresas con el modelo 115.' },
  telefono: { label: 'Teléfono', pct: 50, hint: 'Si lo usas también para lo personal, lo habitual es deducir el 50 %.' },
  software: { label: 'Software y suscripciones', pct: 100 },
  servicios: { label: 'Servicios profesionales', pct: 100 },
  gestoria: { label: 'Gestoría y asesoría', pct: 100 },
  publicidad: { label: 'Publicidad y marketing', pct: 100 },
  formacion: { label: 'Formación', pct: 100 },
  viajes: { label: 'Viajes y dietas', pct: 100, hint: 'Dietas: hasta 26,67 €/día en España y 48,08 € en el extranjero (pago electrónico).' },
  vehiculo: { label: 'Vehículo y combustible', pct: 50, hint: 'Hacienda presume un 50 % de uso profesional del IVA; en el IRPF solo si el uso es exclusivo.' },
  seguros: { label: 'Seguros', pct: 100, hint: 'Seguro de salud: deducible hasta 500 € al año por persona.' },
  reta: { label: 'Cuota de autónomos (RETA)', pct: 100, noIva: true },
  otros: { label: 'Otros gastos', pct: 100 }
};
const NAV_GROUPS = [
  { label: '', items: ['resumen', 'movimientos', 'cuentas'] },
  { label: 'Negocio', items: ['facturas', 'clientes', 'gastos', 'impuestos', 'cuota'] },
  { label: 'Planificar', items: ['presupuestos', 'recurrentes', 'objetivos'] },
  { label: 'Patrimonio', items: ['inversiones', 'prestamos'] },
  { label: '', items: ['informes', 'ajustes'] }
];
const VIEW_MODULE = {
  presupuestos: 'budgets', recurrentes: 'recurring', objetivos: 'goals', inversiones: 'investments',
  prestamos: 'loans', informes: 'reports', facturas: 'business', clientes: 'business', gastos: 'business',
  impuestos: 'business', cuota: 'business'
};

function settings() { return store.data?.settings || {}; }
function biz() { return settings().business || {}; }
function moduleOn(key) { return settings().modules?.[key] !== false; }
function hasBusiness() { return moduleOn('business') && settings().modules?.business === true; }
function viewEnabled(id) { const m = VIEW_MODULE[id]; return !m || (m === 'business' ? hasBusiness() : moduleOn(m)); }
function bottomNavItems() {
  if (hasBusiness()) return ['resumen', 'movimientos', 'facturas', 'impuestos', 'mas'];
  const pick = (list, not = []) => list.find((v) => viewEnabled(v) && !not.includes(v)) || 'cuentas';
  const third = pick(['inversiones', 'presupuestos', 'objetivos', 'cuentas']);
  const fourth = pick(['informes', 'presupuestos', 'recurrentes', 'cuentas'], [third]);
  return ['resumen', 'movimientos', third, fourth === third ? 'ajustes' : fourth, 'mas'];
}
function moreViews() {
  const bottom = bottomNavItems();
  return ['mas', ...NAV.map((n) => n.id).filter((id) => !bottom.includes(id))];
}
function sideNavHTML() {
  return NAV_GROUPS.map((g) => {
    const items = g.items.filter(viewEnabled);
    if (!items.length) return '';
    return `${g.label ? `<div class="nav-group">${esc(g.label)}</div>` : '<div class="nav-sep"></div>'}${navHTML(items)}`;
  }).join('');
}
function renderNav() {
  const side = document.getElementById('sideNav');
  const bottom = document.getElementById('bottomNav');
  const key = JSON.stringify([settings().modules, settings().profile]);
  if (renderNav.key === key && side?.childElementCount) return;
  renderNav.key = key;
  if (side) side.innerHTML = sideNavHTML();
  if (bottom) bottom.innerHTML = navHTML(bottomNavItems(), true);
}

/* ---------------------------------------------------------------- utilidades fiscales */
function fmtDate(iso) { return iso ? iso.split('-').reverse().join('/') : ''; }
function daysUntil(iso) { return Math.round((parseISO(iso) - parseISO(todayISO())) / 86400000); }
function clientById(id) { return (store.data.clients || []).find((c) => c.id === id) || null; }
function invoiceStatus(inv) {
  if (inv.status === 'draft') return { key: 'draft', label: 'Borrador', cls: '' };
  if (inv.status === 'paid') return { key: 'paid', label: 'Cobrada', cls: 'badge--soft' };
  if (inv.dueDate && inv.dueDate < todayISO()) return { key: 'overdue', label: 'Vencida', cls: 'badge--danger' };
  return { key: 'pending', label: 'Pendiente', cls: 'badge--warn' };
}
function invTotals(inv) { return F.invoiceTotals(inv); }
function currentQuarter() { const t = todayISO(); return { year: Number(t.slice(0, 4)), q: F.quarterOf(t) }; }
/** Trimestre que toca presentar: el anterior mientras dure su plazo, si no el actual. */
function quarterToFile() {
  const t = todayISO();
  const cur = currentQuarter();
  const prev = cur.q === 1 ? { year: cur.year - 1, q: 4 } : { year: cur.year, q: cur.q - 1 };
  const d = F.quarterDeadline(prev.year, prev.q);
  return t <= d.to ? prev : cur;
}
function retaMonthlyNow() {
  const b = biz();
  if (b.retaMonthly > 0) return b.retaMonthly;
  if (b.tarifaPlana && F.monthsSince(b.startDate, todayISO()) < 12) return F.RETA_TARIFA_PLANA_MEI;
  const last = [...(store.data?.purchases || [])].filter((p) => p.kind === 'reta').sort((a, c) => c.date.localeCompare(a.date))[0];
  return last ? last.base : 0;
}
function taxOpts() { return { retaMonthly: retaMonthlyNow(), startDate: biz().startDate || '' }; }
function quarterLabel(year, q) { return `${q}T ${year}`; }
function deadlineText(year, q) {
  const d = F.quarterDeadline(year, q);
  return `del ${fmtDate(d.from)} al ${fmtDate(d.to)}`;
}
function hacienda(year, q) {
  const m303 = F.modelo303(store.data.invoices, store.data.purchases, year, q);
  const m130 = F.modelo130(store.data.invoices, store.data.purchases, year, q, taxOpts());
  const exento130 = m130.pctRetencion >= 0.7;
  return { m303, m130, exento130, total: round(Math.max(0, m303.resultado) + (exento130 ? 0 : m130.resultado)) };
}
function businessReady() { const b = biz(); return Boolean(b.name && b.nif && F.validateNif(b.nif).ok); }
function nifHint(value) {
  if (!value) return '';
  const r = F.validateNif(value);
  return r.ok ? `<span class="nif-ok">${icon('check', 13)} ${esc(r.type)} válido</span>` : `<span class="nif-bad">${esc(r.message)}</span>`;
}
function territoryNotice(t) {
  if (t === 'canarias') return 'En Canarias no se aplica IVA sino IGIC (tipo general 7 %). Las facturas y el modelo 303 de esta app no sirven para tu caso: usa los modelos 420 del Gobierno de Canarias.';
  if (t === 'ceutamelilla') return 'En Ceuta y Melilla se aplica el IPSI en lugar del IVA. Los cálculos de IVA de esta app no te sirven.';
  if (t === 'foral') return 'En País Vasco y Navarra las haciendas forales tienen sus propios modelos, plazos y sistemas (TicketBAI). Los modelos 303/130 de esta app son orientativos.';
  return '';
}

/* ---------------------------------------------------------------- bienvenida */
function obState() {
  if (!ui.ob) {
    const s = settings();
    ui.ob = { step: 0, profile: s.profile || 'autonomo', modules: null, business: { ...(s.business || {}) } };
  }
  return ui.ob;
}
function defaultModulesFor(profile) {
  const business = profile !== 'personal';
  return { business, budgets: profile !== 'autonomo', recurring: true, goals: profile !== 'autonomo', investments: profile === 'personal', loans: false, reports: true };
}
function obSteps(ob) { return ob.profile === 'personal' ? ['perfil', 'secciones', 'empezar'] : ['perfil', 'negocio', 'secciones', 'empezar']; }
function viewOnboarding() {
  const ob = obState();
  const steps = obSteps(ob);
  const step = steps[Math.min(ob.step, steps.length - 1)];
  const mods = ob.modules || defaultModulesFor(ob.profile);
  const dots = steps.map((s, i) => `<i class="${i <= ob.step ? 'on' : ''}"></i>`).join('');
  let body = '';
  if (step === 'perfil') {
    body = `<h1>Bienvenido a Mi Cartera</h1>
      <p class="ob-lead">Tu gestoría privada: facturas con IVA e IRPF, impuestos trimestrales y cuota de autónomos, sin subir tus datos a ninguna nube. ¿Para qué la vas a usar?</p>
      <div class="ob-choices">${Object.entries(PROFILE_LABELS).map(([k, p]) => `<button type="button" class="ob-choice${ob.profile === k ? ' active' : ''}" data-action="ob-profile" data-value="${k}">
        <span class="more-icon">${icon(p.icon, 20)}</span><span><b>${esc(p.title)}</b><span>${esc(p.text)}</span></span></button>`).join('')}</div>`;
  } else if (step === 'negocio') {
    const b = ob.business;
    body = `<h1>Tus datos fiscales</h1>
      <p class="ob-lead">Aparecerán en tus facturas. Puedes completarlos o cambiarlos más tarde en Ajustes.</p>
      <form class="ob-form" id="obBusiness" novalidate>
        <div class="form-grid">
          <div class="field"><span>Nombre y apellidos o razón social</span><input name="name" maxlength="120" value="${esc(b.name || '')}" placeholder="Ej. Lucía Gómez Pérez"></div>
          <div class="field"><span>NIF / NIE</span><input name="nif" maxlength="20" value="${esc(b.nif || '')}" placeholder="12345678Z" data-nif autocapitalize="characters"><small class="nif-hint">${nifHint(b.nif)}</small></div>
        </div>
        <div class="field"><span>Dirección fiscal</span><input name="address" maxlength="160" value="${esc(b.address || '')}" placeholder="Calle, número, piso"></div>
        <div class="form-grid form-grid--3">
          <div class="field"><span>Código postal</span><input name="zip" maxlength="10" inputmode="numeric" value="${esc(b.zip || '')}"></div>
          <div class="field"><span>Localidad</span><input name="city" maxlength="80" value="${esc(b.city || '')}"></div>
          <div class="field"><span>Provincia</span><input name="province" maxlength="80" value="${esc(b.province || '')}"></div>
        </div>
        <div class="form-grid">
          <div class="field"><span>Tipo de actividad</span><select name="activity">
            <option value="profesional"${b.activity !== 'empresarial' ? ' selected' : ''}>Profesional (diseño, consultoría…)</option>
            <option value="empresarial"${b.activity === 'empresarial' ? ' selected' : ''}>Empresarial (comercio, oficios…)</option>
          </select></div>
          <div class="field"><span>Fecha de alta como autónomo</span><input name="startDate" type="date" value="${esc(b.startDate || '')}"></div>
        </div>
        <div class="form-grid">
          <div class="field"><span>Retención de IRPF en tus facturas</span><select name="irpfRate">
            ${F.IRPF_OPTIONS.filter((o) => [15, 7, 0].includes(o.value)).map((o) => `<option value="${o.value}"${Number(b.irpfRate ?? 15) === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
          </select></div>
          <div class="field"><span>Dónde tributas</span><select name="territory">
            <option value="comun"${(b.territory || 'comun') === 'comun' ? ' selected' : ''}>Península y Baleares (IVA)</option>
            <option value="canarias"${b.territory === 'canarias' ? ' selected' : ''}>Canarias (IGIC)</option>
            <option value="ceutamelilla"${b.territory === 'ceutamelilla' ? ' selected' : ''}>Ceuta o Melilla (IPSI)</option>
            <option value="foral"${b.territory === 'foral' ? ' selected' : ''}>País Vasco o Navarra (foral)</option>
          </select></div>
        </div>
        <label class="checkbox"><input type="checkbox" name="tarifaPlana"${b.tarifaPlana ? ' checked' : ''}> Estoy con la tarifa plana (80 € al mes los primeros 12 meses)</label>
        <p class="ob-warn" data-territory-note${territoryNotice(b.territory) ? '' : ' hidden'}>${icon('alert', 15)} <span>${esc(territoryNotice(b.territory))}</span></p>
      </form>`;
  } else if (step === 'secciones') {
    body = `<h1>Elige qué quieres ver</h1>
      <p class="ob-lead">Empieza solo con lo que necesitas. Podrás activar el resto cuando quieras en Ajustes → Secciones.</p>
      <div class="ob-modules">${Object.entries(MODULE_INFO).map(([k, m]) => `<label class="ob-module"><input type="checkbox" data-ob-module="${k}"${mods[k] ? ' checked' : ''}><span><b>${esc(m.title)}</b><span>${esc(m.text)}</span></span></label>`).join('')}</div>`;
  } else {
    body = `<h1>¿Cómo quieres empezar?</h1>
      <p class="ob-lead">Puedes explorar con datos de ejemplo y borrarlos después desde Ajustes, o empezar directamente con los tuyos.</p>
      <div class="ob-choices">
        <button type="button" class="ob-choice" data-action="ob-finish" data-demo="0"><span class="more-icon">${icon('plus', 20)}</span><span><b>Empezar con mis datos</b><span>La app arranca vacía con una guía de primeros pasos.</span></span></button>
        <button type="button" class="ob-choice" data-action="ob-finish" data-demo="1"><span class="more-icon">${icon('sparkles', 20)}</span><span><b>Ver un ejemplo</b><span>${ob.profile === 'personal' ? 'Seis meses de movimientos, objetivos e inversiones ficticias.' : 'Clientes, facturas, gastos y trimestres de un autónomo ficticio.'}</span></span></button>
      </div>`;
  }
  return `<section class="onboarding">
    <div class="ob-card">
      <div class="ob-top"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><div class="ob-dots">${dots}</div></div>
      ${body}
      <div class="ob-foot">
        ${ob.step > 0 ? `<button type="button" class="btn btn-ghost" data-action="ob-back">${icon('arrowLeft', 16)} Atrás</button>` : '<span></span>'}
        ${step !== 'empezar' ? `<button type="button" class="btn btn-primary" data-action="ob-next">Continuar ${icon('arrowRight', 16)}</button>` : ''}
      </div>
    </div>
  </section>`;
}
function obCollectBusiness() {
  const form = document.getElementById('obBusiness');
  if (!form) return;
  const fd = new FormData(form);
  const ob = obState();
  for (const k of ['name', 'nif', 'address', 'zip', 'city', 'province', 'activity', 'startDate', 'territory']) ob.business[k] = String(fd.get(k) || '').trim();
  ob.business.nif = ob.business.nif.toUpperCase().replace(/[\s.-]/g, '');
  ob.business.irpfRate = Number(fd.get('irpfRate'));
  ob.business.tarifaPlana = fd.get('tarifaPlana') === 'on';
}
async function obFinish(demo) {
  const ob = obState();
  const mods = ob.modules || defaultModulesFor(ob.profile);
  const body = { profile: ob.profile, modules: mods, onboarded: true };
  if (ob.profile !== 'personal') {
    const b = { ...ob.business };
    if (b.nif && !F.validateNif(b.nif).ok) b.nif = '';
    if (b.tarifaPlana && !b.retaMonthly) b.retaMonthly = F.RETA_TARIFA_PLANA_MEI;
    body.business = b;
  }
  await api('PATCH', 'api/settings', body);
  if (demo) await api('POST', 'api/demo');
  ui.ob = null;
  renderNav.key = null;
  location.hash = '#/resumen';
  render();
  toast(demo ? 'Datos de ejemplo cargados. Bórralos en Ajustes cuando quieras.' : 'Todo listo. Sigue los primeros pasos.');
  if (demo) refreshPricesNow({ silent: true }).catch(() => {});
}

/* ---------------------------------------------------------------- primeros pasos y resumen */
function firstSteps() {
  const d = store.data;
  const steps = [];
  if (hasBusiness()) {
    steps.push({ done: businessReady(), title: 'Completa tus datos fiscales', text: 'Nombre, NIF y dirección para tus facturas.', action: 'edit-business' });
    steps.push({ done: (d.clients || []).length > 0, title: 'Añade tu primer cliente', text: 'Con su NIF se valida al momento.', action: 'new-client' });
    steps.push({ done: (d.invoices || []).some((i) => i.number), title: 'Emite tu primera factura', text: 'El IVA y la retención se calculan solos.', action: 'new-invoice' });
    steps.push({ done: (d.purchases || []).length > 0, title: 'Apunta un gasto deducible', text: 'Así se resta en tu IVA y en tu IRPF.', action: 'new-purchase' });
  }
  steps.push({ done: d.transactions.length > 0, title: hasBusiness() ? 'Registra un movimiento personal' : 'Registra tu primer movimiento', text: 'Un gasto o ingreso de tu día a día.', action: 'new-tx' });
  if (moduleOn('budgets') && !hasBusiness()) steps.push({ done: d.categories.some((c) => c.budget > 0), title: 'Ponte un presupuesto', text: 'Un límite mensual para una categoría.', action: 'edit-budgets' });
  return steps;
}
function firstStepsCard() {
  if (localStorage.getItem('mc-steps-hidden') === '1') return '';
  const steps = firstSteps();
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return '';
  return `<section class="card steps-card">
    <div class="card-head">
      <div><h2>Primeros pasos</h2><p>${done} de ${steps.length} completados</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-action="hide-steps">Ocultar</button>
    </div>
    <div class="progress"><i style="width:${((done / steps.length) * 100).toFixed(0)}%"></i></div>
    <div class="steps-list">${steps.map((s) => `<button type="button" class="step-item${s.done ? ' done' : ''}" data-action="${s.action}"${s.done ? ' disabled' : ''}>
      <span class="step-check">${s.done ? icon('check', 14) : ''}</span>
      <span class="step-text"><b>${esc(s.title)}</b><span>${esc(s.text)}</span></span>
      ${s.done ? '' : icon('chevronRight', 16)}
    </button>`).join('')}</div>
  </section>`;
}
function businessSummaryHTML() {
  if (!hasBusiness()) return '';
  const cur = currentQuarter();
  const h = hacienda(cur.year, cur.q);
  const pending = (store.data.invoices || []).filter((i) => i.status === 'issued');
  const pendingTotal = round(sum(pending, (i) => i.total));
  const overdue = pending.filter((i) => i.dueDate && i.dueDate < todayISO()).length;
  const next = F.upcomingDeadlines(todayISO(), { count: 1 })[0];
  const left = next ? daysUntil(next.to) : null;
  const notice = territoryNotice(biz().territory);
  return `${notice ? `<div class="banner">${icon('alert', 17)}<span>${esc(notice)}</span></div>` : ''}
  <div class="statgrid">
    ${statCard(`Facturado ${quarterLabel(cur.year, cur.q)}`, bigMoney(h.m130.ingresos - (cur.q > 1 ? F.modelo130(store.data.invoices, store.data.purchases, cur.year, cur.q - 1, taxOpts()).ingresos : 0)), `<span>Base imponible sin IVA</span>`, 'income', 'invoice')}
    ${statCard('Aparta para Hacienda', bigMoney(h.total), `<span>IVA ${esc(money(Math.max(0, h.m303.resultado), { decimals: 0 }))}${h.exento130 ? '' : ` · IRPF ${esc(money(h.m130.resultado, { decimals: 0 }))}`} este trimestre</span>`, 'expense', 'percent')}
    ${statCard('Pendiente de cobro', bigMoney(pendingTotal), `<span>${pending.length} factura${pending.length === 1 ? '' : 's'}${overdue ? ` · <b class="neg">${overdue} vencida${overdue === 1 ? '' : 's'}</b>` : ''}</span>`, 'net', 'calendar')}
  </div>
  ${next ? `<a class="banner banner--link" href="#/impuestos">${icon('calendar', 17)}<span><b>${esc(next.title)}</b> · ${left <= 0 ? 'termina hoy' : `quedan ${left} días`} (hasta el ${esc(fmtDate(next.to))})</span>${icon('chevronRight', 16)}</a>` : ''}`;
}

function recentInvoicesCard() {
  const list = [...(store.data.invoices || [])].sort((a, b) => b.date.localeCompare(a.date) || (b.seq || 0) - (a.seq || 0)).slice(0, 5);
  return `<section class="card">
    <div class="card-head">
      <div><h2>Últimas facturas</h2><p>Emitidas y borradores</p></div>
      <a class="card-link" href="#/facturas">Ver todas ${icon('arrowRight', 14)}</a>
    </div>
    ${list.length ? `<div class="txlist compact">${list.map((inv) => {
      const st = invoiceStatus(inv);
      return `<button type="button" class="txrow" data-action="open-invoice" data-id="${esc(inv.id)}">
        <span class="tx-icon" style="background:var(--fill);color:var(--muted)">${icon('invoice', 18)}</span>
        <span class="tx-main"><span class="tx-title">${esc(inv.buyer?.name || clientById(inv.clientId)?.name || 'Sin cliente')}</span><span class="tx-meta">${esc(inv.number || 'Borrador')} · ${esc(fmtDate(inv.date))} · <span class="badge ${st.cls}">${st.label}</span></span></span>
        <span class="tx-amt income">${esc(money(inv.total ?? invTotals(inv).total))}</span>
      </button>`;
    }).join('')}</div>`
      : `<div class="empty"><span class="empty-icon">${icon('receipt', 24)}</span><h3>Sin facturas</h3><p>Crea tu primera factura: el IVA y la retención se calculan solos.</p><button class="btn btn-primary btn-sm" type="button" data-action="new-invoice">Nueva factura</button></div>`}
  </section>`;
}

/* ---------------------------------------------------------------- vista: facturas */
function viewFacturas() {
  const d = store.data;
  const filter = ui.invFilter || 'all';
  const all = [...(d.invoices || [])].sort((a, b) => (b.date.localeCompare(a.date)) || ((b.seq || 0) - (a.seq || 0)));
  const list = all.filter((i) => filter === 'all' || invoiceStatus(i).key === filter || (filter === 'pending' && invoiceStatus(i).key === 'overdue'));
  const cur = currentQuarter();
  const { start, end } = F.quarterRange(cur.year, cur.q);
  const qInv = all.filter((i) => i.number && i.date >= start && i.date <= end);
  const qBase = round(sum(qInv, (i) => invTotals(i).base));
  const qIva = round(sum(qInv, (i) => invTotals(i).iva));
  const pending = all.filter((i) => i.status === 'issued');
  const ready = businessReady();
  const counts = { all: all.length, draft: all.filter((i) => i.status === 'draft').length, pending: pending.length, paid: all.filter((i) => i.status === 'paid').length };
  return `
  <div class="viewhead">
    <div><h1>Facturas</h1><p>Numeración correlativa, IVA y retención de IRPF calculados al momento.</p></div>
    <div class="head-actions">
      <button class="btn btn-ghost" type="button" data-action="new-client">${icon('users', 16)} Nuevo cliente</button>
      <button class="btn btn-primary" type="button" data-action="new-invoice">${icon('plus', 16)} Nueva factura</button>
    </div>
  </div>
  ${ready ? '' : `<div class="banner">${icon('alert', 17)}<span><b>Faltan tus datos fiscales.</b> Puedes preparar borradores, pero para emitir necesitas nombre y NIF.</span><button class="btn btn-soft btn-sm" type="button" data-action="edit-business">Completar</button></div>`}
  <div class="statgrid">
    ${statCard(`Base facturada ${quarterLabel(cur.year, cur.q)}`, bigMoney(qBase), `<span>${qInv.length} factura${qInv.length === 1 ? '' : 's'} emitida${qInv.length === 1 ? '' : 's'}</span>`, 'income', 'invoice')}
    ${statCard('IVA repercutido', bigMoney(qIva), '<span>No es tuyo: se ingresa en el 303</span>', 'expense', 'percent')}
    ${statCard('Pendiente de cobro', bigMoney(round(sum(pending, (i) => i.total))), `<span>${pending.filter((i) => i.dueDate && i.dueDate < todayISO()).length} vencidas</span>`, 'net', 'calendar')}
  </div>
  <section class="card">
    <div class="card-head">
      <div class="seg" role="group" aria-label="Filtrar facturas">
        ${[['all', 'Todas'], ['draft', 'Borradores'], ['pending', 'Pendientes'], ['paid', 'Cobradas']].map(([k, l]) => `<button type="button" data-action="inv-filter" data-value="${k}" class="${filter === k ? 'active' : ''}">${l} <span class="seg-count">${counts[k]}</span></button>`).join('')}
      </div>
    </div>
    ${list.length ? `<div class="table-wrap"><table class="report-table doc-table">
      <thead><tr><th>Número</th><th class="hide-m">Fecha</th><th>Cliente</th><th class="hide-m">Base</th><th>Total</th><th class="hide-m">Estado</th></tr></thead>
      <tbody>${list.map((inv) => {
        const st = invoiceStatus(inv);
        const t = invTotals(inv);
        const c = inv.buyer || clientById(inv.clientId);
        return `<tr class="row-link" data-action="open-invoice" data-id="${esc(inv.id)}" tabindex="0">
          <td>${inv.number ? esc(inv.number) : '<span class="muted">Sin número</span>'}${inv.kind === 'rectificativa' ? ' <span class="badge">Rectificativa</span>' : ''}<span class="cell-sub show-m">${esc(fmtDate(inv.date))}</span></td>
          <td class="hide-m">${esc(fmtDate(inv.date))}</td>
          <td class="cell-text">${esc(c?.name || '—')}<span class="cell-sub show-m"><span class="badge ${st.cls}">${st.label}</span></span></td>
          <td class="hide-m">${esc(money(t.base))}</td>
          <td><b>${esc(money(inv.total ?? t.total))}</b></td>
          <td class="hide-m"><span class="badge ${st.cls}">${st.label}</span></td>
        </tr>`;
      }).join('')}</tbody></table></div>`
      : `<div class="empty"><span class="empty-icon">${icon('receipt', 24)}</span><h3>${all.length ? 'Nada en este filtro' : 'Aún no has hecho facturas'}</h3><p>Crea un cliente y tu primera factura: Mi Cartera aplica el IVA, la retención y la numeración por ti.</p><button class="btn btn-primary btn-sm" type="button" data-action="new-invoice">Nueva factura</button></div>`}
  </section>
  <p class="tiny legal-note">Las facturas cumplen el contenido del Reglamento de facturación (RD 1619/2012). Mi Cartera no es todavía un sistema certificado Verifactu: consulta la sección Impuestos.</p>`;
}

function clientOptions(selected) {
  const clients = [...(store.data.clients || [])].sort((a, b) => a.name.localeCompare(b.name));
  return `<option value="">Elige un cliente…</option>${clients.map((c) => `<option value="${esc(c.id)}"${c.id === selected ? ' selected' : ''}>${esc(c.name)}${c.nif ? ` · ${esc(c.nif)}` : ''}</option>`).join('')}<option value="__new">+ Nuevo cliente…</option>`;
}
function lineRowHTML(l = {}, taxMode = 'normal') {
  const rate = l.ivaRate ?? biz().ivaRate ?? 21;
  return `<div class="inv-line">
    <input class="input" name="l_desc" maxlength="300" placeholder="Concepto (ej. Diseño de logotipo)" value="${esc(l.desc || '')}" aria-label="Concepto">
    <input class="input" name="l_qty" type="number" step="0.001" inputmode="decimal" value="${esc(l.qty ?? 1)}" aria-label="Cantidad">
    <input class="input" name="l_price" type="number" step="0.01" inputmode="decimal" placeholder="0,00" value="${l.price !== undefined ? esc(l.price) : ''}" aria-label="Precio unitario sin IVA">
    <select class="select" name="l_iva" aria-label="IVA"${taxMode !== 'normal' ? ' disabled' : ''}>${F.IVA_RATES.map((r) => `<option value="${r}"${Number(rate) === r ? ' selected' : ''}>${r} %</option>`).join('')}</select>
    <button type="button" class="icon-btn" data-line-remove aria-label="Quitar línea">${icon('trash', 16)}</button>
  </div>`;
}
function readInvoiceForm(form) {
  const fd = new FormData(form);
  const descs = fd.getAll('l_desc');
  const qtys = fd.getAll('l_qty');
  const prices = fd.getAll('l_price');
  const ivas = [...form.querySelectorAll('select[name="l_iva"]')].map((s) => s.value);
  const lines = descs.map((desc, i) => ({ desc: String(desc).trim(), qty: Number(qtys[i]) || 0, price: Number(prices[i]) || 0, discount: 0, ivaRate: Number(ivas[i]) })).filter((l) => l.desc || l.price);
  return {
    clientId: fd.get('clientId') === '__new' ? '' : fd.get('clientId'),
    date: fd.get('date'), opDate: fd.get('opDate') || '', dueDate: fd.get('dueDate') || '',
    taxMode: fd.get('taxMode') || 'normal', irpfRate: Number(fd.get('irpfRate')) || 0, recargo: fd.get('recargo') === 'on',
    note: String(fd.get('note') || '').trim(), lines
  };
}
function totalsBoxHTML(data) {
  const t = F.invoiceTotals(data);
  const mention = F.TAX_MODES[t.mode]?.mention;
  return `<div class="inv-totals">
    <div><span>Base imponible</span><b>${esc(money(t.base))}</b></div>
    ${t.mode === 'normal' ? t.byRate.map((g) => `<div><span>IVA ${g.rate} %${t.byRate.length > 1 ? ` sobre ${esc(money(g.base))}` : ''}</span><b>${esc(money(g.iva))}</b></div>`).join('') : `<div><span>IVA</span><b>${esc(money(0))}</b></div>`}
    ${t.re ? `<div><span>Recargo de equivalencia</span><b>${esc(money(t.re))}</b></div>` : ''}
    ${t.irpf ? `<div><span>Retención IRPF ${t.irpfRate} %</span><b>−${esc(money(t.irpf))}</b></div>` : ''}
    <div class="inv-total"><span>Total a cobrar</span><b>${esc(money(t.total))}</b></div>
    ${mention ? `<small>${esc(mention)}</small>` : ''}
  </div>`;
}
function clientDefaults(client) {
  const b = biz();
  const irpf = client?.irpfRate !== null && client?.irpfRate !== undefined ? client.irpfRate
    : (!client || client.kind === 'particular' || b.activity === 'empresarial' ? 0 : (b.irpfRate ?? 15));
  return { taxMode: client?.taxMode || 'normal', irpfRate: irpf, recargo: Boolean(client?.recargo) };
}
function openInvoiceModal(inv = null, template = null) {
  const src = inv || template || {};
  const isDraft = !inv || inv.status === 'draft';
  if (!isDraft) return openInvoiceView(inv);
  const firstClient = src.clientId ? clientById(src.clientId) : null;
  const defs = src.clientId ? { taxMode: src.taxMode || 'normal', irpfRate: src.irpfRate ?? 0, recargo: Boolean(src.recargo) } : clientDefaults(firstClient);
  const irpfVals = [...new Set([...F.IRPF_OPTIONS.map((o) => o.value), Number(defs.irpfRate)])];
  const lines = src.lines?.length ? src.lines : [{ qty: 1 }];
  openSheet({
    title: inv ? 'Editar borrador' : (template ? 'Duplicar factura' : 'Nueva factura'),
    subtitle: businessReady() ? `Se numerará como ${biz().series || 'F'}${(src.date || todayISO()).slice(0, 4)}-… al emitirla.` : 'Completa tus datos fiscales en Ajustes para poder emitirla.',
    wide: true,
    submitLabel: 'Emitir factura',
    secondaryLabel: 'Guardar borrador',
    dangerLabel: inv ? 'Eliminar' : '',
    body: `
      <div class="form-grid">
        <div class="field"><span>Cliente</span><select name="clientId" data-inv-client>${clientOptions(src.clientId)}</select></div>
        <div class="field"><span>Fecha de la factura</span><input name="date" type="date" value="${esc(src.date && inv ? src.date : todayISO())}" required></div>
      </div>
      <div class="field"><span>Conceptos <span class="hint">(precios sin IVA)</span></span>
        <div class="inv-lines-head"><span>Descripción</span><span>Cant.</span><span>Precio</span><span>IVA</span><span></span></div>
        <div class="inv-lines" data-lines>${lines.map((l) => lineRowHTML(l, defs.taxMode)).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-line-add style="align-self:flex-start">${icon('plus', 14)} Añadir línea</button>
      </div>
      <div class="form-grid">
        <div class="field"><span>Tipo de operación</span><select name="taxMode">${Object.entries(F.TAX_MODES).map(([k, m]) => `<option value="${k}"${defs.taxMode === k ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div>
        <div class="field"><span>Retención de IRPF</span><select name="irpfRate">${irpfVals.map((v) => `<option value="${v}"${Number(defs.irpfRate) === v ? ' selected' : ''}>${esc(F.IRPF_OPTIONS.find((o) => o.value === v)?.label || `${v} %`)}</option>`).join('')}</select></div>
      </div>
      <label class="checkbox"><input type="checkbox" name="recargo"${defs.recargo ? ' checked' : ''}> Aplicar recargo de equivalencia (cliente comerciante minorista)</label>
      <details class="howto"><summary>Más opciones</summary>
        <div class="form-grid" style="margin-top:10px">
          <div class="field"><span>Fecha de la operación <span class="hint">(si es distinta)</span></span><input name="opDate" type="date" value="${esc(src.opDate || '')}"></div>
          <div class="field"><span>Vencimiento <span class="hint">(por defecto ${esc(biz().paymentDays ?? 30)} días)</span></span><input name="dueDate" type="date" value="${esc(inv ? src.dueDate || '' : '')}"></div>
        </div>
        <div class="field" style="margin-top:10px"><span>Notas en la factura <span class="hint">(opcional)</span></span><input name="note" maxlength="600" value="${esc(src.note || '')}" placeholder="Ej. Proyecto web, fase 1"></div>
      </details>
      <div data-inv-totals>${totalsBoxHTML({ ...defs, lines })}</div>`,
    onMount(dialog, form) {
      const linesHost = dialog.querySelector('[data-lines]');
      const update = () => {
        const data = readInvoiceForm(form);
        const mode = data.taxMode;
        form.querySelectorAll('select[name="l_iva"]').forEach((s) => { s.disabled = mode !== 'normal'; });
        dialog.querySelector('[data-inv-totals]').innerHTML = totalsBoxHTML(data);
      };
      dialog.querySelector('[data-line-add]').addEventListener('click', () => {
        linesHost.insertAdjacentHTML('beforeend', lineRowHTML({ qty: 1 }, form.taxMode.value));
        linesHost.lastElementChild.querySelector('input').focus();
        update();
      });
      linesHost.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-line-remove]');
        if (!btn) return;
        if (linesHost.children.length > 1) btn.closest('.inv-line').remove();
        else btn.closest('.inv-line').querySelectorAll('input').forEach((i) => { i.value = i.name === 'l_qty' ? 1 : ''; });
        update();
      });
      const clientSel = dialog.querySelector('[data-inv-client]');
      clientSel.addEventListener('change', () => {
        if (clientSel.value === '__new') {
          clientSel.value = '';
          openClientModal(null, (created) => {
            clientSel.innerHTML = clientOptions(created?.id);
            clientSel.dispatchEvent(new Event('change'));
          });
          return;
        }
        const d = clientDefaults(clientById(clientSel.value));
        form.taxMode.value = d.taxMode;
        if (![...form.irpfRate.options].some((o) => Number(o.value) === Number(d.irpfRate))) form.irpfRate.insertAdjacentHTML('beforeend', `<option value="${d.irpfRate}">${d.irpfRate} %</option>`);
        form.irpfRate.value = String(d.irpfRate);
        form.recargo.checked = d.recargo;
        update();
      });
      form.addEventListener('input', update);
      form.addEventListener('change', update);
    },
    async onSecondary(dialog, form) {
      const data = readInvoiceForm(form);
      if (inv) await api('PATCH', `api/invoices/${inv.id}`, data);
      else await api('POST', 'api/invoices', data);
      dialog.close();
      render();
      toast('Borrador guardado');
    },
    async onSubmit(fd, dialog) {
      const data = readInvoiceForm(dialog.querySelector('form'));
      if (!data.clientId) throw new Error('Elige un cliente.');
      if (!businessReady()) throw new Error('Antes de emitir, completa tu nombre y NIF en Ajustes → Mi negocio.');
      const ok = await confirmDialog({ title: 'Emitir factura', message: 'Una factura emitida recibe número y ya no se puede modificar ni borrar (solo rectificar). ¿Emitir ahora?', confirm: 'Emitir', danger: false });
      if (!ok) return false;
      const res = inv ? await api('PATCH', `api/invoices/${inv.id}`, { ...data, issue: true }) : await api('POST', 'api/invoices', { ...data, issue: true });
      render();
      const created = byId(store.data.invoices, inv?.id || res.createdId);
      toast(`Factura ${created?.number || ''} emitida`);
      if (created) setTimeout(() => openInvoiceView(created), 120);
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({ title: 'Eliminar borrador', message: 'El borrador se borrará. No afecta a la numeración.' });
      if (!ok) return;
      await api('DELETE', `api/invoices/${inv.id}`);
      dialog.close();
      render();
      toast('Borrador eliminado');
    }
  });
}
function openInvoiceView(inv) {
  const st = invoiceStatus(inv);
  const rect = inv.rectifiesId ? byId(store.data.invoices, inv.rectifiesId) : null;
  const rectBy = (store.data.invoices || []).filter((i) => i.rectifiesId === inv.id);
  openSheet({
    title: `Factura ${inv.number}`,
    subtitle: `${inv.buyer?.name || ''} · ${fmtDate(inv.date)}`,
    wide: true,
    hideSubmit: true,
    body: `
      <div class="inv-view-head"><span class="badge ${st.cls}">${st.label}</span>
        ${inv.status === 'paid' ? `<span class="tiny">Cobrada el ${esc(fmtDate(inv.paidDate))}</span>` : inv.dueDate ? `<span class="tiny">Vence el ${esc(fmtDate(inv.dueDate))}</span>` : ''}
        ${rect ? `<span class="tiny">Rectifica a ${esc(rect.number || '')}</span>` : ''}
        ${rectBy.length ? `<span class="tiny">Rectificada por ${rectBy.map((r) => esc(r.number || 'borrador')).join(', ')}</span>` : ''}
      </div>
      <div class="inv-preview">${invoiceDocBody(inv)}</div>
      <div class="inv-actions">
        <button type="button" class="btn btn-primary btn-sm" data-action="print-invoice" data-id="${esc(inv.id)}">${icon('download', 14)} PDF / imprimir</button>
        ${inv.status === 'paid'
          ? `<button type="button" class="btn btn-ghost btn-sm" data-action="unpay-invoice" data-id="${esc(inv.id)}">Marcar como pendiente</button>`
          : `<button type="button" class="btn btn-soft btn-sm" data-action="pay-invoice" data-id="${esc(inv.id)}">${icon('check', 14)} Marcar como cobrada</button>`}
        <button type="button" class="btn btn-ghost btn-sm" data-action="duplicate-invoice" data-id="${esc(inv.id)}">${icon('copy', 14)} Duplicar</button>
        ${inv.kind !== 'rectificativa' ? `<button type="button" class="btn btn-ghost btn-sm" data-action="rectify-invoice" data-id="${esc(inv.id)}">${icon('refresh', 14)} Rectificar</button>` : ''}
      </div>
      <p class="tiny">Una factura emitida no se puede editar ni borrar. Si hay un error, emite una rectificativa: la app la prepara con los importes en negativo.</p>`
  });
}
function invoiceDocBody(inv) {
  const t = invTotals(inv);
  const s = inv.seller || biz();
  const c = inv.buyer || clientById(inv.clientId) || {};
  const rect = inv.rectifiesId ? byId(store.data.invoices, inv.rectifiesId) : null;
  const mention = F.TAX_MODES[t.mode]?.mention;
  const addr = (x) => [x.address, [x.zip, x.city].filter(Boolean).join(' '), x.province, x.country && x.country !== 'España' ? x.country : ''].filter(Boolean).map(esc).join('<br>');
  const fm = (n) => esc(money(n));
  return `<div class="idoc">
    <div class="idoc-head">
      <div><div class="idoc-title">${inv.kind === 'rectificativa' ? 'Factura rectificativa' : 'Factura'}</div>
        <div class="idoc-num">${inv.number ? `Nº ${esc(inv.number)}` : 'BORRADOR · sin validez'}</div></div>
      <div class="idoc-dates">
        <div><span>Fecha de expedición</span><b>${esc(fmtDate(inv.date))}</b></div>
        ${inv.opDate && inv.opDate !== inv.date ? `<div><span>Fecha de operación</span><b>${esc(fmtDate(inv.opDate))}</b></div>` : ''}
        ${inv.dueDate ? `<div><span>Vencimiento</span><b>${esc(fmtDate(inv.dueDate))}</b></div>` : ''}
      </div>
    </div>
    <div class="idoc-parties">
      <div><span class="idoc-label">Emisor</span><b>${esc(s.name || 'Tu nombre')}</b>${s.tradeName ? `<br>${esc(s.tradeName)}` : ''}<br>NIF: ${esc(s.nif || '—')}<br>${addr(s)}${s.email ? `<br>${esc(s.email)}` : ''}</div>
      <div><span class="idoc-label">Cliente</span><b>${esc(c.name || '—')}</b><br>${c.nif ? `NIF: ${esc(c.nif)}<br>` : ''}${addr(c)}</div>
    </div>
    ${rect ? `<p class="idoc-note">Rectifica la factura ${esc(rect.number || '')} de fecha ${esc(fmtDate(rect.date))}. Motivo: ${esc(inv.rectifyReason || 'corrección')}.</p>` : ''}
    <table class="idoc-lines"><thead><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>IVA</th><th>Importe</th></tr></thead>
      <tbody>${t.lines.map((l) => `<tr><td>${esc(l.desc)}</td><td>${esc(String(l.qty).replace('.', ','))}</td><td>${fm(l.price)}</td><td>${t.mode === 'normal' ? `${l.ivaRate} %` : '—'}</td><td>${fm(l.base)}</td></tr>`).join('')}</tbody></table>
    <div class="idoc-totals">
      <div><span>Base imponible</span><b>${fm(t.base)}</b></div>
      ${t.mode === 'normal' ? t.byRate.map((g) => `<div><span>IVA ${g.rate} % s/ ${fm(g.base)}</span><b>${fm(g.iva)}</b></div>`).join('') : ''}
      ${t.re ? t.byRate.filter((g) => g.re).map((g) => `<div><span>Recargo equivalencia ${F.RECARGO[g.rate]} %</span><b>${fm(g.re)}</b></div>`).join('') : ''}
      ${t.irpf ? `<div><span>Retención IRPF ${t.irpfRate} %</span><b>−${fm(t.irpf)}</b></div>` : ''}
      <div class="idoc-grand"><span>Total</span><b>${fm(t.total)}</b></div>
    </div>
    ${mention ? `<p class="idoc-note">${esc(mention)}</p>` : ''}
    ${inv.note ? `<p class="idoc-note">${esc(inv.note)}</p>` : ''}
    ${s.iban ? `<p class="idoc-note">Forma de pago: transferencia a ${esc(s.iban)}</p>` : ''}
    ${s.footer ? `<p class="idoc-foot">${esc(s.footer)}</p>` : ''}
  </div>`;
}
function printInvoice(inv) {
  const css = `*{box-sizing:border-box}body{font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1c1e;margin:0;padding:32px;font-size:12.5px;line-height:1.45}
  .idoc-head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #1c1c1e;padding-bottom:14px;margin-bottom:18px}
  .idoc-title{font-size:24px;font-weight:650;letter-spacing:-.02em}.idoc-num{font-size:14px;color:#555;margin-top:2px}
  .idoc-dates{text-align:right}.idoc-dates div{margin-bottom:3px}.idoc-dates span,.idoc-label{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#777}
  .idoc-parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px}.idoc-label{margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}th{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#777;text-align:right;border-bottom:1px solid #ccc;padding:6px}
  td{text-align:right;padding:8px 6px;border-bottom:1px solid #eee;vertical-align:top}th:first-child,td:first-child{text-align:left}
  .idoc-totals{margin-left:auto;width:300px}.idoc-totals div{display:flex;justify-content:space-between;padding:4px 0}
  .idoc-grand{border-top:2px solid #1c1c1e;margin-top:6px;padding-top:8px!important;font-size:16px}.idoc-note{color:#444;margin:12px 0 0}.idoc-foot{color:#777;font-size:11px;margin-top:28px;border-top:1px solid #eee;padding-top:10px}
  @page{size:A4;margin:14mm}@media print{body{padding:0}}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(inv.number || 'Borrador')} · ${esc(inv.buyer?.name || '')}</title><style>${css}</style></head><body>${invoiceDocBody(inv)}</body></html>`;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch { toast('No se pudo abrir la impresión.', 'error'); }
    setTimeout(() => frame.remove(), 60000);
  }, 250);
}
function openPayModal(inv) {
  openSheet({
    title: `Cobrar ${inv.number}`,
    subtitle: `Se apuntará un ingreso de ${money(inv.total)} en la cuenta que elijas.`,
    submitLabel: 'Registrar cobro',
    body: `<div class="form-grid">
      <div class="field"><span>Cuenta</span><select name="accountId">${accountOptions(store.data.accounts[0]?.id)}</select></div>
      <div class="field"><span>Fecha del cobro</span><input name="date" type="date" value="${esc(todayISO())}"></div>
    </div>`,
    async onSubmit(fd) {
      await api('POST', `api/invoices/${inv.id}/pay`, { accountId: fd.get('accountId'), date: fd.get('date') });
      render();
      toast('Cobro registrado');
    }
  });
}
function closeOpenSheets() { for (const d of $$('dialog.sheet[open]')) { d.close(); d.remove(); } }

/* ---------------------------------------------------------------- vista: clientes */
function viewClientes() {
  const clients = [...(store.data.clients || [])].sort((a, b) => a.name.localeCompare(b.name));
  const invs = store.data.invoices || [];
  return `
  <div class="viewhead">
    <div><h1>Clientes</h1><p>Sus datos fiscales se copian en cada factura. El NIF se valida al escribirlo.</p></div>
    <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-client">${icon('plus', 16)} Nuevo cliente</button></div>
  </div>
  <section class="card">
    ${clients.length ? `<div class="table-wrap"><table class="report-table doc-table">
      <thead><tr><th>Cliente</th><th class="hide-m">NIF</th><th class="hide-m">Tipo</th><th>Facturado</th><th>Pendiente</th></tr></thead>
      <tbody>${clients.map((c) => {
        const mine = invs.filter((i) => i.clientId === c.id && i.number);
        return `<tr class="row-link" data-action="edit-client" data-id="${esc(c.id)}" tabindex="0">
          <td class="cell-text"><b>${esc(c.name)}</b>${c.city ? `<br><span class="muted">${esc(c.city)}</span>` : ''}<span class="cell-sub show-m">${esc(c.nif || 'Sin NIF')}</span></td>
          <td class="hide-m">${esc(c.nif || '—')}</td><td class="hide-m">${esc(CLIENT_KIND_LABELS[c.kind] || '')}${c.taxMode !== 'normal' ? ` · ${esc(F.TAX_MODES[c.taxMode].label)}` : ''}</td>
          <td>${esc(money(sum(mine, (i) => invTotals(i).base)))}</td>
          <td>${esc(money(sum(mine.filter((i) => i.status === 'issued'), (i) => i.total)))}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`
      : `<div class="empty"><span class="empty-icon">${icon('users', 24)}</span><h3>Sin clientes todavía</h3><p>Añade a quién facturas. Si es empresa o autónomo, necesitas su NIF.</p><button class="btn btn-primary btn-sm" type="button" data-action="new-client">Nuevo cliente</button></div>`}
  </section>`;
}
function openClientModal(client = null, onSaved = null) {
  const kind = client?.kind || 'empresa';
  openSheet({
    title: client ? 'Editar cliente' : 'Nuevo cliente',
    subtitle: 'Datos que aparecerán en sus facturas.',
    submitLabel: client ? 'Guardar' : 'Crear cliente',
    dangerLabel: client ? 'Eliminar' : '',
    body: `
      <div class="field"><span>Tipo de cliente</span><div class="seg seg--full" data-seg="client-kind">${Object.entries(CLIENT_KIND_LABELS).map(([k, l]) => `<button type="button" data-value="${k}" class="${kind === k ? 'active' : ''}">${l}</button>`).join('')}</div><input type="hidden" name="kind" value="${kind}"></div>
      <div class="form-grid">
        <div class="field"><span>Nombre o razón social</span><input name="name" maxlength="120" value="${esc(client?.name || '')}" required></div>
        <div class="field"><span>NIF / CIF / NIE <span class="hint" data-nif-opt${kind === 'particular' ? '' : ' hidden'}>(opcional)</span></span><input name="nif" maxlength="20" value="${esc(client?.nif || '')}" data-nif autocapitalize="characters"><small class="nif-hint">${nifHint(client?.nif)}</small></div>
      </div>
      <div class="field"><span>Dirección</span><input name="address" maxlength="160" value="${esc(client?.address || '')}"></div>
      <div class="form-grid form-grid--3">
        <div class="field"><span>C. postal</span><input name="zip" maxlength="10" value="${esc(client?.zip || '')}"></div>
        <div class="field"><span>Localidad</span><input name="city" maxlength="80" value="${esc(client?.city || '')}"></div>
        <div class="field"><span>País</span><input name="country" maxlength="40" value="${esc(client?.country || 'España')}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Email <span class="hint">(opcional)</span></span><input name="email" type="email" maxlength="120" value="${esc(client?.email || '')}"></div>
        <div class="field"><span>Operación habitual</span><select name="taxMode">${Object.entries(F.TAX_MODES).map(([k, m]) => `<option value="${k}"${(client?.taxMode || 'normal') === k ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Retención por defecto</span><select name="irpfRate"><option value="">Automática según tu perfil</option>${F.IRPF_OPTIONS.map((o) => `<option value="${o.value}"${client?.irpfRate === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
        <label class="checkbox" style="align-self:end;padding-bottom:12px"><input type="checkbox" name="recargo"${client?.recargo ? ' checked' : ''}> Recargo de equivalencia</label>
      </div>
      <p class="tiny">Empresas y autónomos: con actividad profesional se aplica tu retención (15 % o 7 %). A particulares no se les retiene.</p>`,
    onMount(dialog) {
      const seg = dialog.querySelector('[data-seg="client-kind"]');
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
        dialog.querySelector('input[name="kind"]').value = b.dataset.value;
        dialog.querySelector('[data-nif-opt]').hidden = b.dataset.value !== 'particular';
      });
    },
    async onSubmit(fd) {
      const body = Object.fromEntries(['kind', 'name', 'nif', 'address', 'zip', 'city', 'country', 'email', 'taxMode', 'irpfRate'].map((k) => [k, fd.get(k)]));
      body.recargo = fd.get('recargo') === 'on';
      if (body.kind !== 'particular' && !body.nif) throw new Error('Para empresas y autónomos el NIF es obligatorio en la factura.');
      const res = client ? await api('PATCH', `api/clients/${client.id}`, body) : await api('POST', 'api/clients', body);
      render();
      toast(client ? 'Cliente guardado' : 'Cliente creado');
      onSaved?.(byId(store.data.clients, client?.id || res.createdId));
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({ title: 'Eliminar cliente', message: 'Solo se puede eliminar si no tiene facturas emitidas.' });
      if (!ok) return;
      await api('DELETE', `api/clients/${client.id}`);
      dialog.close();
      render();
      toast('Cliente eliminado');
    }
  });
}

/* ---------------------------------------------------------------- vista: gastos del negocio */
function viewGastos() {
  const cur = currentQuarter();
  const sel = ui.gastosQ || 'q';
  const { start, end } = sel === 'y' ? { start: `${cur.year}-01-01`, end: `${cur.year}-12-31` } : F.quarterRange(cur.year, cur.q);
  const all = [...(store.data.purchases || [])].sort((a, b) => b.date.localeCompare(a.date));
  const list = sel === 'all' ? all : all.filter((p) => p.date >= start && p.date <= end);
  const tot = list.map((p) => F.purchaseTotals(p));
  return `
  <div class="viewhead">
    <div><h1>Gastos del negocio</h1><p>Las facturas que recibes. Restan IVA en el 303 y rendimiento en el 130.</p></div>
    <div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-purchase">${icon('plus', 16)} Nuevo gasto</button></div>
  </div>
  <div class="statgrid">
    ${statCard('Gasto deducible', bigMoney(round(sum(tot, (t) => t.gastoDeducible))), '<span>Resta en tu IRPF</span>', 'expense', 'receipt')}
    ${statCard('IVA soportado deducible', bigMoney(round(sum(tot, (t) => t.ivaDeducible))), '<span>Resta en tu IVA</span>', 'income', 'percent')}
    ${statCard('Facturas recibidas', `<span class="fig-int">${list.length}</span>`, `<span>${sel === 'q' ? quarterLabel(cur.year, cur.q) : sel === 'y' ? `Año ${cur.year}` : 'Todas'}</span>`, 'net', 'list')}
  </div>
  <section class="card">
    <div class="card-head">
      <div class="seg" role="group" aria-label="Periodo">${[['q', 'Este trimestre'], ['y', 'Este año'], ['all', 'Todos']].map(([k, l]) => `<button type="button" data-action="gastos-period" data-value="${k}" class="${sel === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    </div>
    ${list.length ? `<div class="table-wrap"><table class="report-table doc-table">
      <thead><tr><th class="hide-m">Fecha</th><th>Proveedor</th><th class="hide-m">Tipo</th><th class="hide-m">Base</th><th>IVA deducible</th><th>Total</th></tr></thead>
      <tbody>${list.map((p, i) => `<tr class="row-link" data-action="edit-purchase" data-id="${esc(p.id)}" tabindex="0">
        <td class="hide-m">${esc(fmtDate(p.date))}</td><td class="cell-text"><b>${esc(p.supplier)}</b>${p.concept ? `<br><span class="muted">${esc(p.concept)}</span>` : ''}<span class="cell-sub show-m">${esc(fmtDate(p.date))}</span></td>
        <td class="cell-text hide-m">${esc(PURCHASE_KIND_INFO[p.kind]?.label || p.kind)}${tot[i].pct < 100 ? ` · ${tot[i].pct} %` : ''}</td>
        <td class="hide-m">${esc(money(tot[i].base))}</td><td>${esc(money(tot[i].ivaDeducible))}</td><td><b>${esc(money(tot[i].total))}</b></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><span class="empty-icon">${icon('receipt', 24)}</span><h3>Sin gastos en este periodo</h3><p>Apunta las facturas de proveedores, tu cuota de autónomos, la gestoría o el móvil: todo lo que sea deducible.</p><button class="btn btn-primary btn-sm" type="button" data-action="new-purchase">Nuevo gasto</button></div>`}
  </section>
  <p class="tiny legal-note">Para que un gasto sea deducible debe estar vinculado a la actividad, justificado con factura a tu nombre y registrado. Ante la duda, pregunta a tu asesor.</p>`;
}
function purchaseTotalsHTML(p) {
  const t = F.purchaseTotals(p);
  return `<div class="op-total"><span>Total pagado</span><b>${esc(money(t.total))}</b><small>IVA deducible ${esc(money(t.ivaDeducible))} · gasto deducible en IRPF ${esc(money(t.gastoDeducible))}${t.irpf ? ` · retención que ingresas ${esc(money(t.irpf))}` : ''}</small></div>`;
}
function openPurchaseModal(p = null, preset = {}) {
  const src = { ...preset, ...(p || {}) };
  const kind = src.kind || 'otros';
  const info = PURCHASE_KIND_INFO[kind];
  const linked = p ? Boolean(p.transactionId) : true;
  openSheet({
    title: p ? 'Editar gasto' : 'Nuevo gasto del negocio',
    subtitle: 'Copia los datos de la factura que te han dado.',
    submitLabel: p ? 'Guardar' : 'Añadir gasto',
    dangerLabel: p ? 'Eliminar' : '',
    body: `
      <div class="form-grid">
        <div class="field"><span>Tipo de gasto</span><select name="kind" data-p-kind>${Object.entries(PURCHASE_KIND_INFO).map(([k, x]) => `<option value="${k}"${kind === k ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
        <div class="field"><span>Fecha de la factura</span><input name="date" type="date" value="${esc(src.date || todayISO())}"></div>
      </div>
      <p class="tiny" data-p-hint${info.hint ? '' : ' hidden'}>${esc(info.hint || '')}</p>
      <div class="form-grid">
        <div class="field"><span>Proveedor</span><input name="supplier" maxlength="120" value="${esc(src.supplier || '')}" placeholder="Ej. Movistar"></div>
        <div class="field"><span>NIF del proveedor <span class="hint">(opcional)</span></span><input name="supplierNif" maxlength="20" value="${esc(src.supplierNif || '')}" data-nif><small class="nif-hint">${nifHint(src.supplierNif)}</small></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Concepto <span class="hint">(opcional)</span></span><input name="concept" maxlength="200" value="${esc(src.concept || '')}"></div>
        <div class="field"><span>Nº de factura <span class="hint">(opcional)</span></span><input name="number" maxlength="40" value="${esc(src.number || '')}"></div>
      </div>
      <div class="form-grid form-grid--3">
        <div class="field"><span>Base imponible</span><input name="base" type="number" min="0" step="0.01" inputmode="decimal" value="${src.base !== undefined ? esc(src.base) : ''}" placeholder="0,00" required></div>
        <div class="field" data-p-iva${info.noIva ? ' hidden' : ''}><span>IVA</span><select name="ivaRate">${F.IVA_RATES.map((r) => `<option value="${r}"${Number(src.ivaRate ?? 21) === r ? ' selected' : ''}>${r} %</option>`).join('')}</select></div>
        <div class="field"><span>% afecto a la actividad</span><input name="deductiblePct" type="number" min="0" max="100" step="1" value="${esc(src.deductiblePct ?? info.pct)}"></div>
      </div>
      <details class="howto"><summary>Más opciones</summary>
        <div class="form-grid" style="margin-top:10px">
          <div class="field"><span>Cuota de IVA exacta <span class="hint">(si no cuadra)</span></span><input name="ivaAmount" type="number" step="0.01" value="${src.ivaAmount ?? ''}"></div>
          <div class="field"><span>Retención que practicas</span><select name="irpfRate">${[0, 15, 7, 19].map((v) => `<option value="${v}"${Number(src.irpfRate ?? info.irpf ?? 0) === v ? ' selected' : ''}>${v ? `${v} %` : 'Ninguna'}</option>`).join('')}</select></div>
        </div>
        <label class="checkbox" style="margin-top:10px"><input type="checkbox" name="ivaNoDeducible"${src.ivaNoDeducible ? ' checked' : ''}> El IVA no es deducible (ej. tique sin datos fiscales, comidas)</label>
      </details>
      <div class="form-grid">
        <div class="field"><span>Pagado desde</span><select name="accountId"><option value="">No apuntar en mis cuentas</option>${store.data.accounts.map((a) => `<option value="${esc(a.id)}"${(p ? p.accountId === a.id : linked && a.id === store.data.accounts[0]?.id) ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
        <div data-p-total>${purchaseTotalsHTML(src)}</div>
      </div>`,
    onMount(dialog, form) {
      const read = () => {
        const fd = new FormData(form);
        return { kind: fd.get('kind'), base: Number(fd.get('base')) || 0, ivaRate: PURCHASE_KIND_INFO[fd.get('kind')]?.noIva ? 0 : Number(fd.get('ivaRate')), ivaAmount: fd.get('ivaAmount'), deductiblePct: Number(fd.get('deductiblePct')), irpfRate: Number(fd.get('irpfRate')), ivaNoDeducible: fd.get('ivaNoDeducible') === 'on' };
      };
      const update = () => { dialog.querySelector('[data-p-total]').innerHTML = purchaseTotalsHTML(read()); };
      dialog.querySelector('[data-p-kind]').addEventListener('change', (e) => {
        const x = PURCHASE_KIND_INFO[e.target.value];
        const hint = dialog.querySelector('[data-p-hint]');
        hint.hidden = !x.hint; hint.textContent = x.hint || '';
        dialog.querySelector('[data-p-iva]').hidden = Boolean(x.noIva);
        form.deductiblePct.value = x.pct;
        form.irpfRate.value = String(x.irpf || 0);
        if (e.target.value === 'reta' && !form.supplier.value) form.supplier.value = 'Seguridad Social (RETA)';
        if (e.target.value === 'reta' && !form.base.value && retaMonthlyNow()) form.base.value = retaMonthlyNow();
        update();
      });
      form.addEventListener('input', update);
      form.addEventListener('change', update);
    },
    async onSubmit(fd) {
      const body = Object.fromEntries(['kind', 'date', 'supplier', 'supplierNif', 'concept', 'number', 'base', 'ivaRate', 'deductiblePct', 'ivaAmount', 'irpfRate', 'accountId'].map((k) => [k, fd.get(k)]));
      body.ivaNoDeducible = fd.get('ivaNoDeducible') === 'on';
      if (p) await api('PATCH', `api/purchases/${p.id}`, body);
      else await api('POST', 'api/purchases', body);
      render();
      toast(p ? 'Gasto guardado' : 'Gasto añadido');
    },
    async onDanger(dialog) {
      const ok = await confirmDialog({ title: 'Eliminar gasto', message: 'También se borrará el movimiento asociado en tus cuentas.' });
      if (!ok) return;
      await api('DELETE', `api/purchases/${p.id}`);
      dialog.close();
      render();
      toast('Gasto eliminado');
    }
  });
}

/* ---------------------------------------------------------------- vista: impuestos */
function viewImpuestos() {
  const def = quarterToFile();
  const year = ui.taxYear || def.year;
  const q = ui.taxQ || def.q;
  const { m303, m130, exento130 } = hacienda(year, q);
  const deadlines = F.upcomingDeadlines(todayISO(), { count: 5 });
  const d = F.quarterDeadline(year, q);
  const left = daysUntil(d.to);
  const fm = (n) => esc(money(n));
  const years = [...new Set([currentQuarter().year, currentQuarter().year - 1, ...(store.data.invoices || []).map((i) => Number(i.date.slice(0, 4)))])].sort((a, b) => b - a);
  const notice = territoryNotice(biz().territory);
  const res303 = m303.resultado;
  const casillasRate = { 4: ['01', '03'], 10: ['04', '06'], 21: ['07', '09'] };
  return `
  <div class="viewhead">
    <div><h1>Impuestos</h1><p>Tus modelos trimestrales calculados con tus facturas y gastos. Cópialos en la sede de la Agencia Tributaria.</p></div>
    <div class="head-actions">
      <select class="select select--sm" id="taxYear" aria-label="Año">${years.map((y) => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}</select>
      <div class="seg" role="group" aria-label="Trimestre">${[1, 2, 3, 4].map((k) => `<button type="button" data-action="tax-q" data-value="${k}" class="${k === q ? 'active' : ''}">${k}T</button>`).join('')}</div>
    </div>
  </div>
  ${notice ? `<div class="banner">${icon('alert', 17)}<span>${esc(notice)}</span></div>` : ''}
  <div class="banner ${left >= 0 && left <= 15 ? 'banner--warn' : ''}">${icon('calendar', 17)}<span><b>${quarterLabel(year, q)}:</b> se presenta ${esc(deadlineText(year, q))}${left >= 0 ? ` · quedan ${left} días` : ' · plazo cerrado'}. Si domicilias el pago, el plazo acaba 5 días antes.</span></div>
  <div class="statgrid">
    ${statCard('IVA · modelo 303', bigMoney(Math.abs(res303)), `<span>${res303 >= 0 ? 'A ingresar' : q === 4 ? 'A devolver o compensar' : 'A compensar en el siguiente'}</span>`, res303 > 0 ? 'expense' : 'income', 'percent')}
    ${statCard('IRPF · modelo 130', bigMoney(exento130 ? 0 : m130.resultado), `<span>${exento130 ? 'Probablemente no lo presentes (ver nota)' : m130.bruto < 0 ? 'Sale negativo: se presenta a cero' : 'A ingresar'}</span>`, 'expense', 'invoice')}
    ${statCard('Total a apartar', bigMoney(Math.max(0, res303) + (exento130 ? 0 : m130.resultado)), '<span>Guárdalo aparte para no llevarte sustos</span>', 'net', 'shield')}
  </div>
  <div class="grid-2">
    <section class="card">
      <div class="card-head"><div><h2>Modelo 303 · IVA</h2><p>${m303.invoices} facturas emitidas · ${m303.purchases} gastos</p></div></div>
      <div class="table-wrap"><table class="report-table tax-table">
        <thead><tr><th>Concepto</th><th>Casilla</th><th>Base</th><th>Cuota</th></tr></thead>
        <tbody>
          ${m303.repercutido.length ? m303.repercutido.map((r) => `<tr><td>IVA repercutido ${r.rate} %</td><td>${casillasRate[r.rate] ? casillasRate[r.rate].join(' / ') : '—'}</td><td>${fm(r.base)}</td><td>${fm(r.cuota)}</td></tr>`).join('') : '<tr><td>IVA repercutido</td><td>—</td><td>—</td><td>0</td></tr>'}
          ${m303.recargo ? `<tr><td>Recargo de equivalencia</td><td>—</td><td></td><td>${fm(m303.recargo)}</td></tr>` : ''}
          <tr class="row-sub"><td>Total devengado</td><td>27</td><td></td><td>${fm(m303.devengado)}</td></tr>
          <tr><td>IVA soportado deducible</td><td>28 / 29</td><td>${fm(m303.baseSoportado)}</td><td>−${fm(m303.soportado)}</td></tr>
          <tr class="row-total"><td>Resultado</td><td>46</td><td></td><td>${fm(m303.resultado)}</td></tr>
          ${m303.baseNoSujeta ? `<tr><td>Operaciones sin IVA español (UE, exportación, exentas, ISP)</td><td>—</td><td>${fm(m303.baseNoSujeta)}</td><td></td></tr>` : ''}
        </tbody></table></div>
      ${q === 4 ? '<p class="tiny">En enero también presentas el resumen anual de IVA (modelo 390), con los totales de los cuatro trimestres.</p>' : ''}
      ${m303.baseNoSujeta ? '<p class="tiny">Si facturas a empresas de la UE, también presentas el modelo 349 (declaración recapitulativa).</p>' : ''}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Modelo 130 · IRPF</h2><p>Acumulado del 1 de enero al ${esc(fmtDate(m130.end))}</p></div></div>
      <div class="table-wrap"><table class="report-table tax-table">
        <thead><tr><th>Concepto</th><th>Casilla</th><th>Importe</th></tr></thead>
        <tbody>
          <tr><td>Ingresos (base de tus facturas)</td><td>01</td><td>${fm(m130.ingresos)}</td></tr>
          <tr><td>Gastos deducibles${m130.retaAuto ? ` <span class="muted">(incluye ${fm(m130.retaAuto)} de cuota de autónomos)</span>` : ''}</td><td>02</td><td>${fm(m130.gastos + m130.dificil)}</td></tr>
          ${m130.dificil ? `<tr class="row-note"><td colspan="2">· de ellos, 5 % gastos de difícil justificación (máx. 2.000 €/año)</td><td>${fm(m130.dificil)}</td></tr>` : ''}
          <tr class="row-sub"><td>Rendimiento neto</td><td>03</td><td>${fm(m130.rendimiento)}</td></tr>
          <tr><td>20 % del rendimiento</td><td>04</td><td>${fm(m130.cuota20)}</td></tr>
          <tr><td>Pagos de trimestres anteriores</td><td>05</td><td>${m130.anteriores ? '−' : ''}${fm(m130.anteriores)}</td></tr>
          <tr><td>Retenciones que te han hecho</td><td>06</td><td>${m130.retenciones ? '−' : ''}${fm(m130.retenciones)}</td></tr>
          <tr class="row-total"><td>Resultado</td><td>07</td><td>${fm(m130.bruto)}</td></tr>
        </tbody></table></div>
      ${exento130 ? `<p class="tiny tax-hint">${icon('check', 13)} El ${esc(percent(m130.pctRetencion, 0))} de tus ingresos ya lleva retención. Si en el año anterior más del 70 % de tus ingresos profesionales tuvieron retención, no estás obligado a presentar el 130 (art. 109 del Reglamento del IRPF).</p>` : ''}
    </section>
  </div>
  <div class="grid-2">
    <section class="card">
      <div class="card-head"><div><h2>Calendario fiscal</h2><p>Tus próximos plazos con Hacienda</p></div></div>
      <div class="deadlines">${deadlines.map((x) => {
        const n = daysUntil(x.to);
        const open = todayISO() >= x.from;
        return `<div class="deadline${open ? ' is-open' : ''}"><div class="deadline-date"><b>${esc(fmtDate(x.to).slice(0, 5))}</b><span>${esc(x.to.slice(0, 4))}</span></div>
          <div class="deadline-text"><b>${esc(x.title)}</b><span>${open ? `Plazo abierto · quedan ${n} días` : `Del ${esc(fmtDate(x.from))} al ${esc(fmtDate(x.to))}`}. ${esc(x.detail)}</span></div></div>`;
      }).join('')}</div>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Verifactu y factura electrónica</h2><p>Lo que viene en la facturación</p></div></div>
      <p class="card-text">La ley antifraude obliga a que los programas de facturación sean sistemas Verifactu, con huella encadenada y un código QR en cada factura. Según el Real Decreto-ley 15/2025, sería obligatorio para autónomos a partir del 1 de julio de 2027, y Hacienda ha anunciado que lo retrasará hasta octubre de 2028 (pendiente de publicarse en el BOE).</p>
      <p class="card-text">Mi Cartera numera de forma correlativa y no permite modificar ni borrar facturas emitidas, pero <b>todavía no es un sistema Verifactu certificado</b>. Antes de que sea obligatorio lo actualizaremos o te avisaremos.</p>
    </section>
  </div>
  <p class="tiny legal-note">Cálculos orientativos para estimación directa simplificada en territorio común. No sustituyen a un asesor fiscal ni a la presentación oficial en la sede de la Agencia Tributaria.</p>`;
}

/* ---------------------------------------------------------------- vista: cuota de autónomos */
function retaYearData() {
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const start = `${year}-01-01`;
  const invs = (store.data.invoices || []).filter((i) => i.number && i.date >= start && i.date <= today);
  const ingresos = round(sum(invs, (i) => invTotals(i).base));
  const purchases = (store.data.purchases || []).filter((p) => p.date >= start && p.date <= today);
  let gastos = round(sum(purchases, (p) => F.purchaseTotals(p).gastoDeducible));
  const hasReta = purchases.some((p) => p.kind === 'reta');
  const month = Number(today.slice(5, 7));
  const b = biz();
  const fromMonth = b.startDate && b.startDate.slice(0, 4) === String(year) ? Number(b.startDate.slice(5, 7)) : 1;
  const months = Math.max(1, month - fromMonth + 1);
  if (!hasReta && retaMonthlyNow()) gastos = round(gastos + retaMonthlyNow() * months);
  const factor = (13 - fromMonth) / months;
  return { year, ingresos, gastos, months, annualIng: round(ingresos * factor), annualGas: round(gastos * factor) };
}
function retaResultHTML(ing, gas) {
  const b = biz();
  const today = todayISO();
  const comp = F.retaComputable(ing, gas, b.societario);
  const tr = F.retaTramo(comp.mensual);
  const monthsAlta = F.monthsSince(b.startDate, today);
  const flat = b.tarifaPlana && monthsAlta < 24;
  const flatYear2 = b.tarifaPlana && monthsAlta >= 12 && monthsAlta < 24;
  const current = retaMonthlyNow();
  const due = tr.cuotaMin;
  const diff = current ? round((due - current) * 12) : 0;
  const nb = F.nextBaseChange(today);
  const fm = (n, dec = 2) => esc(money(n, { decimals: dec }));
  return `
    <div class="statgrid">
      ${statCard('Rendimiento neto mensual', bigMoney(comp.mensual), `<span>Tras restar el ${Math.round(comp.generic * 100)} % de gastos genéricos</span>`, 'income', 'trend')}
      ${statCard('Tu tramo', `<span class="fig-int">${esc(tr.tramo)}</span>`, `<span>${tr.min ? `de ${fm(tr.min, 0)}` : 'hasta'} ${Number.isFinite(tr.max) ? `${tr.min ? 'a ' : ''}${fm(tr.max, 0)}` : 'en adelante'} al mes</span>`, 'net', 'chart')}
      ${statCard(flat && monthsAlta < 12 ? 'Cuota con tarifa plana' : 'Cuota mínima de tu tramo', bigMoney(flat && monthsAlta < 12 ? F.RETA_TARIFA_PLANA_MEI : due), `<span>${flat && monthsAlta < 12 ? `80 € + MEI · quedan ${12 - monthsAlta} meses` : `Base mínima ${fm(tr.baseMin)} × 31,5 %`}</span>`, 'expense', 'shield')}
    </div>
    ${flatYear2 ? `<div class="banner ${comp.anual < F.SMI_ANUAL ? '' : 'banner--warn'}">${icon('alert', 17)}<span>${comp.anual < F.SMI_ANUAL ? `<b>Puedes pedir la prórroga de la tarifa plana</b> otros 12 meses: tu rendimiento previsto (${fm(comp.anual, 0)}) está por debajo del salario mínimo (${fm(F.SMI_ANUAL, 0)} al año). Solicítala antes de que acabe el primer año.` : `<b>No podrás prorrogar la tarifa plana:</b> tu rendimiento previsto supera el salario mínimo anual (${fm(F.SMI_ANUAL, 0)}).`}</span></div>` : ''}
    ${current && !(flat && monthsAlta < 12) ? `<div class="banner ${diff > 0 ? 'banner--warn' : ''}">${icon(diff > 0 ? 'alert' : 'check', 17)}<span>${diff > 0
      ? `Pagas ${fm(current)} al mes pero te correspondería al menos ${fm(due)}. Si no cambias tu base, en la regularización te podrían reclamar unos <b>${fm(diff, 0)}</b>. Pide el cambio antes del ${esc(fmtDate(nb.requestBy))} (efecto ${esc(fmtDate(nb.effective))}).`
      : diff < -50 ? `Pagas ${fm(current)} al mes y la mínima de tu tramo es ${fm(due)}. Si tus ingresos se confirman, la Seguridad Social te devolvería unos <b>${fm(-diff, 0)}</b> o puedes bajar tu base antes del ${esc(fmtDate(nb.requestBy))}.`
      : `Tu cuota actual (${fm(current)}) encaja con tu tramo previsto.`}</span></div>` : ''}
  `;
}
function viewCuota() {
  const data = retaYearData();
  const ing = ui.retaIng ?? data.annualIng;
  const gas = ui.retaGas ?? data.annualGas;
  const tr = F.retaTramo(F.retaComputable(ing, gas, biz().societario).mensual);
  const nb = F.nextBaseChange(todayISO());
  return `
  <div class="viewhead">
    <div><h1>Cuota de autónomos</h1><p>Desde 2023 pagas según tus rendimientos reales. Calcula tu tramo de ${data.year} y evita sorpresas en la regularización.</p></div>
    <div class="head-actions"><button class="btn btn-ghost" type="button" data-action="edit-business">${icon('settings', 16)} Mi cuota actual</button></div>
  </div>
  <section class="card">
    <div class="card-head"><div><h2>Previsión del año</h2><p>Rellenado con tus facturas y gastos (${data.months} mes${data.months === 1 ? '' : 'es'}) proyectados a 12 meses. Ajústalo si lo prevés distinto.</p></div></div>
    <div class="form-grid reta-inputs">
      <div class="field"><span>Ingresos previstos del año (sin IVA)</span><input type="number" min="0" step="100" inputmode="decimal" value="${esc(Math.round(ing))}" data-reta="ing"></div>
      <div class="field"><span>Gastos deducibles previstos (incluida la cuota)</span><input type="number" min="0" step="100" inputmode="decimal" value="${esc(Math.round(gas))}" data-reta="gas"></div>
    </div>
  </section>
  <div id="retaResult">${retaResultHTML(ing, gas)}</div>
  <div class="grid-2">
    <section class="card">
      <div class="card-head"><div><h2>Tabla de tramos ${data.year}</h2><p>Cuota mínima mensual de cada tramo (31,5 % de la base)</p></div></div>
      <div class="table-wrap"><table class="report-table tax-table" id="retaTable">
        <thead><tr><th>Rendimiento mensual</th><th>Base mínima</th><th>Cuota mínima</th></tr></thead>
        <tbody>${F.RETA_TABLE.map((t) => `<tr class="${t === tr ? 'is-current' : ''}" data-tramo="${esc(t.tramo)}"><td>${t.min ? esc(money(t.min, { decimals: 0 })) : '0 €'} – ${Number.isFinite(t.max) ? esc(money(t.max, { decimals: 0 })) : 'más'}</td><td>${esc(money(t.baseMin))}</td><td>${esc(money(t.cuotaMin))}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Cómo funciona</h2><p>Lo esencial del sistema de cotización</p></div></div>
      <ol class="steps">
        <li>Eliges una base según los ingresos que prevés. Puedes cambiarla <b>6 veces al año</b>: si lo pides antes del ${esc(fmtDate(nb.requestBy))}, se aplica desde el ${esc(fmtDate(nb.effective))}.</li>
        <li>Rendimiento computable = ingresos − gastos deducibles − ${biz().societario ? '3 % (societarios)' : '7 % de gastos genéricos'}. Se divide entre 12.</li>
        <li>Al año siguiente, la Seguridad Social compara con tu declaración de la renta y te reclama o devuelve la diferencia.</li>
        <li>Nuevos autónomos: tarifa plana de 80 € al mes (88,64 € con el MEI) durante 12 meses, prorrogable otros 12 si ganas menos del salario mínimo.</li>
      </ol>
      <p class="tiny">Tablas de la Orden PJC/297/2026 (cuotas de 2025 congeladas para 2026). Orientativo: confirma tu caso en Import@ss.</p>
    </section>
  </div>`;
}
function updateRetaResult() {
  const host = document.getElementById('retaResult');
  if (!host) return;
  const data = retaYearData();
  const ing = ui.retaIng ?? data.annualIng;
  const gas = ui.retaGas ?? data.annualGas;
  host.innerHTML = retaResultHTML(ing, gas);
  const tr = F.retaTramo(F.retaComputable(ing, gas, biz().societario).mensual);
  for (const row of $$('#retaTable tbody tr')) row.classList.toggle('is-current', row.dataset.tramo === tr.tramo);
}

/* ---------------------------------------------------------------- ajustes: perfil, secciones y negocio */
function settingsProfileHTML() {
  const s = settings();
  const mods = s.modules || {};
  const b = biz();
  return `<section class="card setting-card">
      <h2>Perfil y secciones</h2>
      <p>Muestra solo lo que usas. Ocultar una sección no borra sus datos.</p>
      <div class="setting-row">
        <div><h3>Uso la app como</h3><p>Cambia el menú y el resumen.</p></div>
        <div class="seg" role="group" aria-label="Perfil">${Object.entries(PROFILE_LABELS).map(([k, p]) => `<button type="button" data-action="set-profile" data-value="${k}" class="${(s.profile || 'personal') === k ? 'active' : ''}">${k === 'ambos' ? 'Ambos' : esc(p.title)}</button>`).join('')}</div>
      </div>
      <div class="module-toggles">${Object.entries(MODULE_INFO).map(([k, m]) => `<label class="checkbox"><input type="checkbox" data-module-toggle="${k}"${mods[k] ? ' checked' : ''}> ${esc(m.title)}</label>`).join('')}</div>
      <div class="setting-row">
        <div><h3>Guía de bienvenida</h3><p>Vuelve a ver la configuración inicial.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="restart-onboarding">${icon('sparkles', 14)} Repetir</button>
      </div>
    </section>
    ${hasBusiness() ? `<section class="card setting-card">
      <h2>Mi negocio</h2>
      <p>Datos fiscales de tus facturas y de los cálculos de impuestos.</p>
      <div class="setting-row">
        <div><h3>${esc(b.name || 'Sin nombre')}</h3><p>${b.nif ? `NIF ${esc(b.nif)}` : 'Falta el NIF'} · ${b.activity === 'empresarial' ? 'Actividad empresarial' : 'Actividad profesional'} · retención ${esc(b.irpfRate ?? 15)} %</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="edit-business">${icon('edit', 14)} Editar</button>
      </div>
      <div class="setting-row">
        <div><h3>Numeración</h3><p>Serie ${esc(b.series || 'F')} para facturas y ${esc(b.seriesR || 'R')} para rectificativas, reiniciada cada año.</p></div>
      </div>
      <div class="setting-row">
        <div><h3>Cuota de autónomos</h3><p>${b.retaMonthly ? `${esc(money(b.retaMonthly))} al mes` : 'No indicada'}${b.tarifaPlana ? ' · tarifa plana' : ''}</p></div>
      </div>
    </section>` : ''}`;
}
function openBusinessModal() {
  const b = biz();
  openSheet({
    title: 'Mi negocio',
    subtitle: 'Estos datos aparecen en tus facturas. Cambiarlos no altera las ya emitidas.',
    wide: true,
    submitLabel: 'Guardar',
    body: `
      <div class="form-grid">
        <div class="field"><span>Nombre y apellidos o razón social</span><input name="name" maxlength="120" value="${esc(b.name || '')}"></div>
        <div class="field"><span>NIF / NIE</span><input name="nif" maxlength="20" value="${esc(b.nif || '')}" data-nif><small class="nif-hint">${nifHint(b.nif)}</small></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Nombre comercial <span class="hint">(opcional)</span></span><input name="tradeName" maxlength="120" value="${esc(b.tradeName || '')}"></div>
        <div class="field"><span>Email y teléfono <span class="hint">(opcional)</span></span><div class="form-grid"><input name="email" type="email" maxlength="120" value="${esc(b.email || '')}" placeholder="Email"><input name="phone" maxlength="30" value="${esc(b.phone || '')}" placeholder="Teléfono"></div></div>
      </div>
      <div class="field"><span>Dirección fiscal</span><input name="address" maxlength="160" value="${esc(b.address || '')}"></div>
      <div class="form-grid form-grid--3">
        <div class="field"><span>C. postal</span><input name="zip" maxlength="10" value="${esc(b.zip || '')}"></div>
        <div class="field"><span>Localidad</span><input name="city" maxlength="80" value="${esc(b.city || '')}"></div>
        <div class="field"><span>Provincia</span><input name="province" maxlength="80" value="${esc(b.province || '')}"></div>
      </div>
      <div class="form-grid form-grid--3">
        <div class="field"><span>Actividad</span><select name="activity"><option value="profesional"${b.activity !== 'empresarial' ? ' selected' : ''}>Profesional</option><option value="empresarial"${b.activity === 'empresarial' ? ' selected' : ''}>Empresarial</option></select></div>
        <div class="field"><span>Epígrafe IAE <span class="hint">(opcional)</span></span><input name="iae" maxlength="20" value="${esc(b.iae || '')}"></div>
        <div class="field"><span>Fecha de alta</span><input name="startDate" type="date" value="${esc(b.startDate || '')}"></div>
      </div>
      <div class="form-grid form-grid--3">
        <div class="field"><span>IVA habitual</span><select name="ivaRate">${F.IVA_RATES.map((r) => `<option value="${r}"${Number(b.ivaRate ?? 21) === r ? ' selected' : ''}>${r} %</option>`).join('')}</select></div>
        <div class="field"><span>Tu retención</span><select name="irpfRate">${F.IRPF_OPTIONS.map((o) => `<option value="${o.value}"${Number(b.irpfRate ?? 15) === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
        <div class="field"><span>Días para cobrar</span><input name="paymentDays" type="number" min="0" max="120" value="${esc(b.paymentDays ?? 30)}"></div>
      </div>
      <div class="form-grid form-grid--3">
        <div class="field"><span>Cuota de autónomos mensual</span><input name="retaMonthly" type="number" min="0" step="0.01" value="${esc(b.retaMonthly || '')}" placeholder="Ej. 294,00"></div>
        <div class="field"><span>Territorio</span><select name="territory">
          ${[['comun', 'Península y Baleares'], ['canarias', 'Canarias (IGIC)'], ['ceutamelilla', 'Ceuta o Melilla (IPSI)'], ['foral', 'País Vasco o Navarra']].map(([k, l]) => `<option value="${k}"${(b.territory || 'comun') === k ? ' selected' : ''}>${l}</option>`).join('')}
        </select></div>
        <div class="field"><span>Series</span><div class="form-grid"><input name="series" maxlength="6" value="${esc(b.series || 'F')}" aria-label="Serie ordinaria"><input name="seriesR" maxlength="6" value="${esc(b.seriesR || 'R')}" aria-label="Serie rectificativas"></div></div>
      </div>
      <label class="checkbox"><input type="checkbox" name="tarifaPlana"${b.tarifaPlana ? ' checked' : ''}> Tengo la tarifa plana de nuevos autónomos</label>
      <label class="checkbox"><input type="checkbox" name="societario"${b.societario ? ' checked' : ''}> Soy autónomo societario (administrador de mi sociedad)</label>
      <div class="field"><span>IBAN para cobros <span class="hint">(aparece en la factura)</span></span><input name="iban" maxlength="40" value="${esc(b.iban || '')}" placeholder="ES00 0000 0000 0000 0000 0000"></div>
      <div class="field"><span>Pie de factura <span class="hint">(opcional)</span></span><input name="footer" maxlength="300" value="${esc(b.footer || '')}" placeholder="Ej. Inscrito en el Colegio de… nº …"></div>`,
    async onSubmit(fd) {
      const body = {};
      for (const [k, v] of fd.entries()) body[k] = v;
      body.tarifaPlana = fd.get('tarifaPlana') === 'on';
      body.societario = fd.get('societario') === 'on';
      for (const k of ['ivaRate', 'irpfRate', 'paymentDays', 'retaMonthly']) body[k] = Number(body[k]) || 0;
      await api('PATCH', 'api/settings', { business: body });
      render();
      toast('Datos del negocio guardados');
    }
  });
}

/* ---------------------------------------------------------------- acciones del negocio */
async function handleBizAction(action, el) {
  const id = el.dataset.id;
  switch (action) {
    case 'ob-profile': {
      const ob = obState();
      ob.profile = el.dataset.value;
      ob.modules = null;
      render();
      return true;
    }
    case 'ob-next': {
      const ob = obState();
      const steps = obSteps(ob);
      if (steps[ob.step] === 'negocio') {
        obCollectBusiness();
        if (ob.business.nif && !F.validateNif(ob.business.nif).ok) { toast(`NIF: ${F.validateNif(ob.business.nif).message}`, 'error'); return true; }
      }
      if (steps[ob.step] === 'secciones') {
        ob.modules = { ...(ob.modules || defaultModulesFor(ob.profile)) };
        for (const box of $$('[data-ob-module]')) ob.modules[box.dataset.obModule] = box.checked;
      }
      ob.step = Math.min(ob.step + 1, steps.length - 1);
      render();
      window.scrollTo({ top: 0 });
      return true;
    }
    case 'ob-back': {
      const ob = obState();
      if (obSteps(ob)[ob.step] === 'negocio') obCollectBusiness();
      ob.step = Math.max(0, ob.step - 1);
      render();
      return true;
    }
    case 'ob-finish':
      await obFinish(el.dataset.demo === '1');
      return true;
    case 'restart-onboarding':
      ui.ob = null;
      await api('PATCH', 'api/settings', { onboarded: false });
      render();
      return true;
    case 'hide-steps':
      localStorage.setItem('mc-steps-hidden', '1');
      render();
      return true;
    case 'set-profile': {
      const profile = el.dataset.value;
      const modules = { ...(settings().modules || {}), business: profile !== 'personal' };
      await api('PATCH', 'api/settings', { profile, modules });
      render();
      return true;
    }
    case 'edit-business': openBusinessModal(); return true;
    case 'new-client': openClientModal(); return true;
    case 'edit-client': { const c = clientById(id); if (c) openClientModal(c); return true; }
    case 'new-invoice': openInvoiceModal(); return true;
    case 'open-invoice': { const inv = byId(store.data.invoices, id); if (inv) openInvoiceModal(inv); return true; }
    case 'inv-filter': ui.invFilter = el.dataset.value; render(); return true;
    case 'print-invoice': { const inv = byId(store.data.invoices, id); if (inv) printInvoice(inv); return true; }
    case 'pay-invoice': { const inv = byId(store.data.invoices, id); closeOpenSheets(); if (inv) openPayModal(inv); return true; }
    case 'unpay-invoice': {
      const ok = await confirmDialog({ title: 'Marcar como pendiente', message: 'Se borrará el ingreso que se apuntó al cobrarla.', confirm: 'Marcar pendiente' });
      if (!ok) return true;
      await api('POST', `api/invoices/${id}/unpay`);
      closeOpenSheets(); render(); toast('Factura pendiente de cobro');
      return true;
    }
    case 'duplicate-invoice': {
      const inv = byId(store.data.invoices, id);
      closeOpenSheets();
      if (inv) openInvoiceModal(null, { clientId: inv.clientId, lines: inv.lines.map((l) => ({ ...l, qty: Math.abs(l.qty) })), taxMode: inv.taxMode, irpfRate: inv.irpfRate, recargo: inv.recargo, note: inv.kind === 'rectificativa' ? '' : inv.note });
      return true;
    }
    case 'rectify-invoice': {
      const ok = await confirmDialog({ title: 'Crear factura rectificativa', message: 'Se preparará un borrador en la serie de rectificativas con los mismos conceptos en negativo. Podrás ajustarlo antes de emitirlo.', confirm: 'Preparar', danger: false });
      if (!ok) return true;
      const res = await api('POST', `api/invoices/${id}/rectify`);
      closeOpenSheets(); render();
      const draft = byId(store.data.invoices, res.createdId);
      if (draft) openInvoiceModal(draft);
      return true;
    }
    case 'new-purchase': openPurchaseModal(null, el.dataset.kind ? { kind: el.dataset.kind } : {}); return true;
    case 'edit-purchase': { const p = byId(store.data.purchases, id); if (p) openPurchaseModal(p); return true; }
    case 'gastos-period': ui.gastosQ = el.dataset.value; render(); return true;
    case 'tax-q': ui.taxQ = Number(el.dataset.value); ui.taxYear = ui.taxYear || quarterToFile().year; render(); return true;
    default: return false;
  }
}
document.addEventListener('input', (event) => {
  const t = event.target;
  if (t.matches?.('[data-nif]')) {
    const hint = t.parentElement.querySelector('.nif-hint');
    if (hint) hint.innerHTML = nifHint(t.value.trim());
  }
  if (t.dataset?.reta) {
    const v = Number(t.value) || 0;
    if (t.dataset.reta === 'ing') ui.retaIng = v; else ui.retaGas = v;
    updateRetaResult();
  }
});
document.addEventListener('change', async (event) => {
  const t = event.target;
  try {
    if (t.id === 'taxYear') { ui.taxYear = Number(t.value); ui.taxQ = ui.taxQ || quarterToFile().q; render(); }
    if (t.name === 'territory' && t.closest('#obBusiness')) {
      const note = document.querySelector('[data-territory-note]');
      if (note) { note.hidden = !territoryNotice(t.value); note.querySelector('span').textContent = territoryNotice(t.value); }
    }
    if (t.dataset?.moduleToggle) {
      const modules = { ...(settings().modules || {}), [t.dataset.moduleToggle]: t.checked };
      await api('PATCH', 'api/settings', { modules });
      render();
    }
  } catch (err) { toast(err.message, 'error'); }
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const row = event.target.closest?.('tr.row-link[data-action]');
  if (row) row.click();
});

/* ---------------------------------------------------------------- vistas y arranque */
const VIEWS = {
  resumen: viewResumen,
  movimientos: viewMovimientos,
  inversiones: viewInversiones,
  cuentas: viewCuentas,
  presupuestos: viewPresupuestos,
  recurrentes: viewRecurrentes,
  objetivos: viewObjetivos,
  prestamos: viewPrestamos,
  informes: viewInformes,
  mas: viewMas,
  ajustes: viewAjustes,
  facturas: viewFacturas,
  clientes: viewClientes,
  gastos: viewGastos,
  impuestos: viewImpuestos,
  cuota: viewCuota
};

boot();





