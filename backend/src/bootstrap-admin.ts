import { isEmail } from "class-validator";
import { readConfig } from "./common/config";
import { createDatabase } from "./common/database";
import { hashPassword } from "./common/password";
import { AuditService } from "./modules/audit/audit.service";

export async function bootstrapAdmin(env: NodeJS.ProcessEnv) {
  const config = readConfig(env);
  const name = env.BOOTSTRAP_ADMIN_NAME?.trim();
  const email = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  if (
    !name ||
    name.length > 120 ||
    !email ||
    email.length > 254 ||
    !isEmail(email) ||
    !password ||
    password.length < 12 ||
    password.length > 128
  ) {
    throw new Error(
      "Defina nombre, email válido y contraseña inicial de 12 a 128 caracteres.",
    );
  }
  const db = createDatabase(config.databaseUrl);
  const audit = new AuditService(db);
  try {
    return await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7348291)`;
        const existing = await tx.user.findFirst({ where: { email } });
        if (existing) return false;
        if (
          await tx.user.count({
            where: { active: true, role: { code: "ADMINISTRADOR" } },
          })
        ) {
          throw new Error(
            "Ya existe un administrador; utilice la gestión de cuentas.",
          );
        }
        const role = await tx.role.findUniqueOrThrow({
          where: { code: "ADMINISTRADOR" },
        });
        const user = await tx.user.create({
          data: {
            name,
            email,
            passwordHash: await hashPassword(password),
            roleId: role.id,
          },
        });
        await audit.record(
          {
            actorId: String(user.id),
            action: "USUARIO_INICIAL_CREADO",
            entity: "usuarios",
            entityId: String(user.id),
            result: "EXITO",
            detail: "Alta inicial mediante configuración del despliegue.",
          },
          tx,
        );
        return true;
      },
      { timeout: 10000 },
    );
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  bootstrapAdmin(process.env)
    .then((created) => {
      console.info(
        created
          ? "Administrador inicial creado."
          : "La cuenta inicial ya existe; no se modificaron credenciales.",
      );
    })
    .catch(() => {
      console.error(
        "No se pudo crear el administrador. Verifique configuración, migraciones y cuentas existentes.",
      );
      process.exitCode = 1;
    });
}
