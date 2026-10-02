import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { bootstrapAdmin } from "../src/bootstrap-admin";
import { prepareTestDatabase } from "./database";

describe("Arranque y configuración segura", () => {
  let app: INestApplication;
  let dispose: () => Promise<void>;
  let databaseUrl: string;

  beforeAll(async () => {
    const database = await prepareTestDatabase();
    dispose = database.dispose;
    databaseUrl = database.url;
  });
  afterEach(async () => {
    await app?.close();
  });
  afterAll(async () => {
    await dispose?.();
  });

  it("rechaza una configuración que podría habilitar HTTP por un nombre de entorno incorrecto", async () => {
    await expect(
      createApplication({ DATABASE_URL: databaseUrl, NODE_ENV: "production " }),
    ).rejects.toThrow();
    await expect(
      createApplication({
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production",
        APP_ORIGIN: "http://cilgas.example.test",
      }),
    ).rejects.toThrow();
    await expect(
      createApplication({
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        SESSION_TTL_HOURS: "-1",
      }),
    ).rejects.toThrow();
  });

  it("conserva las credenciales del bootstrap al repetirlo", async () => {
    const env = {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      BOOTSTRAP_ADMIN_NAME: "Nombre alternativo",
      BOOTSTRAP_ADMIN_EMAIL: "admin@example.test",
      BOOTSTRAP_ADMIN_PASSWORD: "Nueva-clave-ignorada!",
    };
    expect(await bootstrapAdmin(env)).toBe(false);
    app = await createApplication({
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
    });
    await app.init();
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get("/api/auth/csrf");
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send({ email: "admin@example.test", password: "Synthetic-admin-2026!" })
      .expect(201);
    expect(login.body.user.name).toBe("Administrador de prueba");
  });

  it("exige HTTPS, protege las cookies y no publica OpenAPI en producción", async () => {
    app = await createApplication({
      NODE_ENV: "production",
      DATABASE_URL: databaseUrl,
      APP_ORIGIN: "https://cilgas.example.test",
    });
    await app.init();
    await request(app.getHttpServer()).get("/api/auth/csrf").expect(400);
    await request(app.getHttpServer())
      .get("/api/docs")
      .set("X-Forwarded-Proto", "https")
      .expect(404);
    const csrf = await request(app.getHttpServer())
      .get("/api/auth/csrf")
      .set("X-Forwarded-Proto", "https")
      .expect(200);
    const cookies = csrf.headers["set-cookie"] as unknown as string[];
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^__Host-cilgas_csrf=.*HttpOnly; Secure; SameSite=Strict/,
        ),
      ]),
    );
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-Forwarded-Proto", "https")
      .set("Origin", "https://cilgas.example.test")
      .set("Cookie", cookies.map((cookie) => cookie.split(";")[0]!).join("; "))
      .set("X-CSRF-Token", csrf.body.csrfToken as string)
      .send({ email: "admin@example.test", password: "Synthetic-admin-2026!" })
      .expect(201);
    expect(login.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^__Host-cilgas_session=.*HttpOnly; Secure; SameSite=Strict/,
        ),
      ]),
    );
    await request(app.getHttpServer())
      .get("/api/health")
      .expect(200, { status: "ok" });
  });
});
