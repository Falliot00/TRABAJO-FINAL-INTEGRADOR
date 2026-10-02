import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { bootstrapAdmin } from "../src/bootstrap-admin";

// Only creates and drops a new random schema. Never resets an existing database.
export async function prepareTestDatabase() {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      "TEST_DATABASE_URL es obligatoria para las pruebas PostgreSQL.",
    );
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (
    !["localhost", "127.0.0.1", "::1", "[::1]", "postgres-test"].includes(
      url.hostname,
    )
  ) {
    throw new Error("Las pruebas requieren PostgreSQL local aislado.");
  }
  if (!/test/i.test(decodeURIComponent(url.pathname)))
    throw new Error("La base de pruebas debe contener test en su nombre.");
  const schema = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  url.searchParams.set("schema", schema);
  try {
    execFileSync(
      process.execPath,
      [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: "pipe",
        cwd: path.resolve("."),
      },
    );
    // Fixture deliberately crosses JavaScript's safe integer boundary.
    await admin.query(
      `ALTER TABLE "${schema}".usuarios ALTER COLUMN id RESTART WITH 9007199254740993`,
    );
    await bootstrapAdmin({
      ...process.env,
      DATABASE_URL: url.toString(),
      NODE_ENV: "test",
      BOOTSTRAP_ADMIN_NAME: "Administrador de prueba",
      BOOTSTRAP_ADMIN_EMAIL: "admin@example.test",
      BOOTSTRAP_ADMIN_PASSWORD: "Synthetic-admin-2026!",
    });
  } catch (error) {
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
    throw error;
  }
  return {
    url: url.toString(),
    dispose: async () => {
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.end();
    },
  };
}
