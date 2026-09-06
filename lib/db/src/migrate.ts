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
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS collaborator_sessions (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE collaborator_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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
      ALTER TABLE workspace_documents ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
      ALTER TABLE workspace_documents ADD COLUMN IF NOT EXISTS confidentiality TEXT NOT NULL DEFAULT 'private';
      CREATE TABLE IF NOT EXISTS workspace_document_assignments (
        id SERIAL PRIMARY KEY, document_id INTEGER NOT NULL REFERENCES workspace_documents(id) ON DELETE CASCADE,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE, instruction TEXT,
        priority TEXT NOT NULL DEFAULT 'normal', due_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'received',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_executive_requests (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
        priority TEXT NOT NULL DEFAULT 'normal', due_at TIMESTAMPTZ, assignee_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_meetings (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ, headquarters_timezone TEXT NOT NULL DEFAULT 'Europe/Madrid', meeting_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_meeting_participants (
        id SERIAL PRIMARY KEY, meeting_id INTEGER NOT NULL REFERENCES workspace_meetings(id) ON DELETE CASCADE,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(meeting_id, collaborator_id)
      );
      CREATE TABLE IF NOT EXISTS workspace_conversations (
        id SERIAL PRIMARY KEY, subject TEXT NOT NULL, collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_messages (
        id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES workspace_conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT, body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_strategic_notes (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', is_shared BOOLEAN NOT NULL DEFAULT FALSE,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_contacts (
        id SERIAL PRIMARY KEY, full_name TEXT NOT NULL, email TEXT, phone TEXT, organization TEXT,
        collaborator_id INTEGER REFERENCES collaborators(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_financial_records (
        id SERIAL PRIMARY KEY, collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        salary_status TEXT NOT NULL, period_label TEXT NOT NULL, communicated_delay_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_payments (
        id SERIAL PRIMARY KEY, collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        period_label TEXT NOT NULL, status TEXT NOT NULL, paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_arrears (
        id SERIAL PRIMARY KEY, collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        period_label TEXT NOT NULL, status TEXT NOT NULL, communicated_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_payment_requirements (
        id SERIAL PRIMARY KEY, collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        title TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_payment_requirement_documents (
        id SERIAL PRIMARY KEY, requirement_id INTEGER NOT NULL REFERENCES workspace_payment_requirements(id) ON DELETE CASCADE,
        title TEXT NOT NULL, object_path TEXT, content_type TEXT, submitted_by_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const allowedEmail = process.env.NURIA_EMAIL?.trim().toLowerCase();
    if (allowedEmail) {
      await client.query(
        `INSERT INTO collaborators (email, full_name, role, permissions)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (email) DO NOTHING`,
        [
          allowedEmail,
          "Nuria Molero Rodriguez",
           "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR",
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
        const passwordStatus = await client.query(
          `SELECT password_hash IS NOT NULL AS configured FROM collaborators WHERE email = $1`,
          [allowedEmail],
        );
        if (!passwordStatus.rows[0]?.configured) {
          console.warn("NURIA_INITIAL_PASSWORD is not configured; the collaborator cannot sign in until an initial password is provisioned.");
        }
      }
      if (allowedEmail) {
        await client.query(
          `UPDATE collaborators SET role = 'EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR',
           permissions = (SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements_text(collaborators.permissions || $1::jsonb) AS value),
           updated_at = NOW() WHERE email = $2`,
          [JSON.stringify(["VIEW_ASSIGNED_CASES","MANAGE_ASSIGNED_CASES","VIEW_ASSIGNED_TASKS","MANAGE_ASSIGNED_TASKS","VIEW_EXECUTIVE_REQUESTS","MANAGE_ASSIGNED_REQUESTS","VIEW_ASSIGNED_DOCUMENTS","DOWNLOAD_ALLOWED_DOCUMENTS","UPLOAD_DOCUMENTS","SUBMIT_DOCUMENTS","USE_INTERNAL_MESSAGING","PARTICIPATE_IN_MEETINGS","VIEW_OWN_FINANCIAL_INFORMATION","VIEW_OWN_PAYMENT_HISTORY","VIEW_OWN_ARREARS","VIEW_OWN_PAYMENT_REQUIREMENTS","SUBMIT_PAYMENT_DOCUMENTS"]), allowedEmail],
        );
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
