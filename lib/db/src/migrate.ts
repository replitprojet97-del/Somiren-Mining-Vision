import { pool } from "./index.js";

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
    `);
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
