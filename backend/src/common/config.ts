export interface AppConfig {
  databaseUrl: string;
  origin: string;
  production: boolean;
  port: number;
  sessionHours: number;
}

export function readConfig(env: NodeJS.ProcessEnv): AppConfig {
  if (
    env.NODE_ENV !== undefined &&
    !["development", "test", "production"].includes(env.NODE_ENV)
  ) {
    throw new Error("NODE_ENV debe ser development, test o production.");
  }
  const production = env.NODE_ENV === "production";
  if (!env.DATABASE_URL) throw new Error("Falta DATABASE_URL.");
  let database: URL;
  let origin: URL;
  try {
    database = new URL(env.DATABASE_URL);
    origin = new URL(env.APP_ORIGIN ?? "http://localhost:5173");
  } catch {
    throw new Error("La configuración de conexión no es válida.");
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !database.pathname.slice(1)
  ) {
    throw new Error("DATABASE_URL debe identificar una base PostgreSQL.");
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    (production && origin.protocol !== "https:")
  ) {
    throw new Error(
      "APP_ORIGIN debe ser un origen válido y usar HTTPS en producción.",
    );
  }
  const port = Number(env.PORT ?? 3000);
  const sessionHours = Number(env.SESSION_TTL_HOURS ?? 8);
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Number.isInteger(sessionHours) ||
    sessionHours < 1 ||
    sessionHours > 24
  ) {
    throw new Error("PORT o SESSION_TTL_HOURS fuera de rango.");
  }
  return {
    databaseUrl: database.toString(),
    origin: origin.origin,
    production,
    port,
    sessionHours,
  };
}
