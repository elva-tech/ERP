
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load the backend connection from .env.local. A DATABASE_URL exported in the
// shell (for example a dedicated test database) takes precedence, so commands
// can be pointed at another database deliberately. Prisma 7 does not load the
// placeholder .env file itself.
dotenv.config({ path: ".env.local", override: false, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
