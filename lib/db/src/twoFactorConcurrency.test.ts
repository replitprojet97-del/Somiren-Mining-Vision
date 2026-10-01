import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test, { type TestContext } from "node:test";
import { Pool, type PoolClient } from "pg";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const schemaName = () => `two_factor_concurrency_${randomBytes(8).toString("hex")}`;

async function createFixture(t: TestContext) {
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for PostgreSQL concurrency tests");
  const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
  const schema = schemaName();
  await pool.query(`CREATE SCHEMA "${schema}"`);
  const clients: PoolClient[] = [];
  t.after(async () => {
    await Promise.all(clients.map(client => client.query("ROLLBACK").catch(() => undefined)));
    clients.forEach(client => client.release());
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  });
  await pool.query(`CREATE TABLE "${schema}".factors (
    collaborator_id INTEGER PRIMARY KEY,
    last_accepted_step INTEGER,
    recovery_code_hashes JSONB NOT NULL
  )`);
  await pool.query(`CREATE TABLE "${schema}".challenges (
    token_hash TEXT PRIMARY KEY,
    collaborator_id INTEGER NOT NULL REFERENCES "${schema}".factors(collaborator_id)
  )`);
  await pool.query(
    `INSERT INTO "${schema}".factors (collaborator_id, last_accepted_step, recovery_code_hashes)
     VALUES (1, 100, '["fixture-recovery-hash"]'::jsonb)`,
  );
  return {
    pool,
    schema,
    connect: async () => {
      const client = await pool.connect();
      clients.push(client);
      return client;
    },
  };
}

async function acceptTotpStep(
  client: PoolClient,
  schema: string,
  challengeHash: string,
  step: number,
): Promise<boolean> {
  await client.query("BEGIN");
  const { rows: [factor] } = await client.query(
    `SELECT last_accepted_step FROM "${schema}".factors
     WHERE collaborator_id = 1 FOR UPDATE`,
  );
  const { rows: [challenge] } = await client.query(
    `SELECT token_hash FROM "${schema}".challenges
     WHERE token_hash = $1 FOR UPDATE`,
    [challengeHash],
  );
  if (!challenge || (factor.last_accepted_step !== null && step <= factor.last_accepted_step)) {
    await client.query("COMMIT");
    return false;
  }
  await client.query(
    `UPDATE "${schema}".factors SET last_accepted_step = $1 WHERE collaborator_id = 1`,
    [step],
  );
  await client.query(`DELETE FROM "${schema}".challenges WHERE token_hash = $1`, [challengeHash]);
  await client.query("COMMIT");
  return true;
}

async function consumeRecoveryCode(client: PoolClient, schema: string, challengeHash: string): Promise<boolean> {
  await client.query("BEGIN");
  const { rows: [factor] } = await client.query(
    `SELECT recovery_code_hashes FROM "${schema}".factors
     WHERE collaborator_id = 1 FOR UPDATE`,
  );
  const { rows: [challenge] } = await client.query(
    `SELECT token_hash FROM "${schema}".challenges
     WHERE token_hash = $1 FOR UPDATE`,
    [challengeHash],
  );
  const hashes = factor.recovery_code_hashes as string[];
  if (!challenge || !hashes.includes("fixture-recovery-hash")) {
    await client.query("COMMIT");
    return false;
  }
  await client.query(
    `UPDATE "${schema}".factors SET recovery_code_hashes = $1::jsonb WHERE collaborator_id = 1`,
    [JSON.stringify(hashes.filter(hash => hash !== "fixture-recovery-hash"))],
  );
  await client.query(`DELETE FROM "${schema}".challenges WHERE token_hash = $1`, [challengeHash]);
  await client.query("COMMIT");
  return true;
}

test("parallel login challenges cannot accept one TOTP step twice", {
  skip: !testDatabaseUrl && "Set TEST_DATABASE_URL to a disposable local PostgreSQL database",
}, async t => {
  const fixture = await createFixture(t);
  await fixture.pool.query(
    `INSERT INTO "${fixture.schema}".challenges (token_hash, collaborator_id) VALUES ('challenge-a', 1), ('challenge-b', 1)`,
  );
  const first = await fixture.connect();
  const second = await fixture.connect();
  const accepted = await Promise.all([
    acceptTotpStep(first, fixture.schema, "challenge-a", 101),
    acceptTotpStep(second, fixture.schema, "challenge-b", 101),
  ]);
  assert.deepEqual(accepted.sort(), [false, true]);
  const { rows: [factor] } = await fixture.pool.query(
    `SELECT last_accepted_step FROM "${fixture.schema}".factors WHERE collaborator_id = 1`,
  );
  assert.equal(factor.last_accepted_step, 101);
});

test("parallel challenges can consume a recovery-code hash only once", {
  skip: !testDatabaseUrl && "Set TEST_DATABASE_URL to a disposable local PostgreSQL database",
}, async t => {
  const fixture = await createFixture(t);
  await fixture.pool.query(
    `INSERT INTO "${fixture.schema}".challenges (token_hash, collaborator_id) VALUES ('challenge-a', 1), ('challenge-b', 1)`,
  );
  const first = await fixture.connect();
  const second = await fixture.connect();
  const accepted = await Promise.all([
    consumeRecoveryCode(first, fixture.schema, "challenge-a"),
    consumeRecoveryCode(second, fixture.schema, "challenge-b"),
  ]);
  assert.deepEqual(accepted.sort(), [false, true]);
  const { rows: [factor] } = await fixture.pool.query(
    `SELECT recovery_code_hashes FROM "${fixture.schema}".factors WHERE collaborator_id = 1`,
  );
  assert.deepEqual(factor.recovery_code_hashes, []);
});