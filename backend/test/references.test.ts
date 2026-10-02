import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { signedIn } from "./session";

describe("Configuración y referencias del taller", () => {
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

  it("configura un único taller, permite limpiar datos opcionales y conserva autoría administrativa", async () => {
    await request(app.getHttpServer()).get("/api/workshop").expect(401);
    const admin = await signedIn(app);
    const empty = await admin.agent.get("/api/workshop").expect(200);
    expect(empty.body).toBeNull();
    const saved = await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ name: " Taller sintético ", phone: "341-0000000" })
      .expect(200);
    expect(saved.body).toMatchObject({
      id: "1",
      name: "Taller sintético",
      phone: "341-0000000",
      tdmId: null,
    });
    const updated = await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ phone: null, email: "CONTACTO@example.test" })
      .expect(200);
    expect(updated.body).toMatchObject({
      id: "1",
      phone: null,
      email: "contacto@example.test",
    });
    const recovered = await admin.agent.get("/api/workshop").expect(200);
    expect(recovered.body).toEqual(updated.body);
    await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ name: null })
      .expect(400);
    await admin.agent
      .patch("/api/workshop")
      .send({ name: "Sin CSRF" })
      .expect(403);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toContainEqual(
      expect.objectContaining({
        action: "TALLER_ACTUALIZADO",
        entity: "configuracion_taller",
        entityId: "1",
        actorId: "9007199254740993",
      }),
    );
  });
  it("administra sujetos regulatorios separados por tipo y limita las escrituras del operador", async () => {
    const admin = await signedIn(app);
    const created = await admin.agent
      .post("/api/regulatory-actors")
      .set(admin.headers)
      .send({
        type: "TDM",
        code: " t-001 ",
        name: "TdM sintético",
        cuit: "20-12345678-6",
        technicalResponsible: "Responsable sintético",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      code: "T-001",
      cuit: "20123456786",
      active: true,
    });
    await admin.agent
      .post("/api/regulatory-actors")
      .set(admin.headers)
      .send({ type: "TDM", code: "T-001", name: "Duplicado" })
      .expect(409);
    const pec = await admin.agent
      .post("/api/regulatory-actors")
      .set(admin.headers)
      .send({ type: "PEC", code: "T-001", name: "PEC sintético" })
      .expect(201);
    await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ name: "Taller sintético", tdmId: pec.body.id })
      .expect(400);
    await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ name: "Taller sintético", tdmId: created.body.id })
      .expect(200);
    await admin.agent
      .patch(`/api/regulatory-actors/${created.body.id}`)
      .set(admin.headers)
      .send({ type: "CRPC" })
      .expect(409);
    const changed = await admin.agent
      .patch(`/api/regulatory-actors/${created.body.id}`)
      .set(admin.headers)
      .send({ technicalResponsible: null, name: "TdM actualizado" })
      .expect(200);
    expect(changed.body.technicalResponsible).toBeNull();
    const found = await admin.agent
      .get("/api/regulatory-actors?q=t-001&type=TDM&limit=1")
      .expect(200);
    expect(found.body.items).toEqual([changed.body]);
    await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({
        name: "Operador referencias",
        email: "references@example.test",
        password: "Synthetic-operator-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const operator = await signedIn(
      app,
      "references@example.test",
      "Synthetic-operator-2026!",
    );
    await operator.agent.get("/api/regulatory-actors").expect(200);
    await operator.agent.get("/api/workshop").expect(200);
    await operator.agent
      .post("/api/regulatory-actors")
      .set(operator.headers)
      .send({ type: "CRPC", code: "X", name: "No autorizado" })
      .expect(403);
    await operator.agent
      .patch("/api/workshop")
      .set(operator.headers)
      .send({ name: "No autorizado" })
      .expect(403);
    await admin.agent
      .post("/api/regulatory-actors")
      .set(admin.headers)
      .send({
        type: "CRPC",
        code: "INVALID",
        name: "CUIT incorrecto",
        cuit: "20123456789",
      })
      .expect(400);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toContainEqual(
      expect.objectContaining({
        action: "ACTOR_REGULATORIO_ACTUALIZADO",
        entityId: created.body.id,
      }),
    );
  });
  it("conserva capacidad decimal y referencias editables, valida su tipo y resuelve duplicados concurrentes", async () => {
    const admin = await signedIn(app);
    const input = {
      type: "CILINDRO",
      homologationCode: " cil-001 ",
      brand: "Marca sintética",
      capacityLiters: "60.50",
    };
    const responses = await Promise.all(
      [0, 1].map(() =>
        admin.agent
          .post("/api/component-models")
          .set(admin.headers)
          .send(input),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const model = responses.find((response) => response.status === 201)!.body;
    expect(model).toMatchObject({
      homologationCode: "CIL-001",
      capacityLiters: "60.50",
    });
    await admin.agent
      .patch(`/api/component-models/${model.id}`)
      .set(admin.headers)
      .send({ type: "VALVULA" })
      .expect(400);
    const updated = await admin.agent
      .patch(`/api/component-models/${model.id}`)
      .set(admin.headers)
      .send({
        type: "VALVULA",
        capacityLiters: null,
        brand: null,
        active: false,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      type: "VALVULA",
      capacityLiters: null,
      brand: null,
      active: false,
    });
    const found = await admin.agent
      .get("/api/component-models?type=VALVULA&q=cil-001&active=false")
      .expect(200);
    expect(found.body.items).toEqual([updated.body]);
    for (const capacityLiters of ["0", "-1", "1.001", "100000", 60.5]) {
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({ ...input, homologationCode: "INVALID", capacityLiters })
        .expect(400);
    }
    await admin.agent
      .post("/api/component-models")
      .set(admin.headers)
      .send({ ...input, active: null })
      .expect(400);
    await admin.agent
      .post("/api/component-models")
      .set(admin.headers)
      .send({ ...input, unexpected: true })
      .expect(400);
    await admin.agent.get("/api/component-models?limit=1000").expect(400);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toContainEqual(
      expect.objectContaining({
        action: "MODELO_COMPONENTE_ACTUALIZADO",
        entityId: model.id,
      }),
    );
  });
  it("conserva el TdM desactivado ya elegido al editar otros datos y exige una referencia activa para cambiarlo", async () => {
    const admin = await signedIn(app);
    const tdm = (
      await admin.agent
        .post("/api/regulatory-actors")
        .set(admin.headers)
        .send({ type: "TDM", code: "HISTORICO", name: "TdM para conservar" })
        .expect(201)
    ).body;
    await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ name: "Taller", tdmId: tdm.id })
      .expect(200);
    await admin.agent
      .patch(`/api/regulatory-actors/${tdm.id}`)
      .set(admin.headers)
      .send({ active: false })
      .expect(200);
    await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ name: "Nombre actualizado", tdmId: tdm.id })
      .expect(200);
    await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ tdmId: null })
      .expect(200);
    await admin.agent
      .patch("/api/workshop")
      .set(admin.headers)
      .send({ tdmId: tdm.id })
      .expect(400);
    expect(
      (await admin.agent.get("/api/workshop").expect(200)).body.tdmId,
    ).toBeNull();
  });
});
