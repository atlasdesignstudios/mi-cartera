// Pruebas de integración: arranca una copia aislada del servidor en un directorio temporal.
// Nunca toca data/db.json del usuario.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); };

let tmp;
let child;
let port;
let logs = '';

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port: free } = srv.address();
      srv.close(() => resolve(free));
    });
  });
}

function request({ method = 'GET', path: urlPath = '/', headers = {}, body } = {}) {
  const payload = body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
  const finalHeaders = { ...headers };
  if (payload !== null) {
    finalHeaders['Content-Length'] = Buffer.byteLength(payload);
    if (!Object.keys(finalHeaders).some((k) => k.toLowerCase() === 'content-type')) {
      finalHeaders['Content-Type'] = 'application/json';
    }
  }
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers: finalHeaders }, (res) => {
      let text = '';
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => {
        let data = null;
        try { data = JSON.parse(text); } catch { /* respuesta no JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, body: data, text });
      });
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

const cookieOf = (res) => {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const found = list.map((c) => /^mc_session=[^;]*/.exec(c)?.[0]).find(Boolean);
  return found || '';
};

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-cartera-test-'));
  for (const file of ['server.js', 'package.json']) fs.copyFileSync(path.join(ROOT, file), path.join(tmp, file));
  fs.cpSync(path.join(ROOT, 'public'), path.join(tmp, 'public'), { recursive: true });
  port = await freePort();
  child = spawn(process.execPath, ['server.js', '--no-open'], {
    cwd: tmp,
    env: { ...process.env, PORT: String(port), MC_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (chunk) => { logs += String(chunk); });
  child.stderr.on('data', (chunk) => { logs += String(chunk); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`El servidor no arrancó.\n${logs}`)), 20000);
    const check = () => {
      const m = /localhost:(\d+)/.exec(logs);
      if (m) { clearTimeout(timer); port = Number(m[1]); resolve(); }
    };
    child.stdout.on('data', check);
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`El servidor salió con ${code}.\n${logs}`)); });
  });
}, { timeout: 30000 });

after(async () => {
  if (child && child.exitCode === null) {
    child.kill();
    await Promise.race([once(child, 'exit'), new Promise((r) => setTimeout(r, 3000))]);
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* Windows puede retener archivos */ }
});

test('la API responde y no expone la ruta absoluta de los datos', async () => {
  const ping = await request({ path: '/api/ping' });
  assert.equal(ping.status, 200);
  assert.equal(ping.body.ok, true);
  const session = await request({ path: '/api/session' });
  assert.equal(session.status, 200);
  assert.equal('dataDir' in session.body, false);
  assert.equal(typeof session.body.lanExposed, 'boolean');
});

test('bloquea Host y Origin ajenos y los cuerpos que no son JSON', async () => {
  const foreignHost = await request({ path: '/api/ping', headers: { Host: 'evil.example' } });
  assert.equal(foreignHost.status, 403);

  const foreignOrigin = await request({
    method: 'POST', path: '/api/clients', headers: { Origin: 'https://evil.example' },
    body: { name: 'Atacante' }
  });
  assert.equal(foreignOrigin.status, 403);

  // Un origen en otro puerto del mismo host también es otro origen.
  const foreignPort = await request({
    method: 'POST', path: '/api/clients', headers: { Origin: `http://localhost:${port + 1}` },
    body: { name: 'Atacante desde otro puerto' }
  });
  assert.equal(foreignPort.status, 403);

  const sameOrigin = await request({
    path: '/api/ping', headers: { Origin: `http://127.0.0.1:${port}` }
  });
  assert.equal(sameOrigin.status, 200);

  const plain = await request({
    method: 'POST', path: '/api/clients', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ name: 'Formulario' })
  });
  assert.equal(plain.status, 415);
});

test('crea negocio, cuenta y cliente para operar', async () => {
  const business = await request({
    method: 'PATCH', path: '/api/settings',
    body: { business: { name: 'Autónoma de Prueba', nif: '12345678Z', series: 'F', seriesR: 'R', paymentDays: 30 } }
  });
  assert.equal(business.status, 200);
  assert.equal(business.body.settings.business.nif, '12345678Z');

  const account = await request({ method: 'POST', path: '/api/accounts', body: { name: 'Cuenta test', type: 'bank', initialBalance: 0 } });
  assert.equal(account.status, 200);
  assert.ok(account.body.createdId);

  const client = await request({ method: 'POST', path: '/api/clients', body: { name: 'Cliente de Prueba SL', nif: 'B12345674', kind: 'empresa' } });
  assert.equal(client.status, 200);
  assert.ok(client.body.createdId);
});

test('emite, protege y rectifica una factura', async () => {
  const settings = await request({ path: '/api/state' });
  const accountId = settings.body.accounts[0].id;
  const clientId = settings.body.clients[0].id;

  const draft = await request({
    method: 'POST', path: '/api/invoices',
    body: { clientId, date: today(), lines: [{ desc: 'Servicio', qty: 1, price: 100, discount: 0, ivaRate: 21 }], taxMode: 'normal', irpfRate: 0 }
  });
  assert.equal(draft.status, 200);
  const invoiceId = draft.body.createdId;

  const issued = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/issue` });
  assert.equal(issued.status, 200);
  const inv = issued.body.invoices.find((i) => i.id === invoiceId);
  assert.equal(inv.status, 'issued');
  assert.match(inv.number, /^F\d{4}-0001$/);
  assert.equal(inv.total, 121);
  assert.ok(inv.dueDate);

  // Una factura emitida no se puede alterar ni borrar.
  const patch = await request({
    method: 'PATCH', path: `/api/invoices/${invoiceId}`,
    body: { lines: [{ desc: 'Hackeada', qty: 1, price: 999999, ivaRate: 21 }], note: 'intento', internalNote: 'nota interna' }
  });
  assert.equal(patch.status, 200);
  const patched = patch.body.invoices.find((i) => i.id === invoiceId);
  assert.equal(patched.total, 121);
  assert.equal(patched.lines[0].desc, 'Servicio');
  assert.equal(patched.internalNote, 'nota interna');
  assert.equal(patched.note, '');

  const del = await request({ method: 'DELETE', path: `/api/invoices/${invoiceId}` });
  assert.equal(del.status, 400);

  const rect = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/rectify` });
  assert.equal(rect.status, 200);
  const rectId = rect.body.createdId;
  const rectDraft = rect.body.invoices.find((i) => i.id === rectId);
  assert.equal(rectDraft.kind, 'rectificativa');
  assert.equal(rectDraft.total, -121);

  const rectIssued = await request({ method: 'POST', path: `/api/invoices/${rectId}/issue` });
  assert.equal(rectIssued.status, 200);
  const rectFinal = rectIssued.body.invoices.find((i) => i.id === rectId);
  assert.match(rectFinal.number, /^R\d{4}-0001$/);
  assert.equal(rectFinal.total, -121);

  const twice = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/rectify` });
  assert.equal(twice.status, 400);
  assert.match(twice.body.error, /ya tiene la rectificativa/);

  const chain = await request({ method: 'POST', path: `/api/invoices/${rectId}/rectify` });
  assert.equal(chain.status, 400);
  assert.match(chain.body.error, /rectificativa/);

  // Cobro y abono con movimiento bancario, y su reversión.
  const pay = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/pay`, body: { accountId, date: today() } });
  assert.equal(pay.status, 200);
  const paid = pay.body.invoices.find((i) => i.id === invoiceId);
  assert.equal(paid.status, 'paid');
  const income = pay.body.transactions.find((t) => t.invoiceId === invoiceId);
  assert.equal(income.type, 'income');
  assert.equal(income.amount, 121);

  const unpay = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/unpay` });
  assert.equal(unpay.status, 200);
  assert.equal(unpay.body.invoices.find((i) => i.id === invoiceId).status, 'issued');
  assert.equal(unpay.body.transactions.some((t) => t.invoiceId === invoiceId), false);

  const badAccount = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/pay`, body: { accountId: 'no-existe' } });
  assert.equal(badAccount.status, 400);
  assert.match(badAccount.body.error, /cuenta indicada no existe/);

  const futurePay = await request({ method: 'POST', path: `/api/invoices/${invoiceId}/pay`, body: { accountId, date: tomorrow() } });
  assert.equal(futurePay.status, 400);
  assert.match(futurePay.body.error, /futura/);
});

test('rechaza fechas y cantidades imposibles', async () => {
  const state = await request({ path: '/api/state' });
  const clientId = state.body.clients[0].id;

  const badDate = await request({
    method: 'POST', path: '/api/invoices',
    body: { clientId, date: '2026-02-31', lines: [{ desc: 'X', qty: 1, price: 10, ivaRate: 21 }] }
  });
  assert.equal(badDate.status, 400);
  assert.match(badDate.body.error, /fecha de la factura no es válida/);

  const zeroQty = await request({
    method: 'POST', path: '/api/invoices',
    body: { clientId, date: today(), lines: [{ desc: 'X', qty: 0, price: 10, ivaRate: 21 }] }
  });
  assert.equal(zeroQty.status, 400);
  assert.match(zeroQty.body.error, /mayor que cero/);

  const negativePrice = await request({
    method: 'POST', path: '/api/invoices',
    body: { clientId, date: today(), lines: [{ desc: 'X', qty: 1, price: -10, ivaRate: 21 }] }
  });
  assert.equal(negativePrice.status, 400);

  const futureInvoice = await request({
    method: 'POST', path: '/api/invoices',
    body: { clientId, date: tomorrow(), issue: true, lines: [{ desc: 'X', qty: 1, price: 10, ivaRate: 21 }] }
  });
  assert.equal(futureInvoice.status, 400);
  assert.match(futureInvoice.body.error, /futura/);

  const state2 = await request({ path: '/api/state' });
  const accountId = state2.body.accounts[0].id;
  const categoryId = state2.body.categories.find((c) => c.kind === 'expense').id;

  const badTx = await request({
    method: 'POST', path: '/api/transactions',
    body: { type: 'expense', amount: 10, accountId, categoryId, date: '2026-02-31' }
  });
  assert.equal(badTx.status, 400);
  assert.match(badTx.body.error, /fecha del movimiento/);

  const hugeTx = await request({
    method: 'POST', path: '/api/transactions',
    body: { type: 'expense', amount: 1e308, accountId, categoryId, date: today() }
  });
  assert.equal(hugeTx.status, 400);

  const badRule = await request({
    method: 'POST', path: '/api/recurring',
    body: { type: 'expense', amount: 10, accountId, categoryId, frequency: 'monthly', startDate: '2026-02-31' }
  });
  assert.equal(badRule.status, 400);
  assert.match(badRule.body.error, /fecha de inicio/);

  const badGoal = await request({ method: 'POST', path: '/api/goals', body: { name: 'Viaje', target: 1000, deadline: '2026-02-31' } });
  assert.equal(badGoal.status, 400);
  assert.match(badGoal.body.error, /fecha límite/);
});

test('valida los importes de los gastos y mantiene su movimiento', async () => {
  const state = await request({ path: '/api/state' });
  const accountId = state.body.accounts[0].id;

  const badIva = await request({ method: 'POST', path: '/api/purchases', body: { supplier: 'Proveedor', base: 100, ivaAmount: 200 } });
  assert.equal(badIva.status, 400);
  assert.match(badIva.body.error, /superar la base/);

  const badDate = await request({ method: 'POST', path: '/api/purchases', body: { supplier: 'Proveedor', base: 100, date: '2026-02-31' } });
  assert.equal(badDate.status, 400);
  assert.match(badDate.body.error, /fecha del gasto no es válida/);

  const badPct = await request({ method: 'POST', path: '/api/purchases', body: { supplier: 'Proveedor', base: 100, deductiblePct: 150 } });
  assert.equal(badPct.status, 400);
  assert.match(badPct.body.error, /porcentaje deducible/);

  const created = await request({
    method: 'POST', path: '/api/purchases',
    body: { supplier: 'Proveedor SL', base: 100, ivaRate: 21, accountId, date: today() }
  });
  assert.equal(created.status, 200);
  const purchaseId = created.body.createdId;
  const tx = created.body.transactions.find((t) => t.purchaseId === purchaseId);
  assert.equal(tx.amount, 121);

  // Corregir la base actualiza el movimiento asociado, sin duplicarlo.
  const patched = await request({ method: 'PATCH', path: `/api/purchases/${purchaseId}`, body: { base: 200 } });
  assert.equal(patched.status, 200);
  const txs = patched.body.transactions.filter((t) => t.purchaseId === purchaseId);
  assert.equal(txs.length, 1);
  assert.equal(txs[0].amount, 242);
});

test('las copias de seguridad conservan facturas rectificativas', async () => {
  const before = await request({ path: '/api/state' });
  const rect = before.body.invoices.find((i) => i.kind === 'rectificativa');
  assert.ok(rect);
  assert.equal(rect.total, -121);

  const made = await request({ method: 'POST', path: '/api/backups' });
  assert.equal(made.status, 200);
  assert.ok(made.body.name);

  const list = await request({ path: '/api/backups' });
  assert.equal(list.status, 200);
  assert.ok(list.body.backups.some((b) => b.name === made.body.name));

  const restored = await request({ method: 'POST', path: '/api/backups/restore', body: { name: made.body.name } });
  assert.equal(restored.status, 200);
  const kept = restored.body.invoices.find((i) => i.id === rect.id);
  assert.ok(kept);
  assert.equal(kept.kind, 'rectificativa');
  assert.equal(kept.total, -121);

  const badImport = await request({ method: 'POST', path: '/api/import', body: { data: 5 } });
  assert.equal(badImport.status, 400);
});

test('el paquete cifrado de sincronización se abre y limita el coste de PBKDF2', async () => {
  const sealed = await request({ method: 'POST', path: '/api/sync/seal', body: { passphrase: 'secreto123' } });
  assert.equal(sealed.status, 200);
  const pkg = sealed.body.package;
  assert.equal(pkg.app, 'mi-cartera');
  assert.equal(pkg.v, 1);
  assert.equal(pkg.iter, 310000);

  const opened = await request({ method: 'POST', path: '/api/sync/open', body: { passphrase: 'secreto123', package: pkg } });
  assert.equal(opened.status, 200);
  assert.ok(Array.isArray(opened.body.data.accounts));

  const wrong = await request({ method: 'POST', path: '/api/sync/open', body: { passphrase: 'otra-clave', package: pkg } });
  assert.equal(wrong.status, 400);

  // Un archivo ajeno no puede imponer millones de iteraciones y bloquear el servidor.
  const started = Date.now();
  const capped = await request({ method: 'POST', path: '/api/sync/open', body: { passphrase: 'secreto123', package: { ...pkg, iter: 500000000 } } });
  assert.equal(capped.status, 400);
  assert.ok(Date.now() - started < 10000);

  const badIv = await request({ method: 'POST', path: '/api/sync/open', body: { passphrase: 'secreto123', package: { ...pkg, iv: 'AAAA' } } });
  assert.equal(badIv.status, 400);
});

test('el PIN bloquea la API y la sesión lo desbloquea', async () => {
  const enabled = await request({ method: 'POST', path: '/api/pin', body: { newPin: '1234' } });
  assert.equal(enabled.status, 200);
  const loginCookie = cookieOf(enabled);
  assert.match(loginCookie, /^mc_session=/);
  assert.match(enabled.headers['set-cookie'][0], /HttpOnly/);
  assert.match(enabled.headers['set-cookie'][0], /SameSite=Strict/);

  const locked = await request({ path: '/api/state' });
  assert.equal(locked.status, 401);

  const wrong = await request({ method: 'POST', path: '/api/login', body: { pin: '0000' } });
  assert.equal(wrong.status, 401);

  const login = await request({ method: 'POST', path: '/api/login', body: { pin: '1234' } });
  assert.equal(login.status, 200);
  const session = cookieOf(login);
  assert.match(session, /^mc_session=/);

  const open = await request({ path: '/api/state', headers: { Cookie: session } });
  assert.equal(open.status, 200);
  assert.equal(open.body.settings.pinEnabled, true);

  const disabled = await request({ method: 'POST', path: '/api/pin', headers: { Cookie: session }, body: { newPin: '', currentPin: '1234' } });
  assert.equal(disabled.status, 200);
  const free = await request({ path: '/api/state' });
  assert.equal(free.status, 200);
  assert.equal(free.body.settings.pinEnabled, false);
});
