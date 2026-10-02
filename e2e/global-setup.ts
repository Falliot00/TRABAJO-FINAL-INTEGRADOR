import { execFileSync } from "node:child_process";
import path from "node:path";
import { administrator, serverEnvironment } from "./environment";

export default function setup() {
  const backend = path.resolve("backend");
  const env = {
    ...process.env,
    ...serverEnvironment(),
    BOOTSTRAP_ADMIN_NAME: administrator.name,
    BOOTSTRAP_ADMIN_EMAIL: administrator.email,
    BOOTSTRAP_ADMIN_PASSWORD: administrator.password,
  };
  execFileSync(
    process.execPath,
    [
      path.join(backend, "node_modules/prisma/build/index.js"),
      "migrate",
      "deploy",
    ],
    { cwd: backend, env, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [path.join(backend, "dist/bootstrap-admin.js")],
    {
      cwd: backend,
      env,
      stdio: "inherit",
    },
  );
}
