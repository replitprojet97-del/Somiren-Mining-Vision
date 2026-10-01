import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test, { type TestContext } from "node:test";
import { Pool, type PoolClient } from "pg";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const schemaName = () => `workspace_concurrency_${randomBytes(8).toString("hex")}`;

async function createFixture(t: TestContext) {
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for PostgreSQL concurrency tests");
  const pool = new Pool({ connectionString: testDatabaseUrl, max: 3 });
  const schema = schemaName();
  await pool.query(`CREATE SCHEMA "${schema}"`);
  const clients: PoolClient[] = [];
  t.after(async () => {
    await Promise.all(clients.map(client => client.query("ROLLBACK").catch(() => undefined)));
    clients.forEach(client => client.release());
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  });
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

async function waitUntilRowLockWaits(pool: Pool, pid: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const { rows } = await pool.query(
      "SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1",
      [pid],
    );
    if (rows[0]?.wait_event_type === "Lock") return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("The fixture transaction did not enter a row-lock wait");
}

test("locking the conversation before INSERT keeps late committed messages above the read cursor", {
  skip: !testDatabaseUrl && "Set TEST_DATABASE_URL to a disposable local PostgreSQL database",
}, async t => {
  const fixture = await createFixture(t);
  await fixture.pool.query(`CREATE TABLE "${fixture.schema}".conversations (id INTEGER PRIMARY KEY)`);
  await fixture.pool.query(`INSERT INTO "${fixture.schema}".conversations (id) VALUES (1)`);
  await fixture.pool.query(`CREATE TABLE "${fixture.schema}".messages (
    id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL, sender_id INTEGER NOT NULL
  )`);

  const firstSender = await fixture.connect();
  const secondSender = await fixture.connect();
  await firstSender.query("BEGIN");
  await firstSender.query(`SELECT id FROM "${fixture.schema}".conversations WHERE id = 1 FOR UPDATE`);
  await secondSender.query("BEGIN");
  const { rows: [secondBackend] } = await secondSender.query("SELECT pg_backend_pid() AS pid");
  let secondInsertAllowed = false;
  const secondLock = secondSender.query(
    `SELECT id FROM "${fixture.schema}".conversations WHERE id = 1 FOR UPDATE`,
  ).then(result => {
    secondInsertAllowed = true;
    return result;
  });
  await waitUntilRowLockWaits(fixture.pool, secondBackend.pid);
  assert.equal(secondInsertAllowed, false);

  const { rows: [firstMessage] } = await firstSender.query(
    `INSERT INTO "${fixture.schema}".messages (conversation_id, sender_id) VALUES (1, 10) RETURNING id`,
  );
  await firstSender.query("COMMIT");
  await secondLock;

  const { rows: [visibleHighWater] } = await fixture.pool.query(
    `SELECT max(id)::int AS id FROM "${fixture.schema}".messages WHERE conversation_id = 1`,
  );
  const lastReadMessageId = visibleHighWater.id as number;
  assert.equal(lastReadMessageId, firstMessage.id);

  await secondSender.query(
    `INSERT INTO "${fixture.schema}".messages (conversation_id, sender_id) VALUES (1, 11)`,
  );
  await secondSender.query("COMMIT");
  const { rows: [unread] } = await fixture.pool.query(
    `SELECT count(*)::int AS count FROM "${fixture.schema}".messages
     WHERE conversation_id = 1 AND id > $1`,
    [lastReadMessageId],
  );
  assert.equal(unread.count, 1);
});

test("ordered collaborator row locks read fresh permissions before adding meeting grants", {
  skip: !testDatabaseUrl && "Set TEST_DATABASE_URL to a disposable local PostgreSQL database",
}, async t => {
  const fixture = await createFixture(t);
  await fixture.pool.query(`CREATE TABLE "${fixture.schema}".collaborators (
    id INTEGER PRIMARY KEY, permissions JSONB NOT NULL
  )`);
  await fixture.pool.query(
    `INSERT INTO "${fixture.schema}".collaborators (id, permissions) VALUES
      (2, '["workspace:read"]'), (1, '["workspace:read", "legacyGrant"]')`,
  );

  const permissionsEditor = await fixture.connect();
  const meetingCreator = await fixture.connect();
  await permissionsEditor.query("BEGIN");
  await permissionsEditor.query(
    `UPDATE "${fixture.schema}".collaborators SET permissions = '["workspace:read"]' WHERE id = 1`,
  );

  await meetingCreator.query("BEGIN");
  const { rows: [meetingBackend] } = await meetingCreator.query("SELECT pg_backend_pid() AS pid");
  let participantsRead = false;
  const lockedParticipants = meetingCreator.query(
    `SELECT id, permissions FROM "${fixture.schema}".collaborators
     WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE`,
    [[2, 1]],
  ).then(result => {
    participantsRead = true;
    return result;
  });
  await waitUntilRowLockWaits(fixture.pool, meetingBackend.pid);
  assert.equal(participantsRead, false);

  await permissionsEditor.query("COMMIT");
  const { rows: participants } = await lockedParticipants;
  assert.deepEqual(participants.map(person => person.id), [1, 2]);
  const latestPermissions = participants.find(person => person.id === 1).permissions as string[];
  assert.deepEqual(latestPermissions, ["workspace:read"]);
  const merged = [...new Set([
    ...latestPermissions,
    "CAN_USE_VIDEO_CONFERENCE",
    "PARTICIPATE_IN_MEETINGS",
  ])];
  await meetingCreator.query(
    `UPDATE "${fixture.schema}".collaborators SET permissions = $1::jsonb WHERE id = 1`,
    [JSON.stringify(merged)],
  );
  await meetingCreator.query("COMMIT");

  const { rows: [updated] } = await fixture.pool.query(
    `SELECT permissions FROM "${fixture.schema}".collaborators WHERE id = 1`,
  );
  assert.deepEqual(updated.permissions, [
    "workspace:read",
    "CAN_USE_VIDEO_CONFERENCE",
    "PARTICIPATE_IN_MEETINGS",
  ]);
});