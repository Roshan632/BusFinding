
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const isSupabaseUrl = (value = "") =>
  /^(postgres|postgresql):\/\//i.test(value) && /supabase/i.test(value);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL &&
    (process.env.DATABASE_SSL === "true" || isSupabaseUrl(process.env.DATABASE_URL))
      ? {
          rejectUnauthorized: false,
        }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error.message);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function ensureDatabaseSchema() {
  const migrations = [
    `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`,
    `UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;`,
    `ALTER TABLE IF EXISTS buses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`,
    `UPDATE buses SET updated_at = NOW() WHERE updated_at IS NULL;`,
    `CREATE OR REPLACE VIEW public.route_schedules AS
     SELECT
       s.id,
       s.driver_id,
       s.bus_id,
       s.route_id,
       r.name AS route_name,
       r.start_location,
       r.end_location,
       CAST(s.departure_at AS TIME) AS departure_time,
       CAST(s.expected_arrival_at AS TIME) AS arrival_time,
       NULL::VARCHAR(150) AS stop_name,
       NULL::TIME AS stop_time,
       (s.is_available = TRUE OR s.status = 'active') AS is_active,
       s.created_at
     FROM public.schedules s
     LEFT JOIN public.routes r ON r.id = s.route_id;`,
  ];

  for (const statement of migrations) {
    await query(statement);
  }
}
