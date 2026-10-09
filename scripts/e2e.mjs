#!/usr/bin/env node
/**
 * End-to-end integration test for the hotel management system.
 *
 * WHAT THIS DOES
 *   Drives the six cross-service workflows (reservation → confirmation →
 *   invoice → payment → check-in/out → housekeeping → finance) plus the RBAC
 *   matrix against a RUNNING backend, and reports PASS/FAIL per step.
 *
 * IT WRITES REAL DATA. This is not a read-only check. It creates a customer
 * reservation, an invoice, payments, a refund, inventory items, and maintenance
 * and housekeeping tasks in whatever database the backend is pointed at. Run it
 * against a development project, never production. There is no cleanup pass —
 * the rows it creates stay.
 *
 * CONFIGURATION
 *   Credentials are read from the environment so this script never holds them:
 *
 *     export E2E_CUSTOMER_EMAIL=...      E2E_CUSTOMER_PASSWORD=...
 *     export E2E_RECEPTIONIST_EMAIL=...  E2E_RECEPTIONIST_PASSWORD=...
 *     export E2E_HOUSEKEEPING_EMAIL=...  E2E_HOUSEKEEPING_PASSWORD=...
 *     export E2E_MAINTENANCE_EMAIL=...   E2E_MAINTENANCE_PASSWORD=...
 *     export E2E_ACCOUNTANT_EMAIL=...    E2E_ACCOUNTANT_PASSWORD=...
 *     export E2E_ADMIN_EMAIL=...         E2E_ADMIN_PASSWORD=...
 *     export E2E_MANAGER_EMAIL=...       E2E_MANAGER_PASSWORD=...
 *
 *   Optional:
 *     E2E_API_URL            default http://localhost:8080/api
 *     E2E_FIREBASE_API_KEY   default read from hotel-frontend/.env
 *     E2E_FLOWS              comma list to run only some, e.g. "rbac,payment"
 *
 * USAGE
 *   node scripts/e2e.mjs
 *   E2E_FLOWS=rbac node scripts/e2e.mjs
 *
 * STATUS
 *   Written without a live authenticated session, so it has never been
 *   executed end to end. Expect to fix a field name or two on the first run —
 *   every assertion prints what it actually received so that is quick.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Config ──────────────────────────────────────────────────────────────────

function firebaseKeyFromEnvFile() {
  if (process.env.E2E_FIREBASE_API_KEY) return process.env.E2E_FIREBASE_API_KEY;
  try {
    const env = readFileSync(join(ROOT, 'hotel-frontend', '.env'), 'utf8');
    const m = env.match(/^VITE_FIREBASE_API_KEY=(.+)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

const API = (process.env.E2E_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const FIREBASE_KEY = firebaseKeyFromEnvFile();
const ONLY = (process.env.E2E_FLOWS || '').split(',').map((s) => s.trim()).filter(Boolean);

const ROLES = ['CUSTOMER', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT', 'ADMIN', 'MANAGER'];

// ── Harness ─────────────────────────────────────────────────────────────────

const results = [];
const tokens = {};
let currentFlow = '';

const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

/**
 * Thrown when a flow cannot run because credentials are missing. Kept distinct
 * from a failure so a missing token never masquerades as a security finding —
 * an earlier version reported "PROTECTION FAILED" when it had simply not
 * authenticated.
 */
class Skip extends Error {}

/**
 * Skips a step whose prerequisite never happened — e.g. asserting on a
 * reservation that was never created because credentials were missing.
 * Without this the run reports cascading false failures.
 */
function prereq(condition, why) {
  if (!condition) throw new Skip(why);
}

/** The token for a role, or a Skip that the step reports as skipped. */
function token(role) {
  const t = tokens[role];
  if (!t) throw new Skip(`no ${role} credentials`);
  return t;
}

/** Records one assertion. `fn` throws to fail, or throws Skip to skip. */
async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ flow: currentFlow, name, ok: true, detail });
    console.log(`  ${c.green}✓${c.reset} ${name}${detail ? ` ${c.dim}— ${detail}${c.reset}` : ''}`);
  } catch (err) {
    if (err instanceof Skip) {
      results.push({ flow: currentFlow, name, ok: true, detail: `skipped — ${err.message}` });
      console.log(`  ${c.yellow}•${c.reset} ${name} ${c.dim}— skipped (${err.message})${c.reset}`);
      return;
    }
    results.push({ flow: currentFlow, name, ok: false, detail: err.message });
    console.log(`  ${c.red}✗ ${name}${c.reset}`);
    console.log(`      ${c.red}${err.message}${c.reset}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }
  return { status: res.status, body: parsed };
}

/** Signs in over Firebase's REST API — no Admin SDK, no service account. */
async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Firebase sign-in failed for ${email}: ${body?.error?.message || res.status}`);
  }
  return body.idToken;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Shared state between flows — flow 2 continues the reservation flow 1 made. */
const ctx = {};

// ── Flows ───────────────────────────────────────────────────────────────────

async function flowReservation() {
  currentFlow = '1. Reservation flow';
  console.log(`\n${c.cyan}${currentFlow}${c.reset}`);

  await step('customer creates a reservation → PENDING', async () => {
    const r = await api('POST', '/reservations', {
      token: token('CUSTOMER'),
      body: {
        roomId: ctx.roomId,
        checkInDate: ctx.checkIn,
        checkOutDate: ctx.checkOut,
        numberOfGuests: 1,
      },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert(r.body?.reservationId, `no reservationId in response: ${JSON.stringify(r.body)}`);
    ctx.reservationId = r.body.reservationId;
    ctx.reservationStatus = r.body.status;
    return `id=${r.body.reservationId} status=${r.body.status}`;
  });

  await step('new reservation starts PENDING', async () => {
    prereq(ctx.reservationStatus, 'no reservation was created');
    assert(ctx.reservationStatus === 'PENDING', `expected PENDING, got ${ctx.reservationStatus}`);
    return ctx.reservationStatus;
  });

  await step('receptionist confirms → CONFIRMED', async () => {
    const r = await api('PATCH', `/reservations/${ctx.reservationId}/confirm`, { token: token('RECEPTIONIST') });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    const after = await api('GET', `/reservations/${ctx.reservationId}`, { token: token('RECEPTIONIST') });
    assert(after.body?.status === 'CONFIRMED', `expected CONFIRMED, got ${after.body?.status}`);
    return after.body.status;
  });

  await step('invoice exists for the reservation', async () => {
    const r = await api('GET', `/invoices/reservation/${ctx.reservationId}`, { token: token('RECEPTIONIST') });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    const invoice = Array.isArray(r.body) ? r.body[0] : r.body;
    assert(invoice?.invoiceId, `no invoiceId: ${JSON.stringify(r.body)}`);
    ctx.invoiceId = invoice.invoiceId;
    ctx.invoiceTotal = invoice.totalAmount;
    return `invoice=${invoice.invoiceId} total=${invoice.totalAmount}`;
  });
}

async function flowCheckInOut() {
  currentFlow = '2. Check-in / check-out flow';
  console.log(`\n${c.cyan}${currentFlow}${c.reset}`);
  prereq(ctx.reservationId, 'no reservation from the previous flow');

  await step('check-in → reservation CHECKED_IN', async () => {
    const r = await api('PATCH', `/reservations/${ctx.reservationId}/check-in`, { token: token('RECEPTIONIST') });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    return `status ${r.body?.status}`;
  });

  await step('room becomes OCCUPIED', async () => {
    const r = await api('GET', `/rooms/${ctx.roomId}`, { token: token('RECEPTIONIST') });
    assert(r.body?.status === 'OCCUPIED', `expected OCCUPIED, got ${r.body?.status}`);
    return r.body.status;
  });

  await step('check-out → reservation CHECKED_OUT', async () => {
    const r = await api('PATCH', `/reservations/${ctx.reservationId}/check-out`, { token: token('RECEPTIONIST') });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    return `status ${r.body?.status}`;
  });

  await step('room becomes CLEANING', async () => {
    const r = await api('GET', `/rooms/${ctx.roomId}`, { token: token('RECEPTIONIST') });
    assert(r.body?.status === 'CLEANING', `expected CLEANING, got ${r.body?.status}`);
    return r.body.status;
  });

  await step('a checkout cleaning task was generated', async () => {
    const r = await api('GET', '/housekeeping/tasks', { token: token('HOUSEKEEPING') });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    const tasks = Array.isArray(r.body) ? r.body : (r.body?.content ?? []);
    const task = tasks.find(
      (t) => t.roomId === ctx.roomId && t.status !== 'COMPLETED' && t.status !== 'CANCELLED',
    );
    assert(task, `no open housekeeping task for room ${ctx.roomId}; got ${tasks.length} tasks`);
    ctx.cleaningTaskId = task.taskId;
    return `task=${task.taskId} type=${task.taskType}`;
  });

  // The protection case: the room is pulled into MAINTENANCE while the checkout
  // cleaning is still open. Completing the cleaning must not hand back a room
  // that is out of service.
  await step('room forced to MAINTENANCE mid-cleaning', async () => {
    const r = await api('PATCH', `/rooms/${ctx.roomId}/status`, {
      token: token('ADMIN'),
      body: { status: 'MAINTENANCE' },
    });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    return 'MAINTENANCE';
  });

  await step('completing cleaning does NOT release a MAINTENANCE room', async () => {
    if (ctx.cleaningTaskId) {
      await api('PATCH', `/housekeeping/tasks/${ctx.cleaningTaskId}/assign`, {
        token: token('ADMIN'),
        body: { staffUid: ctx.housekeepingUid },
      });
      await api('PATCH', `/housekeeping/tasks/${ctx.cleaningTaskId}/start`, { token: token('HOUSEKEEPING') });
      await api('PATCH', `/housekeeping/tasks/${ctx.cleaningTaskId}/complete`, { token: token('HOUSEKEEPING') });
    }
    const r = await api('GET', `/rooms/${ctx.roomId}`, { token: token('ADMIN') });
    assert(
      r.body?.status === 'MAINTENANCE',
      `PROTECTION FAILED: room is ${r.body?.status}, expected it to stay MAINTENANCE`,
    );
    return 'still MAINTENANCE — protected';
  });

  await step('room returned to AVAILABLE', async () => {
    const r = await api('PATCH', `/rooms/${ctx.roomId}/status`, {
      token: token('ADMIN'),
      body: { status: 'AVAILABLE' },
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    const after = await api('GET', `/rooms/${ctx.roomId}`, { token: token('ADMIN') });
    assert(after.body?.status === 'AVAILABLE', `expected AVAILABLE, got ${after.body?.status}`);
    return after.body.status;
  });
}

async function flowPayment() {
  currentFlow = '3. Payment flow';
  console.log(`\n${c.cyan}${currentFlow}${c.reset}`);

  const total = Number(ctx.invoiceTotal || 0);
  prereq(ctx.invoiceId, 'no invoice from the reservation flow');
  assert(total > 0, `invoice total is ${ctx.invoiceTotal}; cannot split a payment`);

  const first = Math.round(total * 50) / 100;

  await step('partial payment → invoice PARTIALLY_PAID', async () => {
    const r = await api('POST', '/payments', {
      token: token('CUSTOMER'),
      body: { invoiceId: ctx.invoiceId, reservationId: ctx.reservationId, amount: first, paymentMethod: 'CARD' },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
    ctx.firstPaymentId = r.body?.paymentId;
    assert(ctx.firstPaymentId, `no paymentId: ${JSON.stringify(r.body)}`);

    const inv = await api('GET', `/invoices/${ctx.invoiceId}`, { token: token('RECEPTIONIST') });
    assert(
      inv.body?.status === 'PARTIALLY_PAID',
      `expected PARTIALLY_PAID after ${first} of ${total}, got ${inv.body?.status}`,
    );
    return `${first} → ${inv.body.status}`;
  });

  await step('remaining payment → invoice PAID', async () => {
    const r = await api('POST', '/payments', {
      token: token('CUSTOMER'),
      body: {
        invoiceId: ctx.invoiceId,
        reservationId: ctx.reservationId,
        amount: Math.round((total - first) * 100) / 100,
        paymentMethod: 'CASH',
      },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);

    const inv = await api('GET', `/invoices/${ctx.invoiceId}`, { token: token('RECEPTIONIST') });
    assert(inv.body?.status === 'PAID', `expected PAID, got ${inv.body?.status}`);
    return inv.body.status;
  });

  await step('one income transaction per payment — no duplicates', async () => {
    const r = await api('GET', '/finance/transactions', { token: token('ACCOUNTANT') });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    const txs = Array.isArray(r.body) ? r.body : (r.body?.content ?? []);
    const mine = txs.filter((t) => t.referenceId === ctx.firstPaymentId || t.referenceId === ctx.invoiceId);
    const incomes = mine.filter((t) => t.type === 'INCOME');
    assert(
      incomes.length <= 2,
      `expected at most one INCOME per payment (2 payments), found ${incomes.length}`,
    );
    return `${incomes.length} income tx(s) for 2 payments`;
  });

  await step('refund → payment REFUNDED and invoice recalculated', async () => {
    const r = await api('PATCH', `/payments/${ctx.firstPaymentId}/refund`, { token: token('ACCOUNTANT') });
    assert(r.status === 200, `expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);

    const pay = await api('GET', `/payments/${ctx.firstPaymentId}`, { token: token('ACCOUNTANT') });
    assert(pay.body?.status === 'REFUNDED', `expected REFUNDED, got ${pay.body?.status}`);

    const inv = await api('GET', `/invoices/${ctx.invoiceId}`, { token: token('ACCOUNTANT') });
    assert(
      inv.body?.status !== 'PAID',
      `invoice still PAID after refunding ${first} of ${total} — recalculation did not happen`,
    );
    return `payment REFUNDED, invoice now ${inv.body?.status}`;
  });

  await step('refund produced no duplicate finance row', async () => {
    const r = await api('GET', '/finance/transactions', { token: token('ACCOUNTANT') });
    const txs = Array.isArray(r.body) ? r.body : (r.body?.content ?? []);
    const refunds = txs.filter(
      (t) => t.referenceId === ctx.firstPaymentId && t.referenceType === 'PAYMENT_REFUND',
    );
    assert(refunds.length <= 1, `expected at most 1 refund transaction, found ${refunds.length}`);
    return `${refunds.length} refund tx`;
  });
}

async function flowInventory() {
  currentFlow = '4. Inventory flow';
  console.log(`\n${c.cyan}${currentFlow}${c.reset}`);

  await step('item created at zero stock', async () => {
    const r = await api('POST', '/inventory/items', {
      token: token('ADMIN'),
      body: {
        itemName: `E2E Towels ${Date.now()}`,
        category: 'LINEN',
        unit: 'PIECE',
        minimumStock: 5,
        unitCost: 4.5,
      },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
    ctx.itemId = r.body?.itemId;
    assert(ctx.itemId, `no itemId: ${JSON.stringify(r.body)}`);
    return `item=${ctx.itemId} qty=${r.body?.quantity}`;
  });

  await step('STOCK_IN increases quantity', async () => {
    const r = await api('POST', '/inventory/stock-in', {
      token: token('ADMIN'),
      body: { itemId: ctx.itemId, quantity: 20, unitCost: 4.5, reference: 'E2E' },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
    const item = await api('GET', `/inventory/items/${ctx.itemId}`, { token: token('ADMIN') });
    assert(Number(item.body?.quantity) === 20, `expected 20, got ${item.body?.quantity}`);
    return `qty ${item.body.quantity}`;
  });

  await step('STOCK_IN booked an INVENTORY expense', async () => {
    const r = await api('GET', '/finance/transactions', { token: token('ACCOUNTANT') });
    const txs = Array.isArray(r.body) ? r.body : (r.body?.content ?? []);
    const hit = txs.filter((t) => t.category === 'INVENTORY' && t.type === 'EXPENSE');
    assert(hit.length >= 1, 'no INVENTORY expense transaction found after stock-in');
    ctx.inventoryTxCount = hit.length;
    return `${hit.length} inventory expense tx`;
  });

  await step('STOCK_OUT decreases quantity', async () => {
    const r = await api('POST', '/inventory/stock-out', {
      token: token('ADMIN'),
      body: { itemId: ctx.itemId, quantity: 5, reference: 'E2E' },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
    const item = await api('GET', `/inventory/items/${ctx.itemId}`, { token: token('ADMIN') });
    assert(Number(item.body?.quantity) === 15, `expected 15, got ${item.body?.quantity}`);
    return `qty ${item.body.quantity}`;
  });

  await step('STOCK_OUT created no finance expense', async () => {
    const r = await api('GET', '/finance/transactions', { token: token('ACCOUNTANT') });
    const txs = Array.isArray(r.body) ? r.body : (r.body?.content ?? []);
    const hit = txs.filter((t) => t.category === 'INVENTORY' && t.type === 'EXPENSE');
    assert(
      hit.length === ctx.inventoryTxCount,
      `expected still ${ctx.inventoryTxCount} inventory expenses, now ${hit.length} — stock-out should not cost money`,
    );
    return 'unchanged';
  });

  await step('ADJUSTMENT corrects quantity', async () => {
    const r = await api('POST', '/inventory/adjustment', {
      token: token('ADMIN'),
      body: { itemId: ctx.itemId, newQuantity: 12, reason: 'E2E count correction' },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
    const item = await api('GET', `/inventory/items/${ctx.itemId}`, { token: token('ADMIN') });
    assert(Number(item.body?.quantity) === 12, `expected 12, got ${item.body?.quantity}`);
    return `qty ${item.body.quantity}`;
  });

  await step('ADJUSTMENT created no finance expense', async () => {
    const r = await api('GET', '/finance/transactions', { token: token('ACCOUNTANT') });
    const txs = Array.isArray(r.body) ? r.body : (r.body?.content ?? []);
    const hit = txs.filter((t) => t.category === 'INVENTORY' && t.type === 'EXPENSE');
    assert(hit.length === ctx.inventoryTxCount, `expected ${ctx.inventoryTxCount}, now ${hit.length}`);
    return 'unchanged';
  });
}

async function flowMaintenance() {
  currentFlow = '5. Maintenance flow';
  console.log(`\n${c.cyan}${currentFlow}${c.reset}`);

  async function countMaintenanceExpenses() {
    const r = await api('GET', '/finance/transactions', { token: token('ACCOUNTANT') });
    const txs = Array.isArray(r.body) ? r.body : (r.body?.content ?? []);
    return txs.filter((t) => t.category === 'MAINTENANCE' && t.type === 'EXPENSE');
  }

  await step('issue created → PENDING', async () => {
    const r = await api('POST', '/maintenance/tasks', {
      token: token('RECEPTIONIST'),
      body: {
        roomId: ctx.roomId,
        issueType: 'PLUMBING',
        priority: 'MEDIUM',
        description: 'E2E: dripping tap',
      },
    });
    assert(r.status === 200 || r.status === 201, `expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
    ctx.maintTaskId = r.body?.taskId;
    assert(ctx.maintTaskId, `no taskId: ${JSON.stringify(r.body)}`);
    return `task=${ctx.maintTaskId}`;
  });

  await step('assigned → IN_PROGRESS → COMPLETED with cost', async () => {
    const a = await api('PATCH', `/maintenance/tasks/${ctx.maintTaskId}/assign`, {
      token: token('RECEPTIONIST'),
      body: { staffUid: ctx.maintenanceUid },
    });
    assert(a.status === 200, `assign failed: ${a.status} ${JSON.stringify(a.body)}`);

    const s = await api('PATCH', `/maintenance/tasks/${ctx.maintTaskId}/start`, { token: token('MAINTENANCE') });
    assert(s.status === 200, `start failed: ${s.status} ${JSON.stringify(s.body)}`);

    const done = await api('PATCH', `/maintenance/tasks/${ctx.maintTaskId}/complete`, {
      token: token('MAINTENANCE'),
      body: { actualCost: 125.5, completionNotes: 'E2E: replaced washer' },
    });
    assert(done.status === 200, `complete failed: ${done.status} ${JSON.stringify(done.body)}`);
    return `cost 125.50`;
  });

  await step('actualCost > 0 produced a MAINTENANCE expense', async () => {
    const hits = await countMaintenanceExpenses();
    assert(hits.length >= 1, 'no MAINTENANCE expense recorded for a task costing 125.50');
    const mine = hits.filter((t) => t.referenceId === ctx.maintTaskId);
    assert(mine.length === 1, `expected exactly 1 expense for this task, found ${mine.length}`);
    return `1 expense, amount ${mine[0].amount}`;
  });

  await step('zero-cost task produces no expense', async () => {
    const create = await api('POST', '/maintenance/tasks', {
      token: token('RECEPTIONIST'),
      body: {
        roomId: ctx.roomId,
        issueType: 'FURNITURE',
        priority: 'LOW',
        description: 'E2E: zero-cost check',
      },
    });
    assert(create.status === 200 || create.status === 201, `create failed: ${create.status}`);
    const id = create.body.taskId;

    await api('PATCH', `/maintenance/tasks/${id}/assign`, {
      token: token('RECEPTIONIST'),
      body: { staffUid: ctx.maintenanceUid },
    });
    await api('PATCH', `/maintenance/tasks/${id}/start`, { token: token('MAINTENANCE') });
    const done = await api('PATCH', `/maintenance/tasks/${id}/complete`, {
      token: token('MAINTENANCE'),
      body: { actualCost: 0, completionNotes: 'E2E: no cost' },
    });
    assert(done.status === 200, `complete failed: ${done.status} ${JSON.stringify(done.body)}`);

    const hits = await countMaintenanceExpenses();
    const mine = hits.filter((t) => t.referenceId === id);
    assert(mine.length === 0, `a zero-cost task booked ${mine.length} expense(s) — it should book none`);
    return 'no expense, correct';
  });
}

async function flowHousekeeping() {
  currentFlow = '6. Housekeeping flow';
  console.log(`\n${c.cyan}${currentFlow}${c.reset}`);

  await step('task created → assign → start → complete', async () => {
    const create = await api('POST', '/housekeeping/tasks', {
      token: token('ADMIN'),
      body: { roomId: ctx.roomId, taskType: 'REGULAR_CLEANING', priority: 'MEDIUM', notes: 'E2E task' },
    });
    assert(create.status === 200 || create.status === 201, `create failed: ${create.status} ${JSON.stringify(create.body)}`);
    const id = create.body.taskId;

    const assign = await api('PATCH', `/housekeeping/tasks/${id}/assign`, {
      token: token('ADMIN'),
      body: { staffUid: ctx.housekeepingUid },
    });
    assert(assign.status === 200, `assign failed: ${assign.status} ${JSON.stringify(assign.body)}`);

    const start = await api('PATCH', `/housekeeping/tasks/${id}/start`, { token: token('HOUSEKEEPING') });
    assert(start.status === 200, `start failed: ${start.status} ${JSON.stringify(start.body)}`);

    const done = await api('PATCH', `/housekeeping/tasks/${id}/complete`, { token: token('HOUSEKEEPING') });
    assert(done.status === 200, `complete failed: ${done.status} ${JSON.stringify(done.body)}`);

    const after = await api('GET', `/housekeeping/tasks/${id}`, { token: token('HOUSEKEEPING') });
    assert(after.body?.status === 'COMPLETED', `expected COMPLETED, got ${after.body?.status}`);
    return `task=${id} → COMPLETED`;
  });
}

async function flowRbac() {
  currentFlow = '7. Role security matrix';
  console.log(`\n${c.cyan}${currentFlow}${c.reset}`);

  // Each entry: [role, method, path, body, label]. Expected: 403 for every one.
  const denied = [
    ['CUSTOMER', 'GET', '/users', null, 'CUSTOMER → user list (admin)'],
    ['CUSTOMER', 'GET', '/finance/transactions', null, 'CUSTOMER → finance'],
    ['CUSTOMER', 'GET', '/inventory/items', null, 'CUSTOMER → inventory'],
    ['CUSTOMER', 'GET', '/staff', null, 'CUSTOMER → staff list'],
    ['CUSTOMER', 'GET', '/housekeeping/tasks', null, 'CUSTOMER → housekeeping queue'],
    ['CUSTOMER', 'POST', '/rooms', { roomNumber: 'X', roomType: 'STANDARD', floor: 1, pricePerNight: 1 }, 'CUSTOMER → create room'],

    ['HOUSEKEEPING', 'GET', '/finance/transactions', null, 'HOUSEKEEPING → finance'],
    ['HOUSEKEEPING', 'GET', '/invoices', null, 'HOUSEKEEPING → invoices'],
    ['HOUSEKEEPING', 'GET', '/users', null, 'HOUSEKEEPING → user list'],

    ['ACCOUNTANT', 'POST', '/rooms', { roomNumber: 'X', roomType: 'STANDARD', floor: 1, pricePerNight: 1 }, 'ACCOUNTANT → create room'],
    ['ACCOUNTANT', 'PUT', `/rooms/${ctx.roomId}`, { roomNumber: 'X' }, 'ACCOUNTANT → edit room'],
    ['ACCOUNTANT', 'PATCH', `/rooms/${ctx.roomId}/status`, { status: 'AVAILABLE' }, 'ACCOUNTANT → change room status'],
    ['ACCOUNTANT', 'GET', '/users', null, 'ACCOUNTANT → user list'],

    ['RECEPTIONIST', 'GET', '/users', null, 'RECEPTIONIST → user list'],
    ['RECEPTIONIST', 'POST', '/users', {}, 'RECEPTIONIST → create user'],
    ['RECEPTIONIST', 'GET', '/reports/revenue', null, 'RECEPTIONIST → revenue report'],

    ['MANAGER', 'PATCH', `/users/${ctx.customerUid}/role`, { role: 'ADMIN' }, 'MANAGER → role change (admin-only)'],
    ['MANAGER', 'GET', '/admin/users', null, 'MANAGER → /api/admin/**'],
  ];

  for (const [role, method, path, body, label] of denied) {
    await step(label, async () => {
      const token = tokens[role];
      if (!token) return `skipped — no ${role} credentials`;
      const r = await api(method, path, { token, body: body ?? undefined });
      assert(
        r.status === 403,
        `expected 403, got ${r.status}${r.status === 200 ? ' — AUTHORIZATION GAP' : `: ${JSON.stringify(r.body).slice(0, 120)}`}`,
      );
      return '403';
    });
  }

  // Unauthenticated access to the endpoints that must stay private.
  for (const [method, path, label] of [
    ['GET', '/users', 'anonymous → user list'],
    ['GET', '/finance/transactions', 'anonymous → finance'],
    ['GET', '/invoices', 'anonymous → invoices'],
    ['GET', '/staff', 'anonymous → staff'],
  ]) {
    await step(label, async () => {
      const r = await api(method, path);
      assert(r.status === 401 || r.status === 403, `expected 401/403, got ${r.status}`);
      return String(r.status);
    });
  }

  // And the endpoints that must stay public.
  for (const [method, path, label] of [
    ['GET', '/rooms', 'anonymous → public room list (must be 200)'],
    ['GET', `/rooms/${ctx.roomId}`, 'anonymous → public room detail (must be 200)'],
  ]) {
    await step(label, async () => {
      const r = await api(method, path);
      assert(r.status === 200, `expected 200 for a public endpoint, got ${r.status}`);
      return '200';
    });
  }
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.yellow}⚠  This writes real data — reservation, invoice, payments, refund,`);
  console.log(`   inventory items and tasks — to the database behind ${API}.`);
  console.log(`   Point it at a development project. There is no cleanup pass.${c.reset}`);

  if (!FIREBASE_KEY) {
    console.error(`\n${c.red}No Firebase API key. Set E2E_FIREBASE_API_KEY or provide hotel-frontend/.env.${c.reset}`);
    process.exit(2);
  }

  // Preflight the backend, so an unreachable API reports as that rather than as
  // a wall of failed assertions that look like application bugs.
  try {
    const probe = await fetch(`${API}/rooms`, { signal: AbortSignal.timeout(10_000) });
    if (probe.status >= 500) {
      console.error(`\n${c.red}${API} answered ${probe.status}. The backend is up but unhealthy.${c.reset}`);
      process.exit(2);
    }
  } catch (err) {
    console.error(
      `\n${c.red}Cannot reach ${API} (${err.message}).${c.reset}\n` +
      `Start the backend first:  cd backend; .\\mvnw.cmd spring-boot:run`,
    );
    process.exit(2);
  }

  console.log(`\n${c.dim}Signing in…${c.reset}`);
  for (const role of ROLES) {
    const email = process.env[`E2E_${role}_EMAIL`];
    const password = process.env[`E2E_${role}_PASSWORD`];
    if (!email || !password) {
      console.log(`  ${c.yellow}•${c.reset} ${role}: no credentials — flows needing it will be skipped`);
      continue;
    }
    try {
      tokens[role] = await signIn(email, password);
      console.log(`  ${c.green}•${c.reset} ${role}`);
    } catch (err) {
      console.log(`  ${c.red}•${c.reset} ${role}: ${err.message}`);
    }
  }

  for (const role of ROLES) {
    try {
      const r = await api('GET', '/users/me', { token: tokens[role] });
      if (r.status === 200) {
        if (role === 'CUSTOMER') ctx.customerUid = r.body?.uid;
        if (role === 'HOUSEKEEPING') ctx.housekeepingUid = r.body?.uid;
        if (role === 'MAINTENANCE') ctx.maintenanceUid = r.body?.uid;
      }
    } catch { /* identity lookup is best-effort */ }
  }

  // A room to run the flows against. Room listing is public, so this needs no
  // token — and explicitly passing none keeps it working before credentials
  // are configured, so the run still reaches the flows and reports skips.
  const rooms = await api('GET', '/rooms');
  const list = Array.isArray(rooms.body) ? rooms.body : [];
  const room = list.find((r) => r.status === 'AVAILABLE') ?? list[0];
  if (!room) {
    console.error(`\n${c.red}No rooms found. Seed at least one room before running this.${c.reset}`);
    process.exit(2);
  }
  ctx.roomId = room.roomId;
  ctx.checkIn = daysFromNow(30);
  ctx.checkOut = daysFromNow(32);
  console.log(`\n${c.dim}Using room ${room.roomNumber} (${room.roomId}) for ${ctx.checkIn} → ${ctx.checkOut}${c.reset}`);

  const flows = [
    ['reservation', flowReservation],
    ['checkin', flowCheckInOut],
    ['payment', flowPayment],
    ['inventory', flowInventory],
    ['maintenance', flowMaintenance],
    ['housekeeping', flowHousekeeping],
    ['rbac', flowRbac],
  ];

  for (const [key, fn] of flows) {
    if (ONLY.length && !ONLY.includes(key)) continue;
    try {
      await fn();
    } catch (err) {
      if (err instanceof Skip) {
        console.log(`  ${c.yellow}•${c.reset} flow skipped — ${err.message}`);
        results.push({ flow: currentFlow, name: 'flow skipped', ok: true, detail: `skipped — ${err.message}` });
      } else {
        console.log(`  ${c.red}flow aborted: ${err.message}${c.reset}`);
        results.push({ flow: currentFlow, name: 'flow aborted', ok: false, detail: err.message });
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.ok && String(r.detail).startsWith('skipped'));

  console.log(`\n${'─'.repeat(64)}`);
  console.log(
    `${results.length - failed.length - skipped.length} passed, ` +
    `${failed.length} failed, ${skipped.length} skipped`,
  );
  if (failed.length) {
    console.log(`\n${c.red}Failures:${c.reset}`);
    for (const f of failed) console.log(`  ${f.flow} — ${f.name}\n    ${f.detail}`);
  }
  console.log('');
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${c.red}Unexpected failure: ${err.stack}${c.reset}`);
  process.exit(2);
});
