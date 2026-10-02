import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";

describe("Protección de la API", () => {
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

  it("bloquea intentos fallidos repetidos sin bloquear una secuencia de accesos válidos", async () => {
    for (let index = 0; index < 11; index += 1) {
      const agent = request.agent(app.getHttpServer());
      const csrf = await agent.get("/api/auth/csrf");
      await agent
        .post("/api/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-CSRF-Token", csrf.body.csrfToken as string)
        .send({
          email: "admin@example.test",
          password: "Synthetic-admin-2026!",
        })
        .expect(201);
    }
    const attacker = request.agent(app.getHttpServer());
    const csrf = await attacker.get("/api/auth/csrf");
    for (let index = 0; index < 10; index += 1) {
      await attacker
        .post("/api/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-CSRF-Token", csrf.body.csrfToken as string)
        .send({ email: "missing@example.test", password: "Incorrecta" })
        .expect(401);
    }
    await attacker
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send({ email: "missing@example.test", password: "Incorrecta" })
      .expect(429);
  });

  it("rechaza CSRF y orígenes ajenos, incluso al iniciar sesión", async () => {
    const agent = request.agent(app.getHttpServer());
    const credentials = {
      email: "admin@example.test",
      password: "Synthetic-admin-2026!",
    };
    await agent
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .send(credentials)
      .expect(403);
    const csrf = await agent.get("/api/auth/csrf").expect(200);
    await agent
      .post("/api/auth/login")
      .set("Origin", "https://otro.example.test")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send(credentials)
      .expect(403);
    await agent
      .get("/api/auth/csrf")
      .set("Origin", "https://otro.example.test")
      .expect(403);
    await agent
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send(credentials)
      .expect(201);
    await agent
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .expect(403);
    await agent.post("/api/users").send({}).expect(403);
    await agent.patch("/api/users/1").send({ active: false }).expect(403);
    await agent.post("/api/users/1/revoke-sessions").expect(403);
    await agent.get("/api/auth/session").expect(200);
  });

  it("no revela si existe una cuenta al rechazar credenciales", async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get("/api/auth/csrf");
    const headers = {
      Origin: "http://localhost:5173",
      "X-CSRF-Token": csrf.body.csrfToken as string,
    };
    const existing = await agent
      .post("/api/auth/login")
      .set(headers)
      .send({ email: "admin@example.test", password: "Incorrecta" })
      .expect(401);
    const absent = await agent
      .post("/api/auth/login")
      .set(headers)
      .send({ email: "inexistente@example.test", password: "Incorrecta" })
      .expect(401);
    expect(existing.body).toEqual(absent.body);
    expect(existing.body).toEqual({
      statusCode: 401,
      message: "Email o contraseña incorrectos.",
    });
  });

  it("impide que un operador administre cuentas o consulte auditoría por una URL directa", async () => {
    const admin = request.agent(app.getHttpServer());
    const csrf = await admin.get("/api/auth/csrf");
    await admin
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send({ email: "admin@example.test", password: "Synthetic-admin-2026!" })
      .expect(201);
    const adminCsrf = await admin.get("/api/auth/csrf");
    const user = await admin
      .post("/api/users")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", adminCsrf.body.csrfToken as string)
      .send({
        name: "Operador limitado",
        email: "limited@example.test",
        password: "Synthetic-limited-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const operator = request.agent(app.getHttpServer());
    const anonymous = await operator.get("/api/auth/csrf");
    const login = await operator
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", anonymous.body.csrfToken as string)
      .send({
        email: "limited@example.test",
        password: "Synthetic-limited-2026!",
      })
      .expect(201);
    expect(login.body.user.permissions).toContain("servicios.gestionar");
    expect(login.body.user.permissions).toContain("fichas.consultar");
    expect(login.body.user.permissions).not.toContain("finanzas.consultar");
    const current = await operator.get("/api/auth/csrf");
    const headers = {
      Origin: "http://localhost:5173",
      "X-CSRF-Token": current.body.csrfToken as string,
    };
    await operator.get("/api/users").expect(403);
    await operator.get("/api/audit").expect(403);
    await operator.post("/api/users").set(headers).send({}).expect(403);
    await operator
      .patch(`/api/users/${user.body.id}`)
      .set(headers)
      .send({ role: "ADMINISTRADOR" })
      .expect(403);
    await operator
      .post(`/api/users/${user.body.id}/revoke-sessions`)
      .set(headers)
      .expect(403);
    await operator.get("/api/finances").expect(404);
    await operator.delete("/api/audit/1").set(headers).expect(404);
    const events = await admin.get("/api/audit").expect(200);
    expect(events.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "ACCESO_DENEGADO",
          actorId: user.body.id,
          result: "RECHAZADO",
        }),
      ]),
    );
  });
});
