
import pg from "pg";
import bcrypt from "bcrypt";
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
  timezone: process.env.DB_TIMEZONE || "Asia/Kathmandu",
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
    `CREATE TABLE IF NOT EXISTS schedules (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE RESTRICT,
       driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
       route_id UUID NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
       departure_at TIMESTAMPTZ NOT NULL,
       expected_arrival_at TIMESTAMPTZ NOT NULL,
       status VARCHAR(20) NOT NULL DEFAULT 'draft'
         CHECK (status IN ('draft', 'published', 'cancelled')),
       is_available BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       CONSTRAINT schedules_valid_times CHECK (expected_arrival_at > departure_at),
       CONSTRAINT schedules_id_route_unique UNIQUE (id, route_id)
     );`,
    `CREATE TABLE IF NOT EXISTS schedule_stops (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
       route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
       stop_id UUID NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
       stop_order INTEGER NOT NULL CHECK (stop_order > 0),
       scheduled_arrival_at TIMESTAMPTZ,
       scheduled_departure_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );`,
    `ALTER TABLE IF EXISTS schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`,
    `UPDATE schedules SET updated_at = NOW() WHERE updated_at IS NULL;`,
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
       (s.is_available = TRUE AND s.status IN ('published', 'draft')) AS is_active,
       s.created_at
     FROM public.schedules s
     LEFT JOIN public.routes r ON r.id = s.route_id;`,
  ];

  for (const statement of migrations) {
    await query(statement);
  }

  const tables = [
    "users",
    "driver_requests",
    "routes",
    "schedules",
    "buses",
    "bus_stops",
    "route_stops",
    "trips",
    "bus_locations",
  ];

  for (const tableName of tables) {
    await query(`ALTER TABLE IF EXISTS public.${tableName} ENABLE ROW LEVEL SECURITY;`);
    await query(`DROP POLICY IF EXISTS "${tableName}_backend_all_access" ON public.${tableName};`);
    await query(`
      CREATE POLICY "${tableName}_backend_all_access"
      ON public.${tableName}
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
    `);
  }
}

export async function ensureDefaultAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    return;
  }

  const existingUser = await query(
    `SELECT id, role, status FROM users WHERE email = $1`,
    [email]
  );

  if (existingUser.rows[0]) {
    if (existingUser.rows[0].role === "admin" && existingUser.rows[0].status === "active") {
      return;
    }

    const updatedUser = await query(
      `UPDATE users
       SET role = 'admin', status = 'active', updated_at = NOW()
       WHERE email = $1
       RETURNING id, role, status` ,
      [email]
    );

    if (updatedUser.rows[0]?.role !== "admin" || updatedUser.rows[0]?.status !== "active") {
      throw new Error(
        "The configured admin email already belongs to a different or unavailable account. Resolve it manually."
      );
    }

    console.log(`Admin account ready: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, $2, $3, 'admin', 'active')
     ON CONFLICT (email) DO NOTHING`,
    [name, email, passwordHash]
  );

  const result = await query(
    `SELECT role, status FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows[0]?.role !== "admin" || result.rows[0]?.status !== "active") {
    throw new Error(
      "The configured admin email already belongs to a different or unavailable account. Resolve it manually."
    );
  }

  console.log(`Admin account ready: ${email}`);
}
