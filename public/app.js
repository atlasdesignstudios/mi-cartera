/* Mi Cartera — aplicación (sin dependencias) */
'use strict';

const STORAGE_KEY = 'micartera.state.v1';
// En la versión web (GitHub Pages) no hay servidor: los datos viven en este navegador.
const WEB = Boolean(globalThis.MC_WEB);
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'UYU', 'JPY'];
const ACCOUNT_TYPES = {
  bank: 'Cuenta bancaria', savings: 'Ahorro', cash: 'Efectivo',
  card: 'Tarjeta', broker: 'Broker', other: 'Otra'
};
const INVEST_TYPES = {
  stock: { label: 'Acciones', color: '#3b82f6' },
  etf: { label: 'ETF', color: '#14b8a6' },
  fund: { label: 'Fondo', color: '#8b5cf6' },
  crypto: { label: 'Cripto', color: '#f59e0b' },
  deposit: { label: 'Depósito', color: '#64748b' },
  other: { label: 'Otro', color: '#94a3b8' }
};
const TX_LABELS = { income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia' };
const EMOJIS = ['🏠', '🛒', '🚗', '🍽️', '💊', '🎬', '🛍️', '📺', '📚', '✈️', '🐾', '🧾', '📦', '💼', '🧑‍💻', '📈', '🏦', '🏷️', '🎁', '➕', '⚡', '🎵', '🏋️', '☕', '🎓', '🔧'];
const PALETTE = ['#0e9f6e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#f97316'];
const NAV = [
  { id: 'resumen', label: 'Resumen', icon: 'home' },
  { id: 'movimientos', label: 'Movimientos', icon: 'list' },
  { id: 'recurrentes', label: 'Recurrentes', icon: 'repeat' },
  { id: 'presupuestos', label: 'Presupuestos', icon: 'target' },
  { id: 'objetivos', label: 'Objetivos', icon: 'flag' },
  { id: 'inversiones', label: 'Inversiones', icon: 'trend' },
  { id: 'cuentas', label: 'Cuentas', icon: 'wallet' },
  { id: 'informes', label: 'Informes', icon: 'chart' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' }
];
const MORE_NAV = { id: 'mas', label: 'Más', icon: 'grid' };
const ROUTES = [...NAV.map((n) => n.id), 'mas'];
const BOTTOM_NAV = ['resumen', 'movimientos', 'inversiones', 'informes', 'mas'];
const MORE_VIEWS = ['mas', 'cuentas', 'presupuestos', 'recurrentes', 'objetivos', 'ajustes'];
const FREQ_LABELS = { weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' };
const FREQ_PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

const ICONS = {
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
  return round(totalCash() + portfolioTotals().value);
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
        name: cat?.name || 'Otros', icon: cat?.icon || '📦', color: cat?.color || '#94a3b8'
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
  if (tx.type === 'transfer') return { icon: 'transfer', bg: '#6d4aff', emoji: false };
  const cat = categoryById(tx.categoryId);
  return { icon: cat?.icon || '📦', bg: cat?.color || '#94a3b8', emoji: true };
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
  if (meta) meta.content = theme === 'dark' ? '#0a0f0d' : '#f3f6f4';
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
  if (side) side.innerHTML = navHTML(NAV.map((n) => n.id));
  if (bottom) bottom.innerHTML = navHTML(BOTTOM_NAV, true);
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
    const active = id === view || (isBottom && id === 'mas' && MORE_VIEWS.includes(view));
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
function render() {
  if (!store.data) return;
  applyTheme();
  const view = readRoute();
  store.view = view;
  updateNav(view);
  const host = document.getElementById('view');
  host.innerHTML = VIEWS[view] ? VIEWS[view]() : '';
  if (view === 'movimientos') renderTxList();
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
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
  if (rest > 0) segments.push({ name: 'Otros', value: rest, color: '#94a3b8', icon: '📦' });
  let svg = `<svg viewBox="0 0 ${size} ${size}" class="chart" role="img" aria-label="Gastos por categoría">`;
  svg += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>`;
  for (const seg of segments) {
    const pct = total > 0 ? seg.value / total : 0;
    const len = Math.max(0, pct * c - 3);
    if (len > 0) {
      svg += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-linecap="butt" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
    }
    offset += pct * c;
  }
  const totalText = Math.abs(total) >= 100000 ? `${compact(total)} ${currencySymbol()}` : money(total, { decimals: 0 });
  svg += `<text x="${cx}" y="${cx - 4}" text-anchor="middle" class="donut-label">Gastos</text>`;
  svg += `<text x="${cx}" y="${cx + 15}" text-anchor="middle" class="donut-value">${esc(totalText)}</text>`;
  svg += '</svg>';
  const legend = segments.map((seg) => `
    <div class="donut-row">
      <span class="donut-dot" style="background:${seg.color}"></span>
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
      <path d="${area}" fill="rgba(255,255,255,.13)"/>
      <path d="${line}" fill="none" stroke="#c9ffec" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg></div>`
  };
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
    <div class="stat-value">${esc(value)}</div>
    <div class="stat-foot">${foot}</div>
  </article>`;
}

function txRow(tx) {
  const visual = txIconColor(tx);
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const amountClass = tx.type === 'income' ? 'income' : tx.type === 'transfer' ? 'transfer' : '';
  return `<button type="button" class="txrow" data-action="edit-tx" data-id="${esc(tx.id)}">
    <span class="tx-icon" style="background:${visual.bg}1f;color:${visual.bg}">${visual.emoji ? esc(visual.icon) : icon(visual.icon, 18)}</span>
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
    <span class="budget-icon" style="background:${row.color}1f;color:${row.color}">${esc(row.icon)}</span>
    <div class="budget-info">
      <div class="budget-line"><b>${esc(row.name)}</b><span>${esc(money(row.spent, { decimals: 0 }))} de ${esc(money(row.budget, { decimals: 0 }))}</span></div>
      <div class="progress ${progressClass(row.pct)}"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
    </div>
    <span class="budget-amount ${row.remaining < 0 ? 'neg' : ''}"><b>${esc(money(row.remaining, { decimals: 0 }))}</b>restante</span>
  </div>`;
}

/* ---------------------------------------------------------------- vista: resumen */
function viewResumen() {
  const now = monthKey(todayISO());
  const stats = monthStats(now);
  const prev = monthStats(addMonths(now, -1));
  const holdings = computeHoldings();
  const portfolio = portfolioTotals(holdings);
  const cash = totalCash();
  const worth = round(cash + portfolio.value);
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
      <div class="hero-label">Patrimonio neto</div>
      <div class="hero-value">${esc(money(worth))}</div>
      <div class="hero-meta">
        <span><span class="dot cash"></span>Efectivo ${esc(money(cash))}</span>
        <span><span class="dot inv"></span>Invertido ${esc(money(portfolio.value))}</span>
      </div>
      <div class="hero-actions">
        <button class="btn btn-light" type="button" data-action="new-tx" data-type="expense">${icon('plus', 16)} Añadir movimiento</button>
        <a class="btn btn-outline-light" href="#/inversiones">Ver cartera ${icon('arrowRight', 16)}</a>
      </div>
      <div class="hero-foot">Actualizado ${esc(new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }))}</div>
    </div>
    <div class="hero-visual">
      ${spark.svg}
      <div class="hero-caption"><span>Ahorro acumulado · 12 meses</span><b>${esc(money(spark.total, { decimals: 0 }))}</b></div>
    </div>
  </section>

  <div class="statgrid">
    ${statCard('Ingresos del mes', money(stats.income), `${deltaBadge(stats.income, prev.income)} <span>vs. mes anterior</span>`, 'income', 'arrowUp')}
    ${statCard('Gastos del mes', money(stats.expense), `${deltaBadge(stats.expense, prev.expense, true)} <span>vs. mes anterior</span>`, 'expense', 'wallet')}
    ${statCard('Ahorro del mes', money(stats.net), `<span>${esc(percent(stats.rate))} de tus ingresos</span>`, 'net', 'sparkles')}
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="card-head">
        <div><h2>Flujo mensual</h2><p>Ingresos y gastos de los últimos 6 meses</p></div>
        <div class="legend"><span><i style="background:var(--accent)"></i>Ingresos</span><span><i style="background:var(--danger)"></i>Gastos</span></div>
      </div>
      ${barChart(series)}
    </section>
    <section class="card">
      <div class="card-head">
        <div><h2>Gastos por categoría</h2><p>${esc(monthLabel(now))}</p></div>
        <a class="card-link" href="#/movimientos">Ver todo ${icon('arrowRight', 14)}</a>
      </div>
      ${spendTotal > 0 ? donutChart(spend, spendTotal) : `<div class="empty"><span class="empty-icon">📊</span><h3>Sin gastos este mes</h3><p>Cuando registres gastos verás aquí el reparto por categorías.</p></div>`}
    </section>
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="card-head">
        <div><h2>Últimos movimientos</h2><p>Lo que ha entrado y salido</p></div>
        <a class="card-link" href="#/movimientos">Ver todos ${icon('arrowRight', 14)}</a>
      </div>
      ${recent.length
        ? `<div class="txlist compact">${recent.map(txRow).join('')}</div>`
        : `<div class="empty"><span class="empty-icon">🧾</span><h3>Aún no hay movimientos</h3><p>Registra tu primer ingreso o gasto para empezar.</p><button class="btn btn-primary btn-sm" type="button" data-action="new-tx">Añadir movimiento</button></div>`}
    </section>
    <section class="card">
      <div class="card-head">
        <div><h2>Presupuestos</h2><p>${esc(monthLabel(now))}</p></div>
        <a class="card-link" href="#/presupuestos">Gestionar ${icon('arrowRight', 14)}</a>
      </div>
      ${budgets.length
        ? budgets.map(budgetMiniRow).join('')
        : `<div class="empty"><span class="empty-icon">🎯</span><h3>Ponte un límite mensual</h3><p>Define cuánto quieres gastar en cada categoría y sigue tu progreso.</p><button class="btn btn-soft btn-sm" type="button" data-action="edit-budgets">Crear presupuesto</button></div>`}
    </section>
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="card-head">
        <div><h2>Próximos cobros y pagos</h2><p>Recurrentes de los próximos 30 días</p></div>
        <a class="card-link" href="#/recurrentes">Gestionar ${icon('arrowRight', 14)}</a>
      </div>
      ${upcoming.length
        ? `<div class="txlist compact">${upcoming.slice(0, 5).map((u) => ruleRow(u.rule, u.date, true)).join('')}</div>
           <div class="upcoming-foot"><span>Previsto en 30 días</span><b class="${upcomingNet < 0 ? 'neg' : 'pos'}">${upcomingNet >= 0 ? '+' : '−'}${esc(money(Math.abs(upcomingNet)))}</b></div>`
        : `<div class="empty"><span class="empty-icon">🔁</span><h3>Sin recurrentes</h3><p>Programa tu nómina, el alquiler o las suscripciones y se apuntarán solos.</p><button class="btn btn-soft btn-sm" type="button" data-action="new-recurring">Crear recurrente</button></div>`}
    </section>
    <section class="card">
      <div class="card-head">
        <div><h2>Objetivos de ahorro</h2><p>Lo que estás construyendo</p></div>
        <a class="card-link" href="#/objetivos">Ver todos ${icon('arrowRight', 14)}</a>
      </div>
      ${goals.length
        ? goals.slice(0, 4).map((g) => `<button type="button" class="budget-row goal-mini" data-action="edit-goal" data-id="${esc(g.id)}">
            <span class="budget-icon" style="background:${g.color}1f;color:${g.color}">${esc(g.icon)}</span>
            <div class="budget-info">
              <div class="budget-line"><b>${esc(g.name)}</b><span>${esc(money(g.saved, { decimals: 0 }))} de ${esc(money(g.target, { decimals: 0 }))}</span></div>
              <div class="progress${g.reached ? ' done' : ''}"><i style="width:${(clamp(g.pct, 0, 1) * 100).toFixed(1)}%;background:${g.color}"></i></div>
            </div>
            <span class="budget-amount"><b>${esc(percent(g.pct, 0))}</b>${g.reached ? 'conseguido' : g.perMonth ? esc(money(g.perMonth, { decimals: 0 })) + '/mes' : 'progreso'}</span>
          </button>`).join('')
        : `<div class="empty"><span class="empty-icon">🏁</span><h3>Define un objetivo</h3><p>Fondo de emergencia, viaje, coche… y sigue cuánto te falta.</p><button class="btn btn-soft btn-sm" type="button" data-action="new-goal">Crear objetivo</button></div>`}
    </section>
  </div>`;
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
    .map((c) => `<option value="${esc(c.id)}"${f.category === c.id ? ' selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('');
  const incomeOptions = categories.filter((c) => c.kind === 'income')
    .map((c) => `<option value="${esc(c.id)}"${f.category === c.id ? ' selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('');
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
    host.innerHTML = `<div class="empty"><span class="empty-icon">${any ? '🔎' : '🧾'}</span>
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

function holdingCard(h) {
  const meta = INVEST_TYPES[h.type] || INVEST_TYPES.other;
  const up = h.pnl >= 0;
  return `<article class="card holding">
    <div class="holding-head">
      <span class="asset-badge" style="background:${meta.color}20;color:${meta.color}">${esc(meta.label)}</span>
      <button class="icon-btn" type="button" data-action="edit-investment" data-id="${esc(h.id)}" aria-label="Editar ${esc(h.name)}">${icon('edit', 17)}</button>
    </div>
    <h3>${esc(h.name)}</h3>
    <div class="symbol">${esc(h.symbol || 'SIN SÍMBOLO')}</div>
    <div class="holding-value">${esc(money(h.value))}</div>
    <span class="pnl ${up ? 'up' : 'down'}">${icon(up ? 'arrowUpRight' : 'arrowDown', 13)}${up ? '+' : ''}${esc(money(h.pnl))} · ${esc(percent(h.pnlPct))}</span>
    <dl class="metrics">
      <div><dt>Unidades</dt><dd>${esc(unitsLabel(h.units))}</dd></div>
      <div><dt>Precio medio</dt><dd>${esc(money(h.avg))}</dd></div>
      <div><dt>Precio actual</dt><dd>${esc(money(h.currentPrice))}</dd></div>
    </dl>
    ${h.units <= 0 ? '<div class="holding-empty">Sin posición abierta. Solo hay operaciones registradas.</div>' : ''}
    <div class="holding-actions">
      <button class="btn btn-sm btn-ghost" type="button" data-action="new-op" data-id="${esc(h.id)}">${icon('plus', 14)} Operación</button>
      <button class="btn btn-sm btn-ghost" type="button" data-action="history" data-id="${esc(h.id)}">${icon('list', 14)} Historial</button>
      <button class="icon-btn" type="button" data-action="update-price" data-id="${esc(h.id)}" aria-label="Actualizar precio">${icon('refresh', 17)}</button>
    </div>
  </article>`;
}

function opRow(op) {
  const inv = investmentById(op.investmentId);
  if (!inv) return '';
  const buy = op.type === 'buy';
  const total = round(op.units * op.price + (buy ? 1 : -1) * (op.fees || 0));
  return `<button type="button" class="history-row" data-action="edit-op" data-id="${esc(op.id)}">
    <span class="tx-icon" style="width:32px;height:32px;border-radius:10px;background:${buy ? 'var(--accent-soft)' : 'var(--danger-soft)'};color:${buy ? 'var(--accent-2)' : 'var(--danger)'}">${icon(buy ? 'arrowDown' : 'arrowUp', 15)}</span>
    <span class="tx-main">
      <span class="tx-title">${esc(inv.name)} <span class="tiny">${buy ? 'Compra' : 'Venta'} · ${esc(unitsLabel(op.units))} u.</span></span>
      <span class="tx-meta">${esc(dateLabel(op.date))}${op.note ? ' · ' + esc(op.note) : ''}</span>
    </span>
    <span class="side"><b>${esc(money(total))}</b><small>${esc(money(op.price))} / u.${op.accountId ? ' · ' + esc(accountById(op.accountId)?.name || '') : ''}</small></span>
    <span style="color:var(--muted-2)">${icon('chevronRight', 16)}</span>
  </button>`;
}

function viewInversiones() {
  const holdings = computeHoldings().sort((a, b) => b.value - a.value);
  const totals = portfolioTotals(holdings);
  const alloc = allocationData(holdings);
  const up = totals.pnl >= 0;
  const recentOps = [...(store.data.ops || [])]
    .sort((a, b) => (b.date === a.date ? (b.createdAt || '').localeCompare(a.createdAt || '') : b.date.localeCompare(a.date)))
    .slice(0, 6);

  return `
  ${store.offline ? `<div class="banner">${icon('alert', 17)}<span><b>Sin conexión.</b> Mostrando la última copia guardada.</span></div>` : ''}
  <div class="viewhead">
    <div><h1>Inversiones</h1><p>Tu cartera, sus aportaciones y lo que está ganando.</p></div>
    <div class="head-actions">
      <button class="btn btn-ghost" type="button" data-action="new-op">${icon('plus', 16)} Operación</button>
      <button class="btn btn-primary" type="button" data-action="new-investment">${icon('plus', 16)} Nueva inversión</button>
    </div>
  </div>

  ${holdings.length ? `
  <section class="hero hero--invest">
    <div class="hero-content">
      <div class="hero-label">Valor actual de la cartera</div>
      <div class="hero-value">${esc(money(totals.value))}</div>
      <span class="pnl ${up ? 'up' : 'down'}">${icon(up ? 'arrowUpRight' : 'arrowDown', 14)}${up ? '+' : ''}${esc(money(totals.pnl))} no realizado · ${esc(percent(totals.pnlPct))}</span>
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
    <div class="card-head"><div><h2>Últimas operaciones</h2><p>Compras y ventas registradas</p></div></div>
    <div class="history-list">${recentOps.map(opRow).join('')}</div>
  </section>` : ''}
  ` : `<section class="card">
    <div class="empty">
      <span class="empty-icon">📈</span>
      <h3>Empieza tu cartera</h3>
      <p>Añade cada inversión (acciones, fondos, cripto, depósitos…) y registra tus compras. Calcularemos unidades, precio medio y ganancias por ti.</p>
      <button class="btn btn-primary" type="button" data-action="new-investment">${icon('plus', 16)} Añadir inversión</button>
    </div>
    <div class="settings-grid" style="margin-top:16px">
      <div class="banner">${icon('sparkles', 17)}<span><b>1.</b> Crea la inversión con su precio actual.</span></div>
      <div class="banner">${icon('sparkles', 17)}<span><b>2.</b> Añade cada compra o venta como operación.</span></div>
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
    ${statCard('Efectivo disponible', money(cash), '<span>Suma de todas tus cuentas</span>', 'income', 'wallet')}
    ${statCard('Invertido', money(portfolio.value), `<span>${esc(percent(portfolio.pnlPct))} de rentabilidad latente</span>`, 'net', 'trend')}
    ${statCard('Patrimonio neto', money(cash + portfolio.value), '<span>Efectivo + valor de la cartera</span>', 'net', 'coins')}
  </div>

  ${accounts.length ? `<div class="account-grid">
    ${accounts.map((a) => `<button type="button" class="card account-card" style="--c:${a.color}" data-action="edit-account" data-id="${esc(a.id)}">
      <div class="acct-top">
        <span class="acct-type">${esc(ACCOUNT_TYPES[a.type] || 'Cuenta')}</span>
        <span class="badge">${icon('wallet', 12)} editar</span>
      </div>
      <div class="acct-name">${esc(a.name)}</div>
      <div class="acct-balance">${esc(money(accountBalance(a)))}</div>
      <div class="acct-note">${esc(a.note || 'Sin notas')}</div>
      <div class="acct-foot"><span>Saldo inicial ${esc(money(a.initialBalance))}</span><span>${esc(String(ACCOUNT_TYPES[a.type] || 'Cuenta').toLowerCase())}</span></div>
    </button>`).join('')}
  </div>` : `<section class="card"><div class="empty"><span class="empty-icon">🏦</span><h3>Sin cuentas todavía</h3><p>Crea una cuenta para poder registrar ingresos, gastos y transferencias.</p><button class="btn btn-primary" type="button" data-action="new-account">Crear cuenta</button></div></section>`}
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
        <span class="budget-icon" style="background:${row.color}1f;color:${row.color}">${esc(row.icon)}</span>
        <div class="budget-info">
          <div class="budget-line"><b>${esc(row.name)}</b><span>${hasBudget ? `${esc(money(row.spent, { decimals: 0 }))} de ${esc(money(row.budget, { decimals: 0 }))}` : `${esc(money(row.spent, { decimals: 0 }))} gastados · sin límite`}</span></div>
          ${hasBudget ? `<div class="progress ${progressClass(row.pct)}"><i style="width:${(clamp(row.pct, 0, 1) * 100).toFixed(1)}%"></i></div>` : ''}
        </div>
        <span class="budget-amount ${row.remaining < 0 ? 'neg' : ''}">
          ${hasBudget ? `<b>${esc(money(row.remaining, { decimals: 0 }))}</b>${row.remaining < 0 ? 'excedido' : 'restante'}` : `<b>${esc(money(row.spent, { decimals: 0 }))}</b>gastado`}
        </span>
      </div>`;
    }).join('') : `<div class="empty"><span class="empty-icon">🎯</span><h3>No hay categorías de gasto</h3><p>Crea categorías en Ajustes para poder presupuestar.</p><a class="btn btn-soft btn-sm" href="#/ajustes">Ir a Ajustes</a></div>`}
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
  if (rule.type === 'transfer') return { emoji: false, icon: 'transfer', bg: '#6d4aff' };
  const cat = categoryById(rule.categoryId);
  return { emoji: true, icon: cat?.icon || '📦', bg: cat?.color || '#94a3b8' };
}
function ruleRow(rule, date, compact = false) {
  const v = ruleVisual(rule);
  const sign = rule.type === 'income' ? '+' : rule.type === 'expense' ? '−' : '';
  const cls = rule.type === 'income' ? 'income' : rule.type === 'transfer' ? 'transfer' : '';
  const paused = rule.active === false;
  return `<button type="button" class="txrow${paused ? ' is-paused' : ''}" data-action="edit-recurring" data-id="${esc(rule.id)}">
    <span class="tx-icon" style="background:${v.bg}1f;color:${v.bg}">${v.emoji ? esc(v.icon) : icon(v.icon, 18)}</span>
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
    ${statCard('Ingresos fijos / mes', money(totals.income), '<span>Equivalente mensual</span>', 'income', 'arrowUp')}
    ${statCard('Gastos fijos / mes', money(totals.expense), `<span>${totals.income > 0 ? esc(percent(totals.expense / totals.income)) + ' de tus ingresos fijos' : 'Equivalente mensual'}</span>`, 'expense', 'repeat')}
    ${statCard('Margen libre / mes', money(totals.free), `<span>${totals.transfer > 0 ? esc(money(totals.transfer, { decimals: 0 })) + ' en traspasos automáticos' : 'Lo que queda tras lo fijo'}</span>`, 'net', 'sparkles')}
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
        : `<div class="empty"><span class="empty-icon">🗓️</span><h3>Nada a la vista</h3><p>No hay cobros ni pagos programados en las próximas semanas.</p></div>`}
    </section>
  </div>` : `<section class="card"><div class="empty">
    <span class="empty-icon">🔁</span>
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
  return `<article class="card goal" style="--c:${g.color}">
    <div class="goal-head">
      <span class="goal-icon">${esc(g.icon)}</span>
      <div class="goal-title"><h3>${esc(g.name)}</h3><span>${g.account ? 'Saldo de ' + esc(g.account.name) : 'Aportaciones manuales'}</span></div>
      <button class="icon-btn" type="button" data-action="edit-goal" data-id="${esc(g.id)}" aria-label="Editar ${esc(g.name)}">${icon('edit', 17)}</button>
    </div>
    <div class="goal-amounts"><b>${esc(money(g.saved, { decimals: 0 }))}</b><span>de ${esc(money(g.target, { decimals: 0 }))}</span><em>${esc(percent(g.pct, 0))}</em></div>
    <div class="progress goal-bar${g.reached ? ' done' : ''}"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
    <div class="goal-foot">
      <span>${g.reached ? '🎉 ' : ''}${esc(deadlineText)}</span>
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
    ${statCard('Ahorrado para objetivos', money(totalSaved), `<span>${esc(percent(totalTarget > 0 ? totalSaved / totalTarget : 0, 0))} del total</span>`, 'income', 'flag')}
    ${statCard('Meta total', money(totalTarget), `<span>${goals.length} ${goals.length === 1 ? 'objetivo' : 'objetivos'} · ${goals.filter((g) => g.reached).length} conseguidos</span>`, 'net', 'target')}
    ${statCard('Necesitas apartar', money(perMonth), '<span>Al mes para llegar a tiempo</span>', 'expense', 'calendar')}
  </div>
  <div class="goal-grid">${goals.map(goalCard).join('')}</div>` : `<section class="card"><div class="empty">
    <span class="empty-icon">🎯</span>
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
    return { label: shortMonth(key), title: monthLabel(key), value: round(cashAt(end) + invested) };
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
    ${statCard('Ingresos del año', money(income), `${deltaBadge(income, prevIncome)} <span>vs. ${year - 1}</span>`, 'income', 'arrowUp')}
    ${statCard('Gastos del año', money(expense), `${deltaBadge(expense, prevExpense, true)} <span>vs. ${year - 1}</span>`, 'expense', 'wallet')}
    ${statCard('Ahorro del año', money(net), `<span>${esc(percent(income > 0 ? net / income : 0))} de tus ingresos · ${esc(money(net / divisor, { decimals: 0 }))}/mes</span>`, 'net', 'sparkles')}
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="card-head">
        <div><h2>Ingresos y gastos</h2><p>Mes a mes en ${year}</p></div>
        <div class="legend"><span><i style="background:var(--accent)"></i>Ingresos</span><span><i style="background:var(--danger)"></i>Gastos</span></div>
      </div>
      ${barChart(months)}
    </section>
    <section class="card">
      <div class="card-head">
        <div><h2>Evolución del patrimonio</h2><p>Efectivo + inversiones al cierre de cada mes</p></div>
        ${worthPoints.length > 1 ? `<span class="delta ${worthEnd >= worthStart ? 'up' : 'down'}">${icon(worthEnd >= worthStart ? 'arrowUp' : 'arrowDown', 12)}${esc(money(worthEnd - worthStart, { decimals: 0 }))}</span>` : ''}
      </div>
      ${worthPoints.length ? lineChart(worthPoints, { label: 'Patrimonio neto por mes' }) : `<div class="empty"><span class="empty-icon">📉</span><h3>Sin datos</h3><p>Este año aún no ha empezado.</p></div>`}
      <p class="tiny" style="margin-top:6px">Meses cerrados: inversiones a precio de coste. Mes actual: a valor de mercado.</p>
    </section>
  </div>

  ${(bestMonth || topCat || invested || withdrawn) ? `<div class="insights">
    ${bestMonth ? `<div class="insight"><span>🏆</span><div><b>Mejor mes</b><p>${esc(monthLabel(bestMonth.key))}: ahorraste ${esc(money(bestMonth.net, { decimals: 0 }))}.</p></div></div>` : ''}
    ${topCat ? `<div class="insight"><span>${esc(topCat.cat?.icon || '📦')}</span><div><b>Mayor gasto</b><p>${esc(topCat.cat?.name || 'Otros')}: ${esc(money(topCat.value, { decimals: 0 }))} (${esc(percent(topCat.share, 0))} del total).</p></div></div>` : ''}
    ${(invested || withdrawn) ? `<div class="insight"><span>📈</span><div><b>Inversión</b><p>Aportaste ${esc(money(invested, { decimals: 0 }))}${withdrawn ? ` y retiraste ${esc(money(withdrawn, { decimals: 0 }))}` : ''} este año.</p></div></div>` : ''}
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
      ${expenseRows.length ? expenseRows.map((r) => catBarRow(r, divisor)).join('') : `<div class="empty"><span class="empty-icon">🧾</span><h3>Sin gastos en ${year}</h3></div>`}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Fuentes de ingreso</h2><p>De dónde viene tu dinero</p></div></div>
      ${incomeRows.length ? incomeRows.map((r) => catBarRow(r, divisor)).join('') : `<div class="empty"><span class="empty-icon">💼</span><h3>Sin ingresos en ${year}</h3></div>`}
    </section>
  </div>`;
}
function catBarRow(r, divisor) {
  const cat = r.cat || { icon: '📦', name: 'Otros', color: '#94a3b8' };
  return `<div class="budget-row">
    <span class="budget-icon" style="background:${cat.color}1f;color:${cat.color}">${esc(cat.icon)}</span>
    <div class="budget-info">
      <div class="budget-line"><b>${esc(cat.name)}</b><span>${esc(percent(r.share, 0))} · ${esc(money(r.value / divisor, { decimals: 0 }))}/mes</span></div>
      <div class="progress"><i style="width:${(clamp(r.share, 0, 1) * 100).toFixed(1)}%;background:${cat.color}"></i></div>
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
    { id: 'informes', icon: 'chart', title: 'Informes', text: 'Tu año en números' },
    { id: 'ajustes', icon: 'settings', title: 'Ajustes', text: 'Tema, PIN, copias y categorías' }
  ];
  return `
  <div class="viewhead"><div><h1>Más</h1><p>Todas las secciones de Mi Cartera.</p></div></div>
  <div class="more-grid">${items.map((it) => `<a class="card more-item" href="#/${it.id}">
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
          <span class="cat-emoji" style="background:${c.color}1f">${esc(c.icon)}</span>
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
        <div><h3>Importar copia</h3><p>Reemplaza los datos actuales.${WEB ? '' : ' Se guarda una copia diaria automática.'}</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="import-json">${icon('upload', 14)} Importar</button>
        <input type="file" id="importFile" accept="application/json,.json" hidden>
      </div>
      ${WEB ? '' : `<div class="path-box" title="Carpeta de datos">${esc(dataDir || 'data/')}</div>
      <p class="tiny" style="margin-top:8px">Copias automáticas en <b>data/backups</b> (últimos 14 días).</p>`}
    </section>

    <section class="card setting-card">
      <h2>Zona de pruebas y reinicio</h2>
      <p>Útil para explorar la app antes de meter tus datos reales.</p>
      <div class="setting-row">
        <div><h3>Cargar datos de ejemplo</h3><p>Reemplaza todo con 6 meses de movimientos, recurrentes, objetivos e inversiones ficticias.</p></div>
        <button class="btn btn-soft btn-sm" type="button" data-action="demo">${icon('sparkles', 14)} Cargar demo</button>
      </div>
      <div class="setting-row">
        <div><h3>Empezar de cero</h3><p>Borra movimientos, recurrentes, objetivos, inversiones y cuentas. Mantiene tu PIN.</p></div>
        <button class="btn btn-ghost btn-sm" type="button" data-action="reset" style="color:var(--danger)">${icon('trash', 14)} Borrar todo</button>
      </div>
      <div class="setting-row">
        <div><h3>Versión</h3><p>${esc(store.session?.version || '1.1.0')} · datos rev ${esc(store.data.rev)}</p></div>
        <span class="badge badge--soft">${WEB ? 'Versión web' : '100% local'}</span>
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
  return `<div class="swatches">${PALETTE.map((color) => `<label class="swatch" style="--c:${color}" title="${color}">
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
    .map((c) => `<option value="${esc(c.id)}"${selected === c.id ? ' selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('');
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
  const initialIcon = category?.icon || (currentKind === 'income' ? '💼' : '🛒');
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
          ${EMOJIS.map((emoji) => `<button type="button" data-emoji="${esc(emoji)}" class="${emoji === initialIcon ? 'active' : ''}">${emoji}</button>`).join('')}
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
        icon: formData.get('icon') || '📦',
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
        ${categories.map((c) => `<div class="field"><span>${esc(c.icon)} ${esc(c.name)}</span>
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
  openSheet({
    title: investment ? 'Editar inversión' : 'Nueva inversión',
    subtitle: 'Las unidades y el precio medio salen de las operaciones que registres.',
    submitLabel: investment ? 'Guardar cambios' : 'Crear inversión',
    dangerLabel: investment ? 'Eliminar' : '',
    body: `
      <div class="field"><span>Nombre</span><input name="name" maxlength="80" placeholder="Ej. MSCI World" value="${esc(investment?.name || '')}" required></div>
      <div class="form-grid">
        <div class="field"><span>Símbolo <span class="hint">(opcional)</span></span><input name="symbol" maxlength="16" placeholder="IWDA" value="${esc(investment?.symbol || '')}"></div>
        <div class="field"><span>Tipo</span><select name="type">
          ${Object.entries(INVEST_TYPES).map(([value, meta]) => `<option value="${value}"${type === value ? ' selected' : ''}>${esc(meta.label)}</option>`).join('')}
        </select></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Precio actual por unidad</span><input name="currentPrice" type="number" min="0" step="any" inputmode="decimal" value="${investment ? esc(investment.currentPrice) : ''}" placeholder="0,00" required></div>
        <div class="field"><span>Última actualización</span><input name="priceDate" type="date" value="${esc(investment?.priceUpdatedAt || todayISO())}"></div>
      </div>
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="300" placeholder="Ej. Aportación mensual automatizada" value="${esc(investment?.note || '')}"></div>
      <input type="hidden" name="color" value="${esc(color)}">
      <p class="seg-note">Después de crearla, usa <b>Operación</b> para registrar compras o ventas.</p>
    `,
    onMount(dialog) {
      const select = dialog.querySelector('select[name="type"]');
      const hidden = dialog.querySelector('input[name="color"]');
      select.addEventListener('change', () => {
        type = select.value;
        color = INVEST_TYPES[type]?.color || '#8b5cf6';
        hidden.value = color;
      });
    },
    async onSubmit(formData) {
      const payload = {
        name: String(formData.get('name') || '').trim(),
        symbol: String(formData.get('symbol') || '').trim(),
        type: formData.get('type'),
        currentPrice: payloadNumber(formData.get('currentPrice')),
        priceUpdatedAt: formData.get('priceDate') || todayISO(),
        note: String(formData.get('note') || ''),
        color: formData.get('color') || color
      };
      if (!payload.name) throw new Error('Ponle un nombre a la inversión.');
      if (payload.currentPrice < 0) throw new Error('El precio no puede ser negativo.');
      if (investment) await api('PATCH', `api/investments/${investment.id}`, payload);
      else await api('POST', 'api/investments', payload);
      render();
      toast(investment ? 'Inversión actualizada' : 'Inversión creada. Añade ahora sus operaciones.');
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
    .map((c) => `<option value="${esc(c.id)}"${selected === c.id ? ' selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('');
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
const GOAL_EMOJIS = ['🎯', '🛟', '✈️', '🏠', '🚗', '💍', '🎓', '💻', '🏖️', '👶', '🐶', '🎸', '🏍️', '📱', '🏦', '🎁'];
function openGoalModal(goal = null) {
  const color = goal?.color || PALETTE[(store.data.goals || []).length % PALETTE.length];
  const initialIcon = goal?.icon || '🎯';
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
        <div class="emoji-grid" data-emoji-grid>${GOAL_EMOJIS.map((e) => `<button type="button" data-emoji="${esc(e)}" class="${e === initialIcon ? 'active' : ''}">${e}</button>`).join('')}</div>
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
        icon: formData.get('icon') || '🎯',
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
  const currentHolding = () => computeHoldings().find((h) => h.id === selectedId);
  const investmentOptions = () => investments.map((inv) => `<option value="${esc(inv.id)}"${selectedId === inv.id ? ' selected' : ''}>${esc(inv.name)}${inv.symbol ? ` (${esc(inv.symbol)})` : ''}</option>`).join('');
  const lastAccount = [...store.data.ops].filter((o) => o.investmentId === selectedId && o.accountId).sort((a, b) => b.date.localeCompare(a.date))[0]?.accountId;
  const accountId = op ? op.accountId || '' : lastAccount || '';

  openSheet({
    title: op ? 'Editar operación' : 'Registrar operación',
    subtitle: 'Una compra suma unidades; una venta las reduce y calcula la ganancia realizada.',
    submitLabel: op ? 'Guardar cambios' : 'Guardar operación',
    dangerLabel: op ? 'Eliminar' : '',
    body: `
      ${fixed
        ? `<div class="banner">${icon('trend', 17)}<span><b>${esc(investmentById(selectedId)?.name || '')}</b> · <span data-op-units>${esc(unitsLabel(currentHolding()?.units || 0))} unidades</span></span></div>`
        : `<div class="field"><span>Inversión</span><select name="investmentId" data-op-investment>${investmentOptions()}</select></div>`}
      <div class="seg seg--full" data-seg="op-type">
        <button type="button" data-op-type="buy" class="${opType === 'buy' ? 'active' : ''}">Compra</button>
        <button type="button" data-op-type="sell" class="${opType === 'sell' ? 'active' : ''}">Venta</button>
      </div>
      <input type="hidden" name="type" value="${opType}">
      <div class="form-grid">
        <div class="field"><span>Unidades</span><input name="units" type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${op ? esc(op.units) : ''}" required></div>
        <div class="field"><span>Precio por unidad</span><input name="price" type="number" min="0" step="any" inputmode="decimal" placeholder="0,00" value="${op ? esc(op.price) : ''}" required></div>
      </div>
      <div class="form-grid">
        <div class="field"><span>Comisiones</span><input name="fees" type="number" min="0" step="0.01" inputmode="decimal" value="${op ? esc(op.fees || 0) : '0'}"></div>
        <div class="field"><span>Fecha</span><input name="date" type="date" value="${esc(op?.date || todayISO())}"></div>
      </div>
      <div class="field"><span>Cuenta de cargo / abono</span><select name="accountId">
        <option value="">Ninguna (no mueve efectivo)</option>
        ${store.data.accounts.map((a) => `<option value="${esc(a.id)}"${accountId === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}
      </select></div>
      <div class="field"><span>Nota <span class="hint">(opcional)</span></span><input name="note" maxlength="300" placeholder="Ej. Aportación mensual" value="${esc(op?.note || '')}"></div>
      ${op ? '' : '<label class="checkbox"><input type="checkbox" name="syncPrice" value="1"> Usar este precio como precio actual de la inversión</label>'}
      <div class="op-total" data-op-total></div>
      <p class="seg-note" data-op-hint></p>
    `,
    onMount(dialog) {
      const typeSeg = dialog.querySelector('[data-seg="op-type"]');
      const hiddenType = dialog.querySelector('input[name="type"]');
      const select = dialog.querySelector('[data-op-investment]');
      const hint = dialog.querySelector('[data-op-hint]');
      const totalEl = dialog.querySelector('[data-op-total]');
      const val = (name) => payloadNumber(dialog.querySelector(`[name="${name}"]`)?.value);
      const update = () => {
        const holding = currentHolding();
        if (holding) hint.textContent = `Disponibles: ${unitsLabel(holding.units)} unidades · precio actual ${money(holding.currentPrice)} · coste medio ${money(holding.avg)}.`;
        const gross = val('units') * val('price');
        const total = opType === 'buy' ? gross + val('fees') : gross - val('fees');
        const acc = dialog.querySelector('select[name="accountId"]').value;
        totalEl.innerHTML = gross > 0
          ? `<span>${opType === 'buy' ? 'Total a pagar' : 'Total a recibir'}</span><b>${esc(money(total))}</b>${acc ? `<small>${opType === 'buy' ? 'Se restará de' : 'Se sumará a'} ${esc(accountById(acc)?.name || '')}</small>` : ''}`
          : '';
      };
      typeSeg.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-op-type]');
        if (!btn) return;
        opType = btn.dataset.opType;
        hiddenType.value = opType;
        for (const b of typeSeg.querySelectorAll('[data-op-type]')) b.classList.toggle('active', b === btn);
        update();
      });
      select?.addEventListener('change', () => { selectedId = select.value; update(); });
      dialog.querySelector('.sheet-body').addEventListener('input', update);
      dialog.querySelector('select[name="accountId"]').addEventListener('change', update);
      update();
    },
    async onSubmit(formData) {
      const payload = {
        investmentId: selectedId,
        type: formData.get('type'),
        units: payloadNumber(formData.get('units')),
        price: payloadNumber(formData.get('price')),
        fees: payloadNumber(formData.get('fees')),
        date: formData.get('date') || todayISO(),
        accountId: formData.get('accountId') || null,
        note: String(formData.get('note') || '')
      };
      if (!fixed) payload.investmentId = formData.get('investmentId') || selectedId;
      if (!(payload.units > 0)) throw new Error('Introduce al menos una unidad.');
      if (payload.price < 0) throw new Error('El precio no puede ser negativo.');
      if (op) await api('PATCH', `api/ops/${op.id}`, payload);
      else await api('POST', 'api/ops', payload);
      if (formData.get('syncPrice')) {
        await api('PATCH', `api/investments/${payload.investmentId}`, { currentPrice: payload.price, priceUpdatedAt: payload.date });
      }
      render();
      toast(op ? 'Operación actualizada' : payload.type === 'buy' ? 'Compra registrada' : 'Venta registrada');
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
        return `<div class="history-row">
          <span class="tx-icon" style="width:32px;height:32px;border-radius:10px;background:${buy ? 'var(--accent-soft)' : 'var(--danger-soft)'};color:${buy ? 'var(--accent-2)' : 'var(--danger)'}">${icon(buy ? 'arrowDown' : 'arrowUp', 15)}</span>
          <span class="tx-main">
            <span class="tx-title">${buy ? 'Compra' : 'Venta'} · ${esc(unitsLabel(op.units))} u.</span>
            <span class="tx-meta">${esc(dateLabel(op.date))} · ${esc(money(op.price))}/u.${op.fees ? ' · comisión ' + esc(money(op.fees)) : ''}${op.note ? ' · ' + esc(op.note) : ''}</span>
          </span>
          <span class="side"><b>${esc(money(total))}</b>${op.accountId ? `<small>${esc(accountById(op.accountId)?.name || '')}</small>` : ''}</span>
          <span class="row-actions"><button type="button" class="icon-btn" data-edit-op="${esc(op.id)}" aria-label="Editar operación">${icon('edit', 16)}</button><button type="button" class="icon-btn danger" data-del-op="${esc(op.id)}" aria-label="Eliminar operación">${icon('trash', 16)}</button></span>
        </div>`;
      }).join('')}</div>` : `<div class="empty"><span class="empty-icon">📋</span><h3>Sin operaciones</h3><p>Añade una compra para empezar a calcular tu posición.</p></div>`}
    `,
    onMount(dialog, form, close) {
      form.querySelector('.sheet-body').addEventListener('click', async (event) => {
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
        if (investment) openPriceModal(investment);
        break;
      }
      case 'pin':
        openPinModal();
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
    if (target.id === 'importFile') {
      const file = target.files?.[0];
      target.value = '';
      if (file) await importFile(file);
    }
  } catch (err) {
    toast(err.message, 'error');
  }
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
  informes: viewInformes,
  mas: viewMas,
  ajustes: viewAjustes
};

boot();





