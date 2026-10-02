export const appOrigin = "http://127.0.0.1:4173";
export const apiOrigin = "http://127.0.0.1:43001";

export const administrator = {
  name: "Administración E2E",
  email: "admin.e2e@example.test",
  password: "Synthetic-admin-e2e-2026!",
};

export function e2eDatabaseUrl() {
  const source = process.env.E2E_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!source) {
    throw new Error(
      "Definir E2E_DATABASE_URL o TEST_DATABASE_URL para los E2E.",
    );
  }
  const url = new URL(source);
  if (!process.env.E2E_DATABASE_URL) url.pathname = "/cilgas_e2e_test";
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1", "[::1]", "postgres-test"].includes(
      url.hostname,
    ) ||
    decodeURIComponent(url.pathname) !== "/cilgas_e2e_test" ||
    (url.searchParams.has("schema") &&
      url.searchParams.get("schema") !== "public")
  ) {
    throw new Error(
      "Los E2E requieren la base local dedicada cilgas_e2e_test.",
    );
  }
  return url.toString();
}

export function serverEnvironment() {
  return {
    DATABASE_URL: e2eDatabaseUrl(),
    NODE_ENV: "test",
    APP_ORIGIN: appOrigin,
    PORT: "43001",
  };
}
