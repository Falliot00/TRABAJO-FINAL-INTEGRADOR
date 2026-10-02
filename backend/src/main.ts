import { createApplication } from "./app";
import { readConfig } from "./common/config";

async function main() {
  const config = readConfig(process.env);
  const app = await createApplication();
  await app.listen(config.port, "0.0.0.0");
}

void main().catch(() => {
  console.error(
    "No se pudo iniciar CILGAS. Verifique la configuración y la conexión a PostgreSQL.",
  );
  process.exitCode = 1;
});
