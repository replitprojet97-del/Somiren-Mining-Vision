import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./index.js";

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE shipment_type AS ENUM ('parcel', 'mineral');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE shipment_status AS ENUM (
          'pending', 'collected', 'in_transit', 'customs',
          'out_for_delivery', 'delivered', 'exception'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        tracking_code TEXT NOT NULL UNIQUE,
        type shipment_type NOT NULL DEFAULT 'parcel',
        status shipment_status NOT NULL DEFAULT 'pending',
        sender_name TEXT NOT NULL,
        sender_city TEXT NOT NULL,
        sender_country TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        recipient_city TEXT NOT NULL,
        recipient_country TEXT NOT NULL,
        description TEXT NOT NULL,
        weight TEXT,
        dimensions TEXT,
        estimated_delivery TEXT,
        reference_number TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tracking_events (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
        status shipment_status NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_completed BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS collaborators (
        id SERIAL PRIMARY KEY,
        clerk_user_id TEXT UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE collaborators ALTER COLUMN clerk_user_id DROP NOT NULL;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS collaborator_sessions (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_cases (
        id SERIAL PRIMARY KEY,
        reference TEXT NOT NULL DEFAULT 'DEMO',
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        instructions TEXT,
        due_date TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'active',
        priority TEXT NOT NULL DEFAULT 'normal',
        progress INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        assignee_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_tasks (
        id SERIAL PRIMARY KEY,
        case_id INTEGER REFERENCES workspace_cases(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        comment TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'normal',
        due_at TIMESTAMPTZ,
        assignee_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_documents (
        id SERIAL PRIMARY KEY,
        case_id INTEGER REFERENCES workspace_cases(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content_type TEXT,
        object_path TEXT,
        uploaded_by_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_notifications (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_activity_logs (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_video_authorizations (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        meeting_title TEXT NOT NULL,
        meeting_url TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const allowedEmail = process.env.NURIA_EMAIL?.trim().toLowerCase();
    if (allowedEmail) {
      await client.query(
        `INSERT INTO collaborators (clerk_user_id, email, full_name, role, permissions)
         VALUES (NULL, $1, $2, $3, $4::jsonb)
         ON CONFLICT (email) DO NOTHING`,
        [
          allowedEmail,
          "Nuria Molero Rodriguez",
          "Assistante Exécutive & Conseillère Stratégique",
          JSON.stringify(["workspace:read", "workspace:write"]),
        ],
      );
      const initialPassword = process.env.NURIA_INITIAL_PASSWORD;
      if (initialPassword) {
        if (initialPassword.length < 12) {
          throw new Error("NURIA_INITIAL_PASSWORD must contain at least 12 characters");
        }
        const passwordHash = await hashPassword(initialPassword);
        await client.query(
          `UPDATE collaborators
           SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
           WHERE email = $2 AND password_hash IS NULL`,
          [passwordHash, allowedEmail],
        );
      } else {
        console.warn("NURIA_INITIAL_PASSWORD is not configured; the collaborator cannot sign in until an initial password is provisioned.");
      }
    } else {
      console.warn("NURIA_EMAIL is not configured; workspace access remains disabled.");
    }
    console.log("Migration completed successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
