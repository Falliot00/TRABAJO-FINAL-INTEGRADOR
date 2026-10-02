import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";

async function signedIn(
  app: INestApplication,
  email = "admin@example.test",
  password = "Synthetic-admin-2026!",
) {
  const agent = request.agent(app.getHttpServer());
  const csrf = await agent.get("/api/auth/csrf");
  await agent
    .post("/api/auth/login")
    .set("Origin", "http://localhost:5173")
    .set("X-CSRF-Token", csrf.body.csrfToken as string)
    .send({ email, password })
    .expect(201);
  const authenticated = await agent.get("/api/auth/csrf");
  return {
    agent,
    headers: {
      Origin: "http://localhost:5173",
      "X-CSRF-Token": authenticated.body.csrfToken as string,
    },
  };
}

describe("Acceso individual al taller", () => {
  let app: INestApplication;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    const database = await prepareTestDatabase();
    dispose = database.dispose;
    app = await createApplication({
      ...process.env,
      NODE_ENV: "test",
      APP_ORIGIN: "http://localhost:5173",
      DATABASE_URL: database.url,
    });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await dispose?.();
  });

  it("exige una sesión y permite entrar con la cuenta inicial sin exponer credenciales", async () => {
    await request(app.getHttpServer()).get("/api/auth/session").expect(401);
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get("/api/auth/csrf").expect(200);
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send({ email: "admin@example.test", password: "Synthetic-admin-2026!" })
      .expect(201);
    expect(login.body.user).toMatchObject({
      email: "admin@example.test",
      role: "ADMINISTRADOR",
    });
    expect(login.body.user.id).toBe("9007199254740993");
    expect(JSON.stringify(login.body)).not.toMatch(/password|token|hash/i);
    expect(login.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/HttpOnly;.*SameSite=Strict/),
      ]),
    );
    const session = await agent.get("/api/auth/session").expect(200);
    expect(session.body).toEqual(login.body);
  });

  it("permite al administrador crear una cuenta y conserva la autoría sin registrar su contraseña", async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get("/api/auth/csrf");
    await agent
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send({ email: "admin@example.test", password: "Synthetic-admin-2026!" })
      .expect(201);
    const authenticatedCsrf = await agent.get("/api/auth/csrf");
    const created = await agent
      .post("/api/users")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", authenticatedCsrf.body.csrfToken as string)
      .send({
        name: "Operador de prueba",
        email: "operador@example.test",
        password: "Synthetic-operator-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const users = await agent.get("/api/users").expect(200);
    expect(users.body).toContainEqual(created.body);
    expect(created.body).toMatchObject({ active: true, role: "OPERADOR" });
    expect(created.body.permissions).not.toContain("finanzas.consultar");
    const audit = await agent.get("/api/audit").expect(200);
    expect(audit.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "USUARIO_CREADO",
          entityId: created.body.id,
          actorId: expect.any(String),
          result: "EXITO",
        }),
      ]),
    );
    expect(
      JSON.stringify({ users: users.body, audit: audit.body }),
    ).not.toMatch(/Synthetic-|password|token_hash|argon2/);
  });

  it("actualiza nombre y rol, revoca las sesiones anteriores e impide el acceso de una cuenta desactivada", async () => {
    const admin = await signedIn(app);
    const created = await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({
        name: "Cuenta editable",
        email: "editable@example.test",
        password: "Synthetic-editor-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const operator = await signedIn(
      app,
      "editable@example.test",
      "Synthetic-editor-2026!",
    );
    const updated = await admin.agent
      .patch(`/api/users/${created.body.id}`)
      .set(admin.headers)
      .send({ name: "Cuenta actualizada", role: "ADMINISTRADOR" })
      .expect(200);
    expect(updated.body).toMatchObject({
      name: "Cuenta actualizada",
      role: "ADMINISTRADOR",
    });
    await operator.agent.get("/api/auth/session").expect(401);
    const newSession = await signedIn(
      app,
      "editable@example.test",
      "Synthetic-editor-2026!",
    );
    await newSession.agent.get("/api/users").expect(200);
    await admin.agent
      .patch(`/api/users/${created.body.id}`)
      .set(admin.headers)
      .send({ active: false })
      .expect(200);
    await newSession.agent.get("/api/auth/session").expect(401);
    const csrf = await newSession.agent.get("/api/auth/csrf");
    await newSession.agent
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send({
        email: "editable@example.test",
        password: "Synthetic-editor-2026!",
      })
      .expect(401);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "USUARIO_ACTUALIZADO",
          entityId: created.body.id,
          detail:
            "Campos actualizados: nombre, rol. Rol: OPERADOR → ADMINISTRADOR.",
        }),
        expect.objectContaining({
          action: "USUARIO_ACTUALIZADO",
          entityId: created.body.id,
          detail: "Campos actualizados: estado. Estado: activo → inactivo.",
        }),
      ]),
    );
    expect(JSON.stringify(audit.body)).not.toMatch(
      /Synthetic-|password|token_hash|argon2/,
    );
  });

  it("conserva un administrador activo ante dos bajas concurrentes", async () => {
    const admin = await signedIn(app);
    const created = await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({
        name: "Segundo administrador",
        email: "second-admin@example.test",
        password: "Synthetic-second-2026!",
        role: "ADMINISTRADOR",
      })
      .expect(201);
    const initialId = "9007199254740993";
    const results = await Promise.all([
      admin.agent
        .patch(`/api/users/${initialId}`)
        .set(admin.headers)
        .send({ active: false }),
      admin.agent
        .patch(`/api/users/${created.body.id}`)
        .set(admin.headers)
        .send({ active: false }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const survivor =
      results[0]!.status === 200
        ? await signedIn(
            app,
            "second-admin@example.test",
            "Synthetic-second-2026!",
          )
        : await signedIn(app);
    const users = await survivor.agent.get("/api/users").expect(200);
    expect(
      users.body.filter(
        (user: { active: boolean; role: string }) =>
          user.active && user.role === "ADMINISTRADOR",
      ),
    ).toHaveLength(1);
    await survivor.agent
      .patch(`/api/users/${initialId}`)
      .set(survivor.headers)
      .send({ active: true })
      .expect(200);
    await survivor.agent
      .patch(`/api/users/${created.body.id}`)
      .set(survivor.headers)
      .send({ active: false })
      .expect(200);
  });

  it("revoca todas las sesiones de una cuenta y el cierre de sesión invalida la cookie anterior", async () => {
    const admin = await signedIn(app);
    const created = await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({
        name: "Cuenta revocable",
        email: "revocable@example.test",
        password: "Synthetic-revoke-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const first = await signedIn(
      app,
      "revocable@example.test",
      "Synthetic-revoke-2026!",
    );
    const second = await signedIn(
      app,
      "revocable@example.test",
      "Synthetic-revoke-2026!",
    );
    await admin.agent
      .post(`/api/users/${created.body.id}/revoke-sessions`)
      .set(admin.headers)
      .expect(204);
    await first.agent.get("/api/auth/session").expect(401);
    await second.agent.get("/api/auth/session").expect(401);
    const fresh = await signedIn(
      app,
      "revocable@example.test",
      "Synthetic-revoke-2026!",
    );
    await fresh.agent.post("/api/auth/logout").set(fresh.headers).expect(204);
    await fresh.agent.get("/api/auth/session").expect(401);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "SESIONES_REVOCADAS",
          entityId: created.body.id,
        }),
        expect.objectContaining({
          action: "SESION_CERRADA",
          actorId: created.body.id,
        }),
      ]),
    );
  });

  it("valida los cambios y pagina la auditoría sin repetir eventos ni aceptar campos extra", async () => {
    const admin = await signedIn(app);
    await admin.agent
      .patch("/api/users/9007199254740993")
      .set(admin.headers)
      .send({})
      .expect(400);
    await admin.agent
      .patch("/api/users/9007199254740993")
      .set(admin.headers)
      .send({ active: null })
      .expect(400);
    await admin.agent
      .patch("/api/users/9007199254740993")
      .set(admin.headers)
      .send({ passwordHash: "inyectado" })
      .expect(400);
    await admin.agent
      .patch("/api/users/9007199254740993")
      .set(admin.headers)
      .send({ role: "PROPIETARIO" })
      .expect(400);
    await admin.agent
      .patch("/api/users/9223372036854775808")
      .set(admin.headers)
      .send({ name: "Fuera de rango" })
      .expect(400);
    const user = {
      name: "Cuenta normalizada",
      email: "NORMALIZADA@example.test",
      password: "Synthetic-normalized!",
      role: "OPERADOR",
    };
    const created = await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send(user)
      .expect(201);
    expect(created.body.email).toBe("normalizada@example.test");
    await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({ ...user, email: "normalizada@example.test" })
      .expect(409);
    const first = await admin.agent.get("/api/audit?limit=2").expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await admin.agent
      .get(`/api/audit?limit=2&cursor=${first.body.nextCursor}`)
      .expect(200);
    expect(second.body.items.length).toBeGreaterThan(0);
    const firstIds = first.body.items.map((item: { id: string }) => item.id);
    for (const event of second.body.items)
      expect(firstIds).not.toContain(event.id);
    await admin.agent.get("/api/audit?limit=1000").expect(400);
    await admin.agent.get("/api/audit?cursor=1.5").expect(400);
  });
});
