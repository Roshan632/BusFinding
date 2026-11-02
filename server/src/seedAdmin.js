
import "dotenv/config";
import bcrypt from "bcrypt";
import { pool, query } from "./db.js";

async function seedAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (
    !name ||
    !email ||
    !password ||
    password.length < 12 ||
    password.length > 72 ||
    password === "REPLACE_WITH_A_STRONG_UNIQUE_PASSWORD"
  ) {
    throw new Error(
      "Set a valid admin name, email, and unique password in .env."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [name, email, passwordHash]
  );

  const result = await query(
    "SELECT role, status FROM users WHERE email = $1",
    [email]
  );

  if (result.rows[0]?.role !== "admin" ||
      result.rows[0]?.status !== "active") {
    throw new Error(
      "The configured admin email already belongs to a different or unavailable account. Resolve it manually."
    );
  }

  console.log("Admin account is ready:", email);
}

seedAdmin()
  .catch((error) => {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
