import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidIsoDate, finiteNumber, roundMoney, round2,
  normalizeInvoiceLines, normalizePurchaseInput,
  invoiceTotals, purchaseTotals, validateNif,
  monthKeyOf, monthKeysBetween, retaPlan,
  modelo303, modelo130, modelo130Exemption, quarterRange, quarterDeadline, upcomingDeadlines,
  retaTramo, retaComputable, RETA_TABLE, RETA_RATE
} from '../public/fiscal.js';

const invoice = (over = {}) => ({
  id: 'i1', kind: 'ordinaria', status: 'issued', number: 'F2026-0001',
  date: '2026-05-10', taxMode: 'normal', irpfRate: 0, recargo: false,
  lines: [{ desc: 'Servicio', qty: 1, price: 1000, discount: 0, ivaRate: 21 }],
  ...over
});
const purchase = (over = {}) => ({
  date: '2026-05-01', base: 500, ivaRate: 21, ivaAmount: null,
  deductiblePct: 100, ivaNoDeducible: false, irpfRate: 0, kind: 'otros',
  ...over
});

/* ------------------------------------------------------------------ fechas y números */
test('isValidIsoDate rechaza fechas inexistentes y formatos raros', () => {
  assert.equal(isValidIsoDate('2026-02-31'), false);
  assert.equal(isValidIsoDate('2026-13-01'), false);
  assert.equal(isValidIsoDate('2026-00-10'), false);
  assert.equal(isValidIsoDate('2026-04-31'), false);
  assert.equal(isValidIsoDate('2025-02-29'), false);
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.equal(isValidIsoDate('2026-12-31'), true);
  assert.equal(isValidIsoDate('2026-1-1'), false);
  assert.equal(isValidIsoDate(''), false);
  assert.equal(isValidIsoDate(null), false);
});

test('roundMoney redondea de forma simétrica y no propaga NaN/Infinity', () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(-1.005), -1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(-2.675), -2.68);
  assert.equal(round2(NaN), 0);
  assert.equal(round2(Infinity), 0);
  assert.equal(round2(-Infinity), 0);
  assert.equal(round2(1e308), 0);
  assert.equal(round2(-1e308), 0);
  assert.equal(roundMoney(Number.MAX_VALUE), 0);
  assert.equal(roundMoney(1.234567, 3), 1.235);
  assert.equal(finiteNumber('21', 0), 21);
  assert.equal(finiteNumber('', 7), 7);
  assert.equal(finiteNumber('abc', 7), 7);
});

test('monthKeysBetween genera meses consecutivos y respeta el orden', () => {
  assert.deepEqual(monthKeysBetween('2026-11-15', '2027-02-02'), ['2026-11', '2026-12', '2027-01', '2027-02']);
  assert.deepEqual(monthKeysBetween('2026-12-01', '2026-12-31'), ['2026-12']);
  assert.deepEqual(monthKeysBetween('2026-05-01', '2026-04-01'), []);
  assert.equal(monthKeyOf('2026-02-31'), '');
  assert.equal(monthKeyOf('2026-02-28'), '2026-02');
});

/* ------------------------------------------------------------------ líneas de factura */
test('normalizeInvoiceLines exige cantidades positivas en facturas ordinarias', () => {
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: 0, price: 10 }]), /mayor que cero/);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: -1, price: 10 }]), /mayor que cero/);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: 1, price: -10 }]), /no puede ser negativo/);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: 'abc', price: 10 }]), /números válidos/);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: 1, price: 10, discount: 101 }]), /descuento/);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: 1, price: 10, ivaRate: 5 }]), /IVA/);
});

test('normalizeInvoiceLines admite negativos solo en rectificativas', () => {
  const ok = normalizeInvoiceLines([{ desc: 'Anulación', qty: -2, price: 50, ivaRate: 10 }], 'rectificativa');
  assert.deepEqual(ok, [{ desc: 'Anulación', qty: -2, price: 50, discount: 0, ivaRate: 10 }]);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: 0, price: 10 }], 'rectificativa'), /cero/);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'X', qty: -1, price: 10 }], 'ordinaria'), /mayor que cero/);
});

test('normalizeInvoiceLines ignora filas vacías y limita a 100 líneas', () => {
  assert.deepEqual(normalizeInvoiceLines([{ desc: '', qty: 1, price: 0 }]), []);
  assert.throws(() => normalizeInvoiceLines([{ desc: 'Solo concepto' }]), /mayor que cero/);
  const many = Array.from({ length: 101 }, (_, i) => ({ desc: `L${i}`, qty: 1, price: 1 }));
  assert.throws(() => normalizeInvoiceLines(many), /100 líneas/);
});

test('normalizeInvoiceLines en modo importación corrige en vez de perder la factura', () => {
  const imported = normalizeInvoiceLines([{ desc: 'Antigua', qty: 0, price: -10, ivaRate: 5 }], 'ordinaria', { strict: false });
  assert.equal(imported.length, 1);
  assert.ok(imported[0].qty > 0);
  assert.equal(imported[0].price, 10);
  assert.equal(imported[0].ivaRate, 21);
});

test('normalizePurchaseInput valida base, IVA, afectación y retención', () => {
  assert.throws(() => normalizePurchaseInput({ base: 'abc' }), /base imponible/);
  assert.throws(() => normalizePurchaseInput({ base: -1 }), /base imponible/);
  assert.throws(() => normalizePurchaseInput({ base: 100, ivaAmount: 200 }), /superar la base/);
  assert.throws(() => normalizePurchaseInput({ base: 100, ivaAmount: -1 }), /negativo/);
  assert.throws(() => normalizePurchaseInput({ base: 100, deductiblePct: 150 }), /porcentaje deducible/);
  assert.throws(() => normalizePurchaseInput({ base: 100, irpfRate: 50 }), /retención/);
  assert.throws(() => normalizePurchaseInput({ base: 100, ivaRate: 5 }), /IVA/);
  const reta = normalizePurchaseInput({ base: 380, ivaRate: 21 }, { kind: 'reta' });
  assert.equal(reta.ivaRate, 0);
  assert.equal(reta.ivaAmount, null);
  const lax = normalizePurchaseInput({ base: 100, ivaAmount: 200, deductiblePct: 150 }, { strict: false });
  assert.equal(lax.ivaAmount, 100);
  assert.equal(lax.deductiblePct, 0);
});

/* ------------------------------------------------------------------ totales */
test('invoiceTotals agrupa por tipo, aplica descuento, recargo e IRPF', () => {
  const t = invoiceTotals({
    taxMode: 'normal', recargo: false, irpfRate: 15,
    lines: [
      { qty: 2, price: 100, discount: 10, ivaRate: 21 },
      { qty: 1, price: 50, discount: 0, ivaRate: 10 }
    ]
  });
  assert.equal(t.base, 230);
  assert.equal(t.iva, 42.8);
  assert.equal(t.irpf, 34.5);
  assert.equal(t.total, 238.3);
  assert.deepEqual(t.byRate.map((g) => g.rate), [21, 10]);
});

test('invoiceTotals calcula el recargo de equivalencia y las operaciones sin IVA', () => {
  const withRe = invoiceTotals({ recargo: true, taxMode: 'normal', lines: [{ qty: 1, price: 100, ivaRate: 21 }] });
  assert.equal(withRe.re, 5.2);
  assert.equal(withRe.total, 126.2);
  const exempt = invoiceTotals({ recargo: true, taxMode: 'exento', lines: [{ qty: 1, price: 100, ivaRate: 21 }] });
  assert.equal(exempt.iva, 0);
  assert.equal(exempt.re, 0);
  assert.equal(exempt.total, 100);
});

test('una rectificativa anula exactamente la factura original', () => {
  const orig = invoiceTotals({ taxMode: 'normal', lines: [{ qty: 3, price: 99.99, discount: 7, ivaRate: 21 }] });
  const rect = invoiceTotals({ taxMode: 'normal', lines: [{ qty: -3, price: 99.99, discount: 7, ivaRate: 21 }] });
  assert.equal(round2(orig.base + rect.base), 0);
  assert.equal(round2(orig.iva + rect.iva), 0);
  assert.equal(round2(orig.total + rect.total), 0);
});

test('purchaseTotals calcula IVA deducible, afectación e IVA no deducible', () => {
  const full = purchaseTotals(purchase());
  assert.equal(full.iva, 105);
  assert.equal(full.gastoDeducible, 500);
  assert.equal(full.ivaDeducible, 105);
  assert.equal(full.total, 605);
  const half = purchaseTotals(purchase({ deductiblePct: 50 }));
  assert.equal(half.gastoDeducible, 250);
  assert.equal(half.ivaDeducible, 52.5);
  const noIva = purchaseTotals(purchase({ ivaNoDeducible: true }));
  assert.equal(noIva.ivaDeducible, 0);
  assert.equal(noIva.gastoDeducible, 605);
  const manual = purchaseTotals(purchase({ ivaAmount: 5 }));
  assert.equal(manual.iva, 5);
  const broken = purchaseTotals(purchase({ deductiblePct: 'abc', base: 'abc' }));
  assert.equal(broken.base, 0);
  assert.equal(broken.pct, 0);
  assert.ok(Number.isFinite(broken.gastoDeducible));
});

test('validateNif acepta DNI, NIE y CIF válidos y rechaza letras incorrectas', () => {
  assert.equal(validateNif('12345678Z').ok, true);
  assert.equal(validateNif('12345678A').ok, false);
  assert.equal(validateNif('X1234567L').ok, true);
  assert.equal(validateNif('B12345674').ok, true);
  assert.equal(validateNif('B12345670').ok, false);
  assert.equal(validateNif('ES12345678Z').ok, true);
});

/* ------------------------------------------------------------------ RETA */
test('retaPlan estima solo los meses sin recibo y respeta el alta', () => {
  const plan = retaPlan({
    year: 2026, todayIso: '2026-11-04', startDate: '2026-03-15', monthly: 380,
    purchases: [{ kind: 'reta', date: '2026-04-05', base: 380 }, { kind: 'otros', date: '2026-05-01', base: 100 }]
  });
  assert.deepEqual(plan.recorded, ['2026-04']);
  assert.deepEqual(plan.missing, ['2026-03', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  assert.equal(plan.months, 9);
  assert.equal(plan.totalMonths, 10);
  assert.equal(plan.autoAmount, 3040);
});

test('retaPlan no inventa meses después de la baja ni antes del alta', () => {
  const baja = retaPlan({ year: 2026, todayIso: '2026-11-04', startDate: '2026-01-01', endDate: '2026-06-30', monthly: 300 });
  assert.equal(baja.totalMonths, 6);
  assert.equal(baja.months, 6);
  assert.equal(baja.autoAmount, 1800);
  const futura = retaPlan({ year: 2026, todayIso: '2026-11-04', startDate: '2027-01-01', monthly: 300 });
  assert.equal(futura.months, 0);
  assert.equal(futura.autoAmount, 0);
});

test('retaPlan cuenta una sola vez cada mes aunque haya dos recibos', () => {
  const plan = retaPlan({
    year: 2026, todayIso: '2026-05-31', startDate: '2026-01-01', monthly: 100,
    purchases: [{ kind: 'reta', date: '2026-02-01' }, { kind: 'reta', date: '2026-02-28' }]
  });
  assert.deepEqual(plan.recorded, ['2026-02']);
  assert.deepEqual(plan.missing, ['2026-01', '2026-03', '2026-04', '2026-05']);
});

test('RETA_TABLE coincide con la base mínima publicada para 2026', () => {
  assert.equal(RETA_TABLE[0].baseMin, 653.59);
  assert.equal(RETA_TABLE[0].cuotaMin, round2(653.59 * RETA_RATE));
  assert.equal(retaTramo(500).tramo, 'Reducida 1');
  assert.equal(retaTramo(1000).tramo, 'Reducida 3');
  assert.equal(retaTramo(1200).tramo, 'General 1');
  assert.equal(retaTramo(999999).baseMax, 5101.2);
  assert.equal(retaComputable(50000, 10000).mensual, round2((40000 * 0.93) / 12));
});

/* ------------------------------------------------------------------ modelos */
test('modelo130: regresión de cuota RETA parcial (no suprime los meses que faltan)', () => {
  const r = modelo130(
    [invoice({ date: '2026-05-10', lines: [{ desc: 'Servicio', qty: 1, price: 5000, discount: 0, ivaRate: 21 }] })],
    [purchase({ kind: 'reta', date: '2026-04-05', base: 380, ivaRate: 0 }), purchase({ date: '2026-05-01', base: 1000 })],
    2026, 2, { retaMonthly: 380, startDate: '2026-03-15', regime: 'simplificada' }
  );
  assert.equal(r.retaAuto, 1140);
  assert.deepEqual(r.retaMonths, ['2026-03', '2026-05', '2026-06']);
  assert.equal(r.gastos, 2520);
  assert.equal(r.previo, 2480);
  assert.equal(r.dificil, 124);
  assert.equal(r.cuota20, 471.2);
  assert.equal(r.resultado, 471.2);
});

test('modelo130 no duplica la cuota ya apuntada de todos los meses', () => {
  const r = modelo130(
    [invoice({ date: '2026-02-10' })],
    [1, 2, 3].map((m) => purchase({ kind: 'reta', date: `2026-0${m}-05`, base: 380, ivaRate: 0 })),
    2026, 1, { retaMonthly: 380, startDate: '2026-01-01' }
  );
  assert.equal(r.retaAuto, 0);
  assert.equal(r.gastos, 1140);
});

test('modelo130 arrastra los pagos anteriores y descuenta las retenciones', () => {
  const q1 = invoice({ id: 'q1', date: '2026-01-15', lines: [{ desc: 'X', qty: 1, price: 1000, discount: 0, ivaRate: 21 }] });
  const first = modelo130([q1], [], 2026, 1, { regime: 'simplificada' });
  assert.equal(first.dificil, 50);
  assert.equal(first.cuota20, 190);
  assert.equal(first.resultado, 190);
  const second = modelo130([q1], [], 2026, 2, { regime: 'simplificada' });
  assert.equal(second.anteriores, 190);
  assert.equal(second.resultado, 0);
  const retenido = modelo130([invoice({ ...q1, irpfRate: 15 })], [], 2026, 1, { regime: 'simplificada' });
  assert.equal(retenido.retenciones, 150);
  assert.equal(retenido.resultado, 40);
});

test('modelo130 limita el gasto de difícil justificación a 2.000 €', () => {
  const r = modelo130(
    [invoice({ date: '2026-02-10', lines: [{ desc: 'X', qty: 1, price: 100000, discount: 0, ivaRate: 21 }] })],
    [], 2026, 1, {}
  );
  assert.equal(r.dificil, 2000);
  assert.equal(r.cuota20, round2((98000) * 0.2));
});

test('modelo303 calcula IVA repercutido y soportado deducible', () => {
  const r = modelo303([invoice()], [purchase()], 2026, 2);
  assert.equal(r.devengado, 210);
  assert.equal(r.baseSoportado, 500);
  assert.equal(r.soportado, 105);
  assert.equal(r.resultado, 105);
});

test('modelo303 excluye borradores, separa operaciones sin IVA y aplica la afectación', () => {
  const normal = invoice();
  const draft = invoice({ id: 'd', status: 'draft', number: null });
  const exempt = invoice({ id: 'e', taxMode: 'exento', lines: [{ desc: 'X', qty: 1, price: 1000, discount: 0, ivaRate: 21 }] });
  const r = modelo303([normal, draft, exempt], [purchase({ deductiblePct: 50 })], 2026, 2);
  assert.equal(r.invoices, 2);
  assert.equal(r.baseNoSujeta, 1000);
  assert.equal(r.soportado, 52.5);
  assert.equal(r.resultado, 157.5);
});

test('modelo303 compensa una rectificativa con su factura original', () => {
  const orig = invoice();
  const rect = invoice({
    id: 'r1', kind: 'rectificativa', number: 'R2026-0001',
    lines: [{ desc: 'Anulación', qty: -1, price: 1000, discount: 0, ivaRate: 21 }]
  });
  const r = modelo303([orig, rect], [], 2026, 2);
  assert.equal(r.devengado, 0);
  assert.equal(r.resultado, 0);
});

/* ------------------------------------------------------------------ plazos */
test('quarterRange y quarterDeadline calculan trimestres y plazos', () => {
  assert.deepEqual(quarterRange(2026, 1), { start: '2026-01-01', end: '2026-03-31' });
  assert.deepEqual(quarterRange(2026, 4), { start: '2026-10-01', end: '2026-12-31' });
  assert.deepEqual(quarterDeadline(2026, 1), { from: '2026-04-01', to: '2026-04-20' });
  assert.deepEqual(quarterDeadline(2026, 4), { from: '2027-01-01', to: '2027-02-01' });
});

test('upcomingDeadlines devuelve el siguiente plazo real', () => {
  const next = upcomingDeadlines('2026-11-04', { count: 1, withRenta: false });
  assert.equal(next[0].year, 2026);
  assert.equal(next[0].q, 4);
  assert.equal(next[0].to, '2027-02-01');
});


test('modelo130 solo aplica difícil justificación en estimación directa simplificada y si no hay reducción incompatible', () => {
  const inv = [invoice({ date: '2026-01-15' })];
  assert.equal(modelo130(inv, [], 2026, 1, {}).dificil, 0);
  assert.equal(modelo130(inv, [], 2026, 1, { regime: 'normal' }).dificil, 0);
  assert.equal(modelo130(inv, [], 2026, 1, { regime: 'simplificada', uniqueClientReduction: true }).dificil, 0);
  assert.equal(modelo130(inv, [], 2026, 1, { regime: 'simplificada' }).dificil, 50);
  assert.equal(modelo130(inv, [], 2026, 1, { regime: 'simplificada', difficultRate: 0.10 }).dificil, 100);
});

test('modelo130Exemption solo exime actividad profesional con 70% retenido en período aplicable', () => {
  const prior = [invoice({ date: '2025-03-01', irpfRate: 15 }), invoice({ id: 'b', date: '2025-04-01', irpfRate: 0 })];
  assert.equal(modelo130Exemption(prior, 2026, { activity: 'profesional' }).exempt, false);
  assert.equal(modelo130Exemption([invoice({ date: '2025-03-01', irpfRate: 15 })], 2026, { activity: 'profesional' }).exempt, true);
  assert.equal(modelo130Exemption([invoice({ date: '2025-03-01', irpfRate: 15 })], 2026, { activity: 'empresarial' }).exempt, false);
});

test('quarterDeadline desplaza también festivos configurados', () => {
  assert.equal(quarterDeadline(2026, 1, { holidays: ['2026-04-20'] }).to, '2026-04-21');
});
