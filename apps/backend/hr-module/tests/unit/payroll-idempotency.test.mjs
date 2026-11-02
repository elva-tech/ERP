import test from "node:test";
import assert from "node:assert/strict";
import { createPayrollRun } from "../../lib/payroll-run-creation.js";

class FakeDatabase {
  idempotency = new Map();
  runs = [];
  locks = new Map();
  nextRunId = 1;

  connect() {
    return new FakeClient(this);
  }

  async acquire(key) {
    const previous = this.locks.get(key) || Promise.resolve();
    let unlock;
    const current = new Promise((resolve) => { unlock = resolve; });
    this.locks.set(key, previous.then(() => current));
    await previous;
    return () => {
      unlock();
      if (this.locks.get(key) === current) this.locks.delete(key);
    };
  }
}

class FakeClient {
  constructor(database) {
    this.database = database;
    this.pendingKey = null;
    this.pendingRun = null;
    this.unlock = null;
  }

  async query(sql, values = []) {
    const statement = sql.replace(/\s+/g, " ").trim();

    if (statement === "BEGIN") return { rowCount: null, rows: [] };
    if (statement === "ROLLBACK") {
      this.unlock?.();
      this.unlock = null;
      return { rowCount: null, rows: [] };
    }
    if (statement === "COMMIT") {
      if (this.pendingRun) this.database.runs.push(this.pendingRun);
      if (this.pendingKey) {
        this.database.idempotency.set(this.pendingKey.composite, this.pendingKey.record);
      }
      this.unlock?.();
      this.unlock = null;
      return { rowCount: null, rows: [] };
    }

    if (statement.startsWith("INSERT INTO payroll_run_idempotency")) {
      const [companyId, userId, keyHash, requestHash] = values;
      const composite = `${companyId}:${userId}:${keyHash}`;
      this.unlock = await this.database.acquire(composite);
      if (this.database.idempotency.has(composite)) {
        return { rowCount: 0, rows: [] };
      }
      this.pendingKey = {
        composite,
        record: { request_hash: requestHash, response_status: null, response_body: null },
      };
      return { rowCount: 1, rows: [{ key_hash: keyHash }] };
    }

    if (statement.startsWith("SELECT request_hash, response_status, response_body")) {
      const composite = `${values[0]}:${values[1]}:${values[2]}`;
      const record = this.pendingKey?.composite === composite
        ? this.pendingKey.record
        : this.database.idempotency.get(composite);
      return { rowCount: record ? 1 : 0, rows: record ? [record] : [] };
    }

    if (statement.startsWith("INSERT INTO payroll_runs")) {
      const [companyId, year, month, notes] = values;
      const duplicate = [...this.database.runs, ...(this.pendingRun ? [this.pendingRun] : [])]
        .some((run) => run.company_id === companyId && run.pay_period_year === year && run.pay_period_month === month && run.status !== "Cancelled");
      if (duplicate) {
        const error = new Error("duplicate payroll period");
        error.code = "23505";
        throw error;
      }
      this.pendingRun = {
        id: this.database.nextRunId++,
        company_id: companyId,
        pay_period_year: year,
        pay_period_month: month,
        status: "Draft",
        notes,
      };
      return { rowCount: 1, rows: [{ id: this.pendingRun.id }] };
    }

    if (statement.startsWith("SELECT r.id, r.company_id")) {
      const id = values[0];
      const run = this.pendingRun?.id === id
        ? this.pendingRun
        : this.database.runs.find((item) => item.id === id);
      return { rowCount: run ? 1 : 0, rows: run ? [run] : [] };
    }

    if (statement.startsWith("UPDATE payroll_run_idempotency")) {
      const [companyId, userId, keyHash, status, body] = values;
      const composite = `${companyId}:${userId}:${keyHash}`;
      const record = this.pendingKey?.composite === composite
        ? this.pendingKey.record
        : this.database.idempotency.get(composite);
      record.response_status = status;
      record.response_body = JSON.parse(body);
      return { rowCount: 1, rows: [] };
    }

    throw new Error(`Unexpected SQL in test double: ${statement}`);
  }
}

const makeRequest = (overrides = {}) => ({
  companyId: "20",
  userId: "10",
  year: 2026,
  month: 10,
  notes: null,
  idempotencyKey: "operation-key-1",
  ...overrides,
});

test("same key and payload replay the original payroll response", async () => {
  const database = new FakeDatabase();
  const first = await createPayrollRun(database.connect(), makeRequest());
  const retry = await createPayrollRun(database.connect(), makeRequest());

  assert.equal(first.status, 201);
  assert.equal(retry.status, 201);
  assert.equal(retry.replayed, true);
  assert.deepEqual(retry.body, first.body);
  assert.equal(database.runs.length, 1);
});

test("concurrent requests with the same key create only one payroll run", async () => {
  const database = new FakeDatabase();
  const [first, retry] = await Promise.all([
    createPayrollRun(database.connect(), makeRequest()),
    createPayrollRun(database.connect(), makeRequest()),
  ]);

  assert.equal(first.status, 201);
  assert.equal(retry.status, 201);
  assert.equal(first.body.run.id, retry.body.run.id);
  assert.equal(database.runs.length, 1);
});

test("rejects reuse of a key with a different request body", async () => {
  const database = new FakeDatabase();
  await createPayrollRun(database.connect(), makeRequest());
  const changedRequest = await createPayrollRun(
    database.connect(),
    makeRequest({ month: 11 }),
  );

  assert.equal(changedRequest.status, 409);
  assert.match(changedRequest.body.message, /different request/);
  assert.equal(database.runs.length, 1);
});

test("scopes the same key independently by tenant and user", async () => {
  const database = new FakeDatabase();
  await createPayrollRun(database.connect(), makeRequest());
  const otherTenant = await createPayrollRun(
    database.connect(),
    makeRequest({ companyId: "21" }),
  );
  const otherUser = await createPayrollRun(
    database.connect(),
    makeRequest({ userId: "11", month: 11 }),
  );

  assert.equal(otherTenant.status, 201);
  assert.equal(otherUser.status, 201);
  assert.equal(database.runs.length, 3);
});