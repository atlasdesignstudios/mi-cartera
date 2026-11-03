// Mi Cartera · motor fiscal para España (régimen común: península y Baleares).
// Funciones puras, sin dependencias: las usan la interfaz, el servidor y la versión web.
// Fuentes: Ley 37/1992 del IVA, RD 1619/2012 (facturación), RIRPF art. 30 y 110,
// Orden PJC/297/2026 (cotización 2026) y calendario del contribuyente de la AEAT.

export const FISCAL_YEAR = 2026;

/* ------------------------------------------------------------------ IVA e IRPF */
export const IVA_RATES = [21, 10, 4, 0];
export const IVA_LABELS = { 21: '21 % general', 10: '10 % reducido', 4: '4 % superreducido', 0: '0 %' };
// Recargo de equivalencia que se repercute a clientes minoristas (art. 161 LIVA).
export const RECARGO = { 21: 5.2, 10: 1.4, 4: 0.5, 0: 0 };
// Retención de IRPF en facturas de profesionales (art. 101.5 LIRPF y 95 RIRPF).
export const IRPF_OPTIONS = [
  { value: 15, label: '15 % · general profesionales' },
  { value: 7, label: '7 % · nuevos autónomos (año de alta y 2 siguientes)' },
  { value: 19, label: '19 % · alquiler de local' },
  { value: 1, label: '1 % · módulos (algunas actividades)' },
  { value: 0, label: 'Sin retención (cliente particular o actividad empresarial)' }
];
// Operaciones sin IVA y la mención que exige el art. 6.1.j del RD 1619/2012.
export const TAX_MODES = {
  normal: { label: 'Con IVA', mention: '' },
  exento: { label: 'Exenta de IVA', mention: 'Operación exenta de IVA (art. 20 de la Ley 37/1992).' },
  isp: { label: 'Inversión del sujeto pasivo', mention: 'Inversión del sujeto pasivo (art. 84.Uno.2º de la Ley 37/1992).' },
  intracom: { label: 'Cliente de la UE (intracomunitaria)', mention: 'Operación intracomunitaria no sujeta / exenta (arts. 25 y 69 de la Ley 37/1992). El destinatario liquida el IVA.' },
  export: { label: 'Cliente fuera de la UE', mention: 'Operación no sujeta al IVA español o exenta por exportación (arts. 21 y 69 de la Ley 37/1992).' }
};

const r2 = (n) => Math.round((Number(n) || 0) * 100 + Number.EPSILON * 100) / 100;
export const round2 = r2;

/** Totales de una factura: base por tipo, cuota de IVA, recargo, retención y total. */
export function invoiceTotals(inv) {
  const mode = TAX_MODES[inv?.taxMode] ? inv.taxMode : 'normal';
  const lines = (Array.isArray(inv?.lines) ? inv.lines : []).map((l) => {
    const qty = Number(l.qty) || 0;
    const price = Number(l.price) || 0;
    const discount = Math.min(100, Math.max(0, Number(l.discount) || 0));
    const rate = mode === 'normal' && IVA_RATES.includes(Number(l.ivaRate)) ? Number(l.ivaRate) : 0;
    const base = r2(qty * price * (1 - discount / 100));
    return { ...l, qty, price, discount, ivaRate: rate, base };
  });
  const groups = new Map();
  for (const l of lines) {
    const g = groups.get(l.ivaRate) || { rate: l.ivaRate, base: 0, iva: 0, re: 0 };
    g.base = r2(g.base + l.base);
    groups.set(l.ivaRate, g);
  }
  const byRate = [...groups.values()].sort((a, b) => b.rate - a.rate).map((g) => ({
    ...g,
    iva: r2(g.base * g.rate / 100),
    re: inv?.recargo && mode === 'normal' ? r2(g.base * (RECARGO[g.rate] || 0) / 100) : 0
  }));
  const base = r2(byRate.reduce((s, g) => s + g.base, 0));
  const iva = r2(byRate.reduce((s, g) => s + g.iva, 0));
  const re = r2(byRate.reduce((s, g) => s + g.re, 0));
  const irpfRate = Math.max(0, Math.min(47, Number(inv?.irpfRate) || 0));
  const irpf = r2(base * irpfRate / 100);
  return { lines, byRate, base, iva, re, irpfRate, irpf, total: r2(base + iva + re - irpf), mode };
}

/** IVA soportado de una factura recibida (gasto) y la parte deducible. */
export function purchaseTotals(p) {
  const base = r2(p?.base);
  const rate = Number(p?.ivaRate) || 0;
  const iva = p?.ivaAmount !== undefined && p?.ivaAmount !== null && p?.ivaAmount !== '' ? r2(p.ivaAmount) : r2(base * rate / 100);
  const pct = Math.max(0, Math.min(100, p?.deductiblePct === undefined || p?.deductiblePct === null ? 100 : Number(p.deductiblePct)));
  const irpf = r2(base * (Number(p?.irpfRate) || 0) / 100);
  // ivaNoDeducible: el IVA no se recupera (p. ej. comidas) y pasa a ser más gasto en el IRPF.
  const ivaDeducible = p?.ivaNoDeducible ? 0 : r2(iva * pct / 100);
  return {
    base, iva, rate, pct, irpf,
    total: r2(base + iva - irpf),
    ivaDeducible,
    gastoDeducible: r2((base + (p?.ivaNoDeducible ? iva : 0)) * pct / 100)
  };
}

/* ------------------------------------------------------------------ NIF / NIE / CIF */
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
/** Valida un identificador fiscal español. Devuelve { ok, type, value, message }. */
export function validateNif(raw) {
  const value = String(raw || '').toUpperCase().replace(/[\s.-]/g, '');
  if (!value) return { ok: false, type: '', value, message: 'Vacío' };
  if (/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(value) && !value.startsWith('ES')) {
    return { ok: true, type: 'VAT', value, message: 'NIF-IVA de otro país (compruébalo en VIES)' };
  }
  const v = value.startsWith('ES') && value.length > 9 ? value.slice(2) : value;
  if (/^\d{8}[A-Z]$/.test(v)) {
    const ok = DNI_LETTERS[Number(v.slice(0, 8)) % 23] === v[8];
    return { ok, type: 'NIF', value: v, message: ok ? 'NIF correcto' : 'La letra del NIF no coincide' };
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    const num = Number('XYZ'.indexOf(v[0]) + v.slice(1, 8));
    const ok = DNI_LETTERS[num % 23] === v[8];
    return { ok, type: 'NIE', value: v, message: ok ? 'NIE correcto' : 'La letra del NIE no coincide' };
  }
  if (/^[KLM]\d{7}[A-Z]$/.test(v)) {
    const ok = DNI_LETTERS[Number(v.slice(1, 8)) % 23] === v[8];
    return { ok, type: 'NIF', value: v, message: ok ? 'NIF correcto' : 'La letra del NIF no coincide' };
  }
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) {
    const digits = v.slice(1, 8);
    let even = 0;
    let odd = 0;
    for (let i = 0; i < 7; i++) {
      const d = Number(digits[i]);
      if (i % 2 === 1) even += d;
      else { const x = d * 2; odd += Math.floor(x / 10) + (x % 10); }
    }
    const c = (10 - ((even + odd) % 10)) % 10;
    const letter = 'JABCDEFGHI'[c];
    const ctrl = v[8];
    const mustLetter = 'PQRSNW'.includes(v[0]);
    const mustDigit = 'ABEH'.includes(v[0]);
    const ok = mustLetter ? ctrl === letter : mustDigit ? ctrl === String(c) : (ctrl === letter || ctrl === String(c));
    return { ok, type: 'CIF', value: v, message: ok ? 'NIF de sociedad correcto' : 'El dígito de control no coincide' };
  }
  return { ok: false, type: '', value: v, message: 'Formato no reconocido (ej. 12345678Z, X1234567L o B12345674)' };
}

/* ------------------------------------------------------------------ fechas y trimestres */
const pad = (n) => String(n).padStart(2, '0');
export function quarterOf(iso) { return Math.floor((Number(String(iso).slice(5, 7)) - 1) / 3) + 1; }
export function quarterRange(year, q) {
  const start = `${year}-${pad((q - 1) * 3 + 1)}-01`;
  const endMonth = q * 3;
  const end = `${year}-${pad(endMonth)}-${pad(new Date(year, endMonth, 0).getDate())}`;
  return { start, end };
}
function nextBusinessDay(iso) {
  const d = new Date(iso + 'T12:00:00');
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Plazos trimestrales del autónomo (303 y 130) del ejercicio indicado. */
export function quarterDeadline(year, q) {
  if (q === 4) return { from: `${year + 1}-01-01`, to: nextBusinessDay(`${year + 1}-01-30`) };
  const month = q * 3 + 1;
  return { from: `${year}-${pad(month)}-01`, to: nextBusinessDay(`${year}-${pad(month)}-20`) };
}
/** Próximos plazos con Hacienda a partir de hoy. */
export function upcomingDeadlines(todayIso, { count = 4, withRenta = true } = {}) {
  const y = Number(todayIso.slice(0, 4));
  const out = [];
  for (const year of [y - 1, y, y + 1]) {
    for (let q = 1; q <= 4; q++) {
      const d = quarterDeadline(year, q);
      out.push({
        kind: 'quarter', year, q, from: d.from, to: d.to,
        title: `${q}T ${year}: IVA (303) e IRPF (130)`,
        detail: q === 4 ? 'Incluye el resumen anual de IVA (390).' : 'Si domicilias el pago, hasta 5 días antes.'
      });
    }
  }
  if (withRenta) {
    for (const year of [y - 1, y]) {
      out.push({ kind: 'renta', year, from: `${year + 1}-04-08`, to: `${year + 1}-06-30`, title: `Renta ${year} (modelo 100)`, detail: 'Fechas orientativas: la AEAT las confirma cada año.' });
    }
  }
  return out.filter((d) => d.to >= todayIso).sort((a, b) => a.to.localeCompare(b.to)).slice(0, count);
}

/* ------------------------------------------------------------------ cuota de autónomos 2026 */
// Orden PJC/297/2026: tablas de 2025 congeladas para 2026. Tipo total 31,5 %
// (28,3 contingencias comunes + 1,3 profesionales + 0,9 cese + 0,1 FP + 0,9 MEI).
export const RETA_RATE = 0.315;
export const RETA_TARIFA_PLANA = 80;
export const RETA_TARIFA_PLANA_MEI = 88.64;
export const SMI_ANUAL = 17094;
export const RETA_TABLE = [
  { tramo: 'Reducida 1', max: 670, min: 0, baseMin: 653.59, baseMax: 718.94 },
  { tramo: 'Reducida 2', max: 900, baseMin: 718.95, baseMax: 900 },
  { tramo: 'Reducida 3', max: 1166.69, baseMin: 849.67, baseMax: 1166.70 },
  { tramo: 'General 1', max: 1300, baseMin: 950.98, baseMax: 1300 },
  { tramo: 'General 2', max: 1500, baseMin: 960.78, baseMax: 1500 },
  { tramo: 'General 3', max: 1700, baseMin: 960.78, baseMax: 1700 },
  { tramo: 'General 4', max: 1850, baseMin: 1143.79, baseMax: 1850 },
  { tramo: 'General 5', max: 2030, baseMin: 1209.15, baseMax: 2030 },
  { tramo: 'General 6', max: 2330, baseMin: 1274.51, baseMax: 2330 },
  { tramo: 'General 7', max: 2760, baseMin: 1356.21, baseMax: 2760 },
  { tramo: 'General 8', max: 3190, baseMin: 1437.91, baseMax: 3190 },
  { tramo: 'General 9', max: 3620, baseMin: 1519.61, baseMax: 3620 },
  { tramo: 'General 10', max: 4050, baseMin: 1601.31, baseMax: 4050 },
  { tramo: 'General 11', max: 6000, baseMin: 1732.03, baseMax: 5101.20 },
  { tramo: 'General 12', max: Infinity, baseMin: 1928.10, baseMax: 5101.20 }
].map((t, i, all) => ({ ...t, min: i === 0 ? 0 : all[i - 1].max, cuotaMin: r2(t.baseMin * RETA_RATE), cuotaMax: r2(t.baseMax * RETA_RATE) }));

/** Rendimiento computable para la Seguridad Social: (ingresos − gastos) − 7 % (3 % societarios). */
export function retaComputable(ingresosAnuales, gastosAnuales, societario = false) {
  const neto = (Number(ingresosAnuales) || 0) - (Number(gastosAnuales) || 0);
  const generic = societario ? 0.03 : 0.07;
  const anual = neto > 0 ? neto * (1 - generic) : neto;
  return { neto: r2(neto), anual: r2(anual), mensual: r2(anual / 12), generic };
}
export function retaTramo(mensual) {
  const m = Math.max(0, Number(mensual) || 0);
  return RETA_TABLE.find((t) => m <= t.max) || RETA_TABLE[RETA_TABLE.length - 1];
}
/** Meses completos de alta a una fecha (para la tarifa plana). */
export function monthsSince(startIso, todayIso) {
  if (!startIso) return Infinity;
  const [y1, m1, d1] = startIso.split('-').map(Number);
  const [y2, m2, d2] = todayIso.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}
/** Siguiente fecha en la que puede cambiar la base de cotización (6 veces al año). */
export function nextBaseChange(todayIso) {
  const y = Number(todayIso.slice(0, 4));
  const windows = [
    [`${y}-01-01`, `${y}-02-28`, `${y}-03-01`], [`${y}-03-01`, `${y}-04-30`, `${y}-05-01`],
    [`${y}-05-01`, `${y}-06-30`, `${y}-07-01`], [`${y}-07-01`, `${y}-08-31`, `${y}-09-01`],
    [`${y}-09-01`, `${y}-10-31`, `${y}-11-01`], [`${y}-11-01`, `${y}-12-31`, `${y + 1}-01-01`]
  ];
  const w = windows.find(([from, to]) => todayIso >= from && todayIso <= to) || windows[0];
  return { requestBy: w[1], effective: w[2] };
}

/* ------------------------------------------------------------------ modelos 303 y 130 */
const inRange = (iso, a, b) => iso >= a && iso <= b;
const isIssued = (inv) => inv && inv.status !== 'draft' && inv.number;

/** Modelo 303: IVA repercutido (facturas emitidas) − IVA soportado deducible (gastos). */
export function modelo303(invoices, purchases, year, q) {
  const { start, end } = quarterRange(year, q);
  const issued = (invoices || []).filter((i) => isIssued(i) && inRange(i.date, start, end));
  const rows = new Map();
  let baseNoSujeta = 0;
  let re = 0;
  for (const inv of issued) {
    const t = invoiceTotals(inv);
    if (t.mode !== 'normal') { baseNoSujeta = r2(baseNoSujeta + t.base); continue; }
    for (const g of t.byRate) {
      const row = rows.get(g.rate) || { rate: g.rate, base: 0, cuota: 0 };
      row.base = r2(row.base + g.base);
      row.cuota = r2(row.cuota + g.iva);
      rows.set(g.rate, row);
      re = r2(re + g.re);
    }
  }
  const bought = (purchases || []).filter((p) => inRange(p.date, start, end));
  let baseSoportado = 0;
  let soportado = 0;
  for (const p of bought) {
    const t = purchaseTotals(p);
    if (t.ivaDeducible > 0) { baseSoportado = r2(baseSoportado + r2(t.base * t.pct / 100)); soportado = r2(soportado + t.ivaDeducible); }
  }
  const devengado = r2([...rows.values()].reduce((s, r) => s + r.cuota, 0) + re);
  const resultado = r2(devengado - soportado);
  return {
    year, q, start, end,
    repercutido: [...rows.values()].sort((a, b) => b.rate - a.rate),
    recargo: re, baseNoSujeta, devengado,
    baseSoportado, soportado, resultado,
    invoices: issued.length, purchases: bought.length
  };
}

/**
 * Modelo 130 (estimación directa simplificada): 20 % del rendimiento neto acumulado del año,
 * menos retenciones soportadas y pagos de trimestres anteriores.
 * opts.retaMonthly: cuota mensual de autónomos que se suma como gasto si no está ya apuntada.
 */
export function modelo130(invoices, purchases, year, q, opts = {}) {
  const start = `${year}-01-01`;
  const { end } = quarterRange(year, q);
  const issued = (invoices || []).filter((i) => isIssued(i) && inRange(i.date, start, end));
  let ingresos = 0;
  let retenciones = 0;
  let conRetencion = 0;
  for (const inv of issued) {
    const t = invoiceTotals(inv);
    ingresos = r2(ingresos + t.base);
    retenciones = r2(retenciones + t.irpf);
    if (t.irpf > 0) conRetencion = r2(conRetencion + t.base);
  }
  let gastos = 0;
  let retaApuntada = 0;
  for (const p of (purchases || []).filter((x) => inRange(x.date, start, end))) {
    const t = purchaseTotals(p);
    gastos = r2(gastos + t.gastoDeducible);
    if (p.kind === 'reta') retaApuntada = r2(retaApuntada + t.base);
  }
  let retaAuto = 0;
  if (opts.retaMonthly > 0 && retaApuntada === 0) {
    const from = opts.startDate && opts.startDate > start ? opts.startDate : start;
    if (from <= end) {
      const months = (Number(end.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(end.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
      retaAuto = r2(Math.max(0, months) * opts.retaMonthly);
    }
  }
  gastos = r2(gastos + retaAuto);
  const previo = r2(ingresos - gastos);
  const dificil = previo > 0 ? r2(Math.min(2000, previo * 0.05)) : 0;
  const rendimiento = r2(previo - dificil);
  const cuota20 = rendimiento > 0 ? r2(rendimiento * 0.2) : 0;
  let anteriores = 0;
  if (q > 1) {
    for (let k = 1; k < q; k++) {
      const prev = modelo130(invoices, purchases, year, k, opts);
      anteriores = r2(anteriores + Math.max(0, prev.resultado));
    }
  }
  const bruto = r2(cuota20 - anteriores - retenciones);
  return {
    year, q, start, end,
    ingresos, gastos, retaAuto, previo, dificil, rendimiento, cuota20,
    anteriores, retenciones, bruto,
    resultado: Math.max(0, bruto),
    pctRetencion: ingresos > 0 ? conRetencion / ingresos : 0,
    invoices: issued.length
  };
}
