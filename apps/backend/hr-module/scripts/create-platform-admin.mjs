
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } =
  process.env;

if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD) {
  console.error("Required setup environment variables are missing.");
  process.exitCode = 1;
} else {
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const name = ADMIN_NAME.trim();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !name ||
    name.length > 200 ||
    ADMIN_PASSWORD.length < 12 ||
    ADMIN_PASSWORD.length > 72
  ) {
    console.error(
      "Use a valid email, a name of 1-200 characters, and a password of 12-72 characters."
    );
    process.exitCode = 1;
  } else {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingAdmin = await client.query(
        "SELECT id FROM users WHERE platform_role = 'platform_admin' LIMIT 1"
      );

      if (existingAdmin.rowCount > 0) {
        throw new Error(
          "A platform administrator already exists. Setup cancelled."
        );
      }

      const existingEmail = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingEmail.rowCount > 0) {
        throw new Error(
          "This email already belongs to a user. Setup cancelled."
        );
      }

      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

      await client.query(
        `INSERT INTO users
           (email, password_hash, full_name, platform_role,
            status, email_verified_at)
         VALUES ($1, $2, $3, 'platform_admin', 'active', NOW())`,
        [email, passwordHash, name]
      );

      await client.query("COMMIT");
      console.log("Initial platform administrator created successfully.");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Platform-admin setup failed:", error.message);
      process.exitCode = 1;
    } finally {
      client.release();
      await pool.end();
    }
  }
}
