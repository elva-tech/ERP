import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createPayrollRun } from "../../lib/payroll-run-creation.js";
import { cleanupTenants, createTestPool, seedTenants, sha256 } from "./helpers.mjs";

// Real PostgreSQL: requires an isolated test database with all migrations applied.
let pool;
let seed;
let sequence = 0;

before(async () => {
  pool = createTestPool();
  seed = await seedTenants(pool);
});

after(async () => {
  if (pool) {
    if (seed) await cleanupTenants(pool, seed);
    await pool.end();
  }
});

const run = async (overrides = {}) => {
  const client = await pool.connect();
  try {
    return await createPayrollRun(client, {
      companyId: seed.companyA,
      userId: seed.adminA.id,
      year: 2031,
      month: 1,
      notes: null,
      idempotencyKey: "key",
      ...overrides,
    });
  } finally {
    client.release();
  }
};

const nextMonth = () => (sequence += 1);

const count = async (companyId, year, month) =>
  Number((await pool.query(
    "SELECT COUNT(*) FROM payroll_runs WHERE company_id = $1 AND pay_period_year = $2 AND pay_period_month = $3",
    [companyId, year, month],
  )).rows[0].count);

test("same key and payload replays the stored response without a second run", async () => {
  const month = nextMonth();
  const first = await run({ month, idempotencyKey: "replay-1" });
  const retry = await run({ month, idempotencyKey: "replay-1" });

  assert.equal(first.status, 201);
  assert.equal(retry.status, 201);
  assert.equal(retry.replayed, true);
  assert.equal(retry.body.run.id, first.body.run.id);
  assert.equal(await count(seed.companyA, 2031, month), 1);
});

test("the same key with a changed payload returns 409 and creates nothing", async () => {
  const month = nextMonth();
  await run({ month, idempotencyKey: "conflict-1" });
  const other = nextMonth();
  const changed = await run({ month: other, idempotencyKey: "conflict-1" });

  assert.equal(changed.status, 409);
  assert.match(changed.body.message, /different request/);
  assert.equal(await count(seed.companyA, 2031, other), 0);
});

test("ten concurrent requests with one key create exactly one run", async () => {
  const month = nextMonth();
  const results = await Promise.all(
    Array.from({ length: 10 }, () => run({ month, idempotencyKey: "concurrent-1" })),
  );

  assert.ok(results.every((result) => result.status === 201));
  assert.equal(new Set(results.map((result) => result.body.run.id)).size, 1);
  assert.equal(results.filter((result) => !result.replayed).length, 1);
  assert.equal(await count(seed.companyA, 2031, month), 1);
});

test("concurrent requests with different keys for one period yield one run and unique-violation errors", async () => {
  const month = nextMonth();
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, (_, index) => run({ month, idempotencyKey: `race-${index}` })),
  );
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assert.equal(fulfilled.length, 1);
  assert.ok(rejected.every((result) => result.reason.code === "23505"));
  assert.equal(await count(seed.companyA, 2031, month), 1);

  // The rolled-back requests must not leave idempotency claims behind.
  const claims = Number((await pool.query(
    "SELECT COUNT(*) FROM payroll_run_idempotency WHERE company_id = $1 AND key_hash = ANY($2::text[])",
    [seed.companyA, Array.from({ length: 6 }, (_, index) => sha256(`race-${index}`))],
  )).rows[0].count);
  assert.equal(claims, 1);
});

test("a failed attempt rolls back its key so a later retry can succeed", async () => {
  const month = nextMonth();
  await run({ month, idempotencyKey: "first-owner" });

  await assert.rejects(run({ month, idempotencyKey: "rolled-back" }), { code: "23505" });
  await pool.query(
    "UPDATE payroll_runs SET status = 'Cancelled' WHERE company_id = $1 AND pay_period_year = 2031 AND pay_period_month = $2",
    [seed.companyA, month],
  );

  const retry = await run({ month, idempotencyKey: "rolled-back" });
  assert.equal(retry.status, 201);
  assert.equal(retry.replayed, false);
});

test("the same key is isolated per tenant and per user", async () => {
  const month = nextMonth();
  const a = await run({ month, idempotencyKey: "shared-key" });
  const b = await run({
    companyId: seed.companyB,
    userId: seed.adminB.id,
    month,
    idempotencyKey: "shared-key",
  });
  const otherUser = await run({
    userId: seed.hrA.id,
    month: nextMonth(),
    idempotencyKey: "shared-key",
  });

  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(otherUser.status, 201);
  assert.notEqual(a.body.run.id, b.body.run.id);
  assert.equal(b.body.run.company_id, seed.companyB);
  assert.equal(await count(seed.companyB, 2031, month), 1);
});

test("requests without a key are not recorded for replay", async () => {
  const month = nextMonth();
  const result = await run({ month, idempotencyKey: null });
  assert.equal(result.status, 201);
  await assert.rejects(run({ month, idempotencyKey: null }), { code: "23505" });
});
