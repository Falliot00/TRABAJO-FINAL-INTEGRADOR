import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { signedIn } from "./session";

describe("Identidad individual de componentes", () => {
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

  it("registra y recupera una identidad con ceros iniciales y fabricación mes/año, conservando su auditoría", async () => {
    const admin = await signedIn(app);
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "CILINDRO",
          homologationCode: "M04-CIL-1",
          brand: "Marca sintética",
          capacityLiters: "60.50",
        })
        .expect(201)
    ).body;
    const created = await admin.agent
      .post("/api/components")
      .set(admin.headers)
      .send({
        type: "CILINDRO",
        modelId: model.id,
        serialNumber: " 00-ab.12 ",
        manufactureMonth: "2020-02",
        notes: " Identidad registrada ",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      type: "CILINDRO",
      modelId: model.id,
      serialNumber: "00AB12",
      manufactureMonth: "2020-02",
      notes: "Identidad registrada",
      model,
    });
    expect(
      (await admin.agent.get(`/api/components/${created.body.id}`).expect(200))
        .body,
    ).toEqual(created.body);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toContainEqual(
      expect.objectContaining({
        action: "COMPONENTE_CREADO",
        entity: "componentes",
        entityId: created.body.id,
        actorId: "9007199254740993",
        result: "EXITO",
      }),
    );
  });
  it("recupera duplicados por modelo y serie normalizada, incluso ante altas concurrentes, y permite la serie en otro modelo", async () => {
    const admin = await signedIn(app);
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "VALVULA",
          homologationCode: "M04-VAL-2",
          brand: "Marca de búsqueda",
        })
        .expect(201)
    ).body;
    const input = {
      type: "VALVULA",
      modelId: model.id,
      serialNumber: " 000-42 ",
    };
    const results = await Promise.all(
      [0, 1].map(() =>
        admin.agent.post("/api/components").set(admin.headers).send(input),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    const component = results.find((result) => result.status === 201)!.body;
    expect(component.serialNumber).toBe("00042");
    expect(component.manufactureMonth).toBeNull();
    expect(
      (
        await admin.agent
          .get(
            `/api/components/duplicates?modelId=${model.id}&serialNumber=000.42`,
          )
          .expect(200)
      ).body.items,
    ).toEqual([component]);
    expect(
      (
        await admin.agent
          .get(
            `/api/components/duplicates?modelId=${model.id}&serialNumber=00042&excludeId=${component.id}`,
          )
          .expect(200)
      ).body.items,
    ).toEqual([]);
    expect(
      (
        await admin.agent
          .get("/api/components?q=000-42&type=VALVULA")
          .expect(200)
      ).body.items,
    ).toEqual([component]);
    expect(
      (await admin.agent.get("/api/components?q=búsqueda").expect(200)).body
        .items,
    ).toEqual([component]);
    const otherModel = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "REGULADOR",
          homologationCode: "M04-REG-2",
        })
        .expect(201)
    ).body;
    await admin.agent
      .post("/api/components")
      .set(admin.headers)
      .send({ ...input, type: "REGULADOR", modelId: otherModel.id })
      .expect(201);
    const firstPage = (
      await admin.agent.get("/api/components?limit=1").expect(200)
    ).body;
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = (
      await admin.agent
        .get(`/api/components?limit=1&cursor=${firstPage.nextCursor}`)
        .expect(200)
    ).body;
    expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
  });
  it("edita datos de identidad sin perder el modelo desactivado ya elegido y rechaza modelos incompatibles o duplicados", async () => {
    const admin = await signedIn(app);
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "CILINDRO",
          homologationCode: "M04-EDITABLE",
        })
        .expect(201)
    ).body;
    const input = {
      type: "CILINDRO",
      modelId: model.id,
      serialNumber: "000100",
      manufactureMonth: "2021-12",
      notes: "Antes",
    };
    const component = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send(input)
        .expect(201)
    ).body;
    await admin.agent
      .patch(`/api/component-models/${model.id}`)
      .set(admin.headers)
      .send({ active: false })
      .expect(200);
    const updated = (
      await admin.agent
        .patch(`/api/components/${component.id}`)
        .set(admin.headers)
        .send({
          modelId: model.id,
          type: "CILINDRO",
          serialNumber: "000101",
          manufactureMonth: null,
          notes: null,
        })
        .expect(200)
    ).body;
    expect(updated).toMatchObject({
      id: component.id,
      modelId: model.id,
      serialNumber: "000101",
      manufactureMonth: null,
      notes: null,
      model: { active: false },
    });
    await admin.agent
      .post("/api/components")
      .set(admin.headers)
      .send({ ...input, serialNumber: "NEW" })
      .expect(400);
    await admin.agent
      .patch(`/api/component-models/${model.id}`)
      .set(admin.headers)
      .send({ type: "REGULADOR" })
      .expect(409);
    await admin.agent
      .patch(`/api/components/${component.id}`)
      .set(admin.headers)
      .send({ type: "VALVULA" })
      .expect(400);
    const otherModel = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "VALVULA",
          homologationCode: "M04-CORRECCION",
        })
        .expect(201)
    ).body;
    await admin.agent
      .patch(`/api/components/${component.id}`)
      .set(admin.headers)
      .send({ modelId: otherModel.id })
      .expect(400);
    const corrected = (
      await admin.agent
        .patch(`/api/components/${component.id}`)
        .set(admin.headers)
        .send({
          modelId: otherModel.id,
          type: "VALVULA",
          manufactureMonth: "2019-03",
        })
        .expect(200)
    ).body;
    expect(corrected).toMatchObject({
      id: component.id,
      type: "VALVULA",
      modelId: otherModel.id,
      manufactureMonth: "2019-03",
    });
    await admin.agent
      .patch(`/api/components/${component.id}`)
      .set(admin.headers)
      .send({ modelId: model.id, type: "CILINDRO" })
      .expect(400);
    const duplicate = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send({
          type: "VALVULA",
          modelId: otherModel.id,
          serialNumber: "OTHER",
        })
        .expect(201)
    ).body;
    await admin.agent
      .patch(`/api/components/${duplicate.id}`)
      .set(admin.headers)
      .send({ serialNumber: "000-101" })
      .expect(409);
    expect(
      (await admin.agent.get(`/api/components/${duplicate.id}`).expect(200))
        .body.serialNumber,
    ).toBe("OTHER");
    const audit = (await admin.agent.get("/api/audit?limit=100").expect(200))
      .body.items;
    expect(
      audit.filter(
        (event: { action: string; entityId: string }) =>
          event.action === "COMPONENTE_ACTUALIZADO" &&
          event.entityId === component.id,
      ),
    ).toHaveLength(2);
    expect(
      audit.filter(
        (event: { action: string; entityId: string }) =>
          event.action === "COMPONENTE_ACTUALIZADO" &&
          event.entityId === duplicate.id,
      ),
    ).toHaveLength(0);
  });
  it("rechaza identidades inválidas, fechas completas y escrituras de estado técnico fuera de la confirmación", async () => {
    const admin = await signedIn(app);
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "REGULADOR",
          homologationCode: "M04-INVALIDOS",
        })
        .expect(201)
    ).body;
    const input = {
      type: "REGULADOR",
      modelId: model.id,
      serialNumber: "VALID-123",
    };
    for (const changed of [
      { manufactureMonth: "2020-02-01" },
      { manufactureMonth: "2020-13" },
      { manufactureMonth: "0000-01" },
      { manufactureMonth: 202002 },
      { type: "CILINDRO" },
      { modelId: "9223372036854775807" },
      { modelId: null },
      { serialNumber: 123 },
      { serialNumber: " - . " },
      { serialNumber: null },
      { vehicleId: "1" },
      { decommissionDate: "2026-10-02" },
      { active: false },
    ]) {
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send({ ...input, ...changed })
        .expect(400);
    }
    expect(
      (await admin.agent.get("/api/components?q=VALID123").expect(200)).body
        .items,
    ).toEqual([]);
    const component = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send(input)
        .expect(201)
    ).body;
    for (const changed of [
      { modelId: null },
      { type: null },
      { serialNumber: null },
      { vehicleId: "1" },
      { decommissionDate: "2026-10-02" },
      { manufactureMonth: "2021-02-01" },
    ]) {
      await admin.agent
        .patch(`/api/components/${component.id}`)
        .set(admin.headers)
        .send(changed)
        .expect(400);
    }
    expect(
      (await admin.agent.get(`/api/components/${component.id}`).expect(200))
        .body,
    ).toEqual(component);
    for (const query of [
      "type=OTRO",
      "limit=1000",
      "active=true",
      "vehicleId=1",
    ]) {
      await admin.agent.get(`/api/components?${query}`).expect(400);
    }
    await admin.agent.get("/api/components/9223372036854775807").expect(404);
    await admin.agent
      .patch("/api/components/9223372036854775807")
      .set(admin.headers)
      .send({ notes: "Ausente" })
      .expect(404);
  });

  it("permite al operador gestionar identidades con CSRF y consultar el límite explícito de historia/configuraciones sin modificarlas", async () => {
    const admin = await signedIn(app);
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "VALVULA",
          homologationCode: "M04-OPERADOR",
        })
        .expect(201)
    ).body;
    const vehicle = (
      await admin.agent
        .post("/api/vehicles")
        .set(admin.headers)
        .send({
          plate: "AB004CD",
          brand: "Sintética",
          model: "Base",
          year: 2020,
        })
        .expect(201)
    ).body;
    await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({
        name: "Operador componentes",
        email: "components@example.test",
        password: "Synthetic-components-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const operator = await signedIn(
      app,
      "components@example.test",
      "Synthetic-components-2026!",
    );
    const input = {
      type: "VALVULA",
      modelId: model.id,
      serialNumber: "OP-004",
    };
    await request(app.getHttpServer()).get("/api/components").expect(401);
    await operator.agent.post("/api/components").send(input).expect(403);
    const component = (
      await operator.agent
        .post("/api/components")
        .set(operator.headers)
        .send(input)
        .expect(201)
    ).body;
    await operator.agent
      .patch(`/api/components/${component.id}`)
      .send({ notes: "Sin CSRF" })
      .expect(403);
    await operator.agent
      .patch(`/api/components/${component.id}`)
      .set(operator.headers)
      .send({ notes: "Corrección de identidad" })
      .expect(200);
    await operator.agent.get("/api/components").expect(200);
    const history = (
      await operator.agent
        .get(`/api/components/${component.id}/history`)
        .expect(200)
    ).body;
    expect(history).toEqual({
      componentId: component.id,
      available: true,
      message: expect.stringMatching(/Historia técnica/i),
      activities: [],
      movements: [],
      revisions: [],
      cylinderValveLinks: [],
      initialSurveys: [],
    });
    const configurations = (
      await operator.agent
        .get(`/api/vehicles/${vehicle.id}/configurations`)
        .expect(200)
    ).body;
    expect(configurations).toEqual({
      vehicleId: vehicle.id,
      available: true,
      message: expect.stringMatching(/no hay configuraciones confirmadas/i),
      currentConfigurationId: null,
      configurations: [],
      canRegisterInitialSurvey: true,
    });
    await request(app.getHttpServer())
      .get(`/api/components/${component.id}/history`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/vehicles/${vehicle.id}/configurations`)
      .expect(401);
    await operator.agent
      .get("/api/components/9223372036854775807/history")
      .expect(404);
    await operator.agent
      .get("/api/vehicles/9223372036854775807/configurations")
      .expect(404);
    await operator.agent
      .post(`/api/vehicles/${vehicle.id}/configurations`)
      .set(operator.headers)
      .send({ components: [component.id] })
      .expect(404);
    await operator.agent
      .patch(`/api/vehicles/${vehicle.id}/configurations`)
      .set(operator.headers)
      .send({ components: [component.id] })
      .expect(404);
    await operator.agent
      .post(`/api/components/${component.id}/installations`)
      .set(operator.headers)
      .send({ vehicleId: vehicle.id })
      .expect(404);
    expect(
      (
        await operator.agent
          .get(`/api/vehicles/${vehicle.id}/configurations`)
          .expect(200)
      ).body,
    ).toEqual(configurations);
    expect(
      (
        await operator.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body,
    ).toEqual(history);
    const audit = (await admin.agent.get("/api/audit?limit=100").expect(200))
      .body.items;
    expect(audit).toContainEqual(
      expect.objectContaining({
        action: "COMPONENTE_ACTUALIZADO",
        entityId: component.id,
        actorId: expect.any(String),
      }),
    );
  });
});
