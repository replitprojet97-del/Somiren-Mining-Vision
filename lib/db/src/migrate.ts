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
      ALTER TABLE collaborator_sessions ADD COLUMN IF NOT EXISTS browser_name TEXT;
      ALTER TABLE collaborator_sessions ADD COLUMN IF NOT EXISTS os_name TEXT;

      CREATE TABLE IF NOT EXISTS collaborator_two_factor (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL UNIQUE REFERENCES collaborators(id) ON DELETE CASCADE,
        secret_ciphertext TEXT,
        pending_secret_ciphertext TEXT,
        pending_expires_at TIMESTAMPTZ,
        recovery_code_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
        last_accepted_step INTEGER,
        factor_version INTEGER NOT NULL DEFAULT 0,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        enrollment_attempts INTEGER NOT NULL DEFAULT 0,
        enrollment_window_started_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS collaborator_login_challenges (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        factor_version INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS collaborator_login_challenges_collaborator_id_idx
        ON collaborator_login_challenges(collaborator_id);

      CREATE TABLE IF NOT EXISTS workspace_roles (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        manual_content TEXT,
        content_type TEXT,
        object_path TEXT,
        file_name TEXT,
        file_size INTEGER,
        uploaded_by_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_private_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploaded_by_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        object_path TEXT NOT NULL UNIQUE,
        file_name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        purpose TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE workspace_documents ADD COLUMN IF NOT EXISTS manual_content TEXT;
      ALTER TABLE workspace_documents ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES workspace_private_uploads(id) ON DELETE RESTRICT;
      ALTER TABLE workspace_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
      ALTER TABLE workspace_documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS profile_photo_asset_id UUID REFERENCES workspace_private_uploads(id) ON DELETE RESTRICT;
      ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS profile_photo_removed BOOLEAN NOT NULL DEFAULT FALSE;

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
      CREATE TABLE IF NOT EXISTS workspace_document_returns (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL REFERENCES workspace_document_assignments(id) ON DELETE CASCADE,
        asset_id UUID NOT NULL UNIQUE REFERENCES workspace_private_uploads(id) ON DELETE RESTRICT,
        comment TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS workspace_document_returns_assignment_idx
        ON workspace_document_returns (assignment_id, submitted_at DESC);
      CREATE TABLE IF NOT EXISTS workspace_executive_requests (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
        priority TEXT NOT NULL DEFAULT 'normal', due_at TIMESTAMPTZ, assignee_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_meetings (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ, headquarters_timezone TEXT NOT NULL DEFAULT 'Europe/Madrid', meeting_url TEXT,
        video_asset_id UUID REFERENCES workspace_private_uploads(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE workspace_meetings ADD COLUMN IF NOT EXISTS video_asset_id UUID REFERENCES workspace_private_uploads(id) ON DELETE RESTRICT;
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
        audio_asset_id UUID REFERENCES workspace_private_uploads(id) ON DELETE RESTRICT,
        transcript TEXT, translation TEXT, source_language TEXT, target_language TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS audio_asset_id UUID REFERENCES workspace_private_uploads(id) ON DELETE RESTRICT;
      ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS transcript TEXT;
      ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS translation TEXT;
      ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS source_language TEXT;
      ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS target_language TEXT;
      ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS sender_service_name TEXT;
      ALTER TABLE workspace_messages ADD COLUMN IF NOT EXISTS sender_service_signature TEXT;
      CREATE TABLE IF NOT EXISTS workspace_sender_services (
        id SERIAL PRIMARY KEY, system_key TEXT UNIQUE, name TEXT NOT NULL UNIQUE, signature TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE workspace_sender_services ADD COLUMN IF NOT EXISTS system_key TEXT UNIQUE;
      INSERT INTO workspace_sender_services (system_key, name, signature) VALUES
        ('direction', 'La direction', 'Somiren S.A. · Direction générale'),
        ('payroll', 'Service paie', 'Somiren S.A. · Service paie'),
        ('accounting', 'Service comptabilité', 'Somiren S.A. · Service comptabilité'),
        ('hr', 'Service RH', 'Somiren S.A. · Service RH')
      ON CONFLICT DO NOTHING;
      CREATE TABLE IF NOT EXISTS workspace_message_read_cursors (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES workspace_conversations(id) ON DELETE CASCADE,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        last_read_message_id INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(conversation_id, collaborator_id)
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
        amount NUMERIC(14, 2), currency TEXT, transfer_instructions TEXT,
        transfer_requested_at TIMESTAMPTZ, transfer_request_status TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2);
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS currency TEXT;
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS transfer_instructions TEXT;
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS transfer_requested_at TIMESTAMPTZ;
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS transfer_request_status TEXT;
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS payroll_service_name TEXT NOT NULL DEFAULT 'Service paie';
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS payroll_service_signature TEXT NOT NULL DEFAULT 'Somiren S.A. · Service paie';
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2);
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS currency TEXT;
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS transfer_instructions TEXT;
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS payroll_service_name TEXT NOT NULL DEFAULT 'Service paie';
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS payroll_service_signature TEXT NOT NULL DEFAULT 'Somiren S.A. · Service paie';
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS transfer_requested_at TIMESTAMPTZ;
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS transfer_request_status TEXT;
      ALTER TABLE workspace_financial_records ADD COLUMN IF NOT EXISTS conditions_reported_at TIMESTAMPTZ;
      ALTER TABLE workspace_arrears ADD COLUMN IF NOT EXISTS conditions_reported_at TIMESTAMPTZ;
      UPDATE workspace_arrears SET status = CASE
        WHEN lower(status) IN ('settled', 'paid', 'completed') THEN 'settled'
        WHEN lower(status) = 'archived' THEN 'archived'
        ELSE 'open'
      END
      WHERE status NOT IN ('open', 'settled', 'archived');
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
    await client.query(
      `INSERT INTO collaborators (email, full_name, role, permissions, must_change_password)
       VALUES ($1, $2, 'ADMIN', $3::jsonb, FALSE)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name, role = EXCLUDED.role,
         is_active = TRUE, updated_at = NOW()`,
      ["admin@somiren.local", "Administration Somiren", JSON.stringify(["workspace:read", "workspace:write", "MANAGE_USERS", "MANAGE_PERMISSIONS", "CAN_USE_VIDEO_CONFERENCE"])],
    );
    await client.query(
      `UPDATE collaborators SET permissions = CASE
         WHEN permissions ? 'USE_INTERNAL_MESSAGING' THEN permissions
         ELSE permissions || '["USE_INTERNAL_MESSAGING"]'::jsonb
       END, updated_at = NOW()
       WHERE role = 'ADMIN'`,
    );
    await client.query(
      `INSERT INTO workspace_roles (label, permissions)
       SELECT value.label, value.permissions::jsonb
       FROM (VALUES
         ('ADMIN', $1),
         ('EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR', $2),
         ('COLLABORATOR', $3)
       ) AS value(label, permissions)
       WHERE NOT EXISTS (SELECT 1 FROM workspace_roles r WHERE r.label = value.label)`,
      [
          JSON.stringify(["workspace:read", "workspace:write", "MANAGE_USERS", "MANAGE_PERMISSIONS", "CAN_USE_VIDEO_CONFERENCE", "USE_INTERNAL_MESSAGING"]),
        JSON.stringify(["workspace:read", "workspace:write", "VIEW_ASSIGNED_CASES", "MANAGE_ASSIGNED_CASES", "VIEW_ASSIGNED_TASKS", "MANAGE_ASSIGNED_TASKS", "VIEW_EXECUTIVE_REQUESTS", "MANAGE_ASSIGNED_REQUESTS", "VIEW_ASSIGNED_DOCUMENTS", "SUBMIT_DOCUMENTS", "USE_INTERNAL_MESSAGING", "PARTICIPATE_IN_MEETINGS"]),
        JSON.stringify(["workspace:read", "workspace:write", "VIEW_ASSIGNED_CASES", "MANAGE_ASSIGNED_CASES", "VIEW_ASSIGNED_TASKS", "MANAGE_ASSIGNED_TASKS", "VIEW_EXECUTIVE_REQUESTS", "MANAGE_ASSIGNED_REQUESTS", "VIEW_ASSIGNED_DOCUMENTS", "DOWNLOAD_ALLOWED_DOCUMENTS", "SUBMIT_DOCUMENTS", "USE_INTERNAL_MESSAGING", "PARTICIPATE_IN_MEETINGS"]),
      ],
    );
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
