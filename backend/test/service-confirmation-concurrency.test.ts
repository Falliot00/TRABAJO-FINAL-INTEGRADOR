import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import request from "supertest";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { signedIn } from "./session";
import {
  prepareConfirmation,
  syntheticRegulatoryValidation,
} from "./service-confirmation-fixture";

describe("Integridad transaccional de la confirmación por HTTP", () => {
  let app: INestApplication;
  let dispose: () => Promise<void>;
  let databaseUrl: string;
  beforeAll(async () => {
    const database = await prepareTestDatabase();
    dispose = database.dispose;
    databaseUrl = database.url;
    app = await createApplication(
      {
        ...process.env,
        NODE_ENV: "test",
        APP_ORIGIN: "http://localhost:5173",
        DATABASE_URL: database.url,
      },
      { regulatoryValidation: syntheticRegulatoryValidation },
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await dispose?.();
  });

  it("impide instalar el mismo componente en dos vehículos mediante confirmaciones simultáneas", async () => {
    const first = await prepareConfirmation(app, 101);
    const second = await prepareConfirmation(app, 102, first.component);
    const results = await Promise.all(
      [first, second].map(({ admin, draft }) =>
        admin.agent
          .post(`/api/service-drafts/${draft.id}/confirm`)
          .set(admin.headers)
          .send({
            version: draft.version,
            idempotencyKey: randomUUID(),
            expectedConfigurationId: null,
          }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    const winnerIndex = results.findIndex((result) => result.status === 201);
    const winner = [first, second][winnerIndex]!;
    const loser = [first, second][1 - winnerIndex]!;
    const installed = (
      await winner.admin.agent
        .get(`/api/vehicles/${winner.vehicleId}/configurations`)
        .expect(200)
    ).body;
    expect(installed.configurations).toHaveLength(1);
    expect(installed.configurations[0]).toMatchObject({
      serviceId: winner.draft.id,
      validUntil: null,
      components: [
        { componentId: first.component.id, type: "CILINDRO", position: 1 },
        { componentId: winner.regulator.id, type: "REGULADOR", position: 1 },
        {
          componentId: winner.valve.id,
          type: "VALVULA",
          position: 1,
          cylinderId: first.component.id,
        },
      ],
    });
    expect(
      (
        await loser.admin.agent
          .get(`/api/vehicles/${loser.vehicleId}/configurations`)
          .expect(200)
      ).body.configurations,
    ).toEqual([]);
    expect(
      (
        await loser.admin.agent
          .get(`/api/service-drafts/${loser.draft.id}`)
          .expect(200)
      ).body,
    ).toEqual(loser.draft);
    const history = (
      await winner.admin.agent
        .get(`/api/components/${first.component.id}/history`)
        .expect(200)
    ).body;
    expect(history.movements).toHaveLength(1);
    expect(history.movements[0]).toMatchObject({
      serviceId: winner.draft.id,
      action: "INSTALAR",
    });
    expect(history.revisions).toHaveLength(1);
    expect(history.cylinderValveLinks).toHaveLength(1);
  });

  it("reintenta la misma confirmación concurrentemente sin duplicar ficha, obligación ni auditoría", async () => {
    const { admin, draft, component, supplierId } = await prepareConfirmation(
      app,
      103,
    );
    const input = {
      version: draft.version,
      idempotencyKey: randomUUID(),
      expectedConfigurationId: null,
    };
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        admin.agent
          .post(`/api/service-drafts/${draft.id}/confirm`)
          .set(admin.headers)
          .send(input),
      ),
    );
    expect(results.map((result) => result.status)).toEqual([201, 201, 201]);
    const confirmed = results[0]!.body;
    expect(results[1]!.body).toEqual(confirmed);
    expect(results[2]!.body).toEqual(confirmed);
    expect(confirmed).toMatchObject({
      id: draft.id,
      status: "CONFIRMADO",
      version: 3,
      pdfStatus: "PENDIENTE",
      totalAmount: "100.00",
    });
    expect(
      (await admin.agent.get(`/api/services/${draft.id}`).expect(200)).body,
    ).toEqual(confirmed);
    const sheet = (
      await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200)
    ).body;
    expect(sheet).toMatchObject({
      id: confirmed.sheetId,
      serviceId: draft.id,
      version: 1,
      pdfStatus: "PENDIENTE",
    });
    const obligations = (
      await admin.agent.get(`/api/services/${draft.id}/obligations`).expect(200)
    ).body.items;
    expect(obligations).toHaveLength(1);
    expect(obligations[0]).toMatchObject({
      serviceId: draft.id,
      supplierId,
      amount: "20.20",
      concept: "Costo externo histórico",
    });
    const history = (
      await admin.agent
        .get(`/api/components/${component.id}/history`)
        .expect(200)
    ).body;
    expect(history.movements).toHaveLength(1);
    expect(history.revisions).toHaveLength(1);
    expect(history.cylinderValveLinks).toHaveLength(1);
    const events = (await admin.agent.get("/api/audit?limit=100").expect(200))
      .body.items;
    expect(
      events.filter(
        (event: { action: string; entityId: string }) =>
          event.action === "SERVICIO_CONFIRMADO" && event.entityId === draft.id,
      ),
    ).toHaveLength(1);
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({ ...input, version: draft.version + 1 })
      .expect(409);
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({ ...input, idempotencyKey: randomUUID() })
      .expect(409);
    expect(
      (await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200))
        .body,
    ).toEqual(sheet);
  });

  it("revierte todos los hechos si PostgreSQL falla al commit y permite reintentar la solicitud original", async () => {
    const { admin, draft, component, vehicleId } = await prepareConfirmation(
      app,
      104,
    );
    const input = {
      version: draft.version,
      idempotencyKey: randomUUID(),
      expectedConfigurationId: null,
    };
    const schema = new URL(databaseUrl).searchParams.get("schema");
    if (!schema || !/^test_[a-f0-9]{32}$/.test(schema))
      throw new Error(
        "La inyección de fallo requiere el esquema efímero de esta prueba.",
      );
    const failure = new Client({ connectionString: databaseUrl });
    await failure.connect();
    try {
      // The database is the external failure boundary. A deferred constraint
      // rejects COMMIT, regardless of the application's internal write order.
      await failure.query(`CREATE FUNCTION "${schema}".reject_test_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.accion = 'SERVICIO_CONFIRMADO' THEN RAISE EXCEPTION 'Synthetic commit failure'; END IF;
          RETURN NEW;
        END;
      $$`);
      await failure.query(`CREATE CONSTRAINT TRIGGER reject_test_confirmation
        AFTER INSERT ON "${schema}".auditoria DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_test_confirmation()`);
      await admin.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(admin.headers)
        .send(input)
        .expect(500);
    } finally {
      await failure.query(
        `DROP TRIGGER IF EXISTS reject_test_confirmation ON "${schema}".auditoria`,
      );
      await failure.query(
        `DROP FUNCTION IF EXISTS "${schema}".reject_test_confirmation()`,
      );
      await failure.end();
    }
    expect(
      (await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200))
        .body,
    ).toEqual(draft);
    await admin.agent.get(`/api/services/${draft.id}`).expect(404);
    await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(404);
    expect(
      (
        await admin.agent
          .get(`/api/services/${draft.id}/obligations`)
          .expect(200)
      ).body.items,
    ).toEqual([]);
    expect(
      (
        await admin.agent
          .get(`/api/vehicles/${vehicleId}/configurations`)
          .expect(200)
      ).body.configurations,
    ).toEqual([]);
    expect(
      (
        await admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body,
    ).toMatchObject({ movements: [], revisions: [], cylinderValveLinks: [] });
    const events = (await admin.agent.get("/api/audit?limit=100").expect(200))
      .body.items;
    expect(
      events.filter(
        (event: { action: string; entityId: string }) =>
          event.action === "SERVICIO_CONFIRMADO" && event.entityId === draft.id,
      ),
    ).toEqual([]);
    const confirmed = (
      await admin.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(admin.headers)
        .send(input)
        .expect(201)
    ).body;
    expect(confirmed).toMatchObject({
      id: draft.id,
      status: "CONFIRMADO",
      pdfStatus: "PENDIENTE",
    });
    expect(
      (
        await admin.agent
          .get(`/api/services/${draft.id}/obligations`)
          .expect(200)
      ).body.items,
    ).toHaveLength(1);
  });

  it("permite confirmar el trabajo compartido al operador sin revelar costos y conserva la ficha frente a cambios de maestros", async () => {
    const { admin, draft, vehicleId, personId, offerId, actors } =
      await prepareConfirmation(app, 105);
    const user = (
      await admin.agent
        .post("/api/users")
        .set(admin.headers)
        .send({
          name: "Operador confirmación",
          email: "confirmation@example.test",
          password: "Synthetic-confirmation-2026!",
          role: "OPERADOR",
        })
        .expect(201)
    ).body;
    const operator = await signedIn(
      app,
      "confirmation@example.test",
      "Synthetic-confirmation-2026!",
    );
    const input = {
      version: draft.version,
      idempotencyKey: randomUUID(),
      expectedConfigurationId: null,
    };
    await operator.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .send(input)
      .expect(403);
    const confirmed = (
      await operator.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(operator.headers)
        .send(input)
        .expect(201)
    ).body;
    expect(confirmed).toMatchObject({
      createdBy: "9007199254740993",
      confirmedBy: user.id,
      totalAmount: "100.00",
    });
    expect(JSON.stringify(confirmed)).not.toMatch(
      /"costs"|"supplierId"|20\.20|Costo externo|Costo absorbido/,
    );
    expect(
      (await operator.agent.get(`/api/services/${draft.id}`).expect(200)).body,
    ).toEqual(confirmed);
    await operator.agent
      .get(`/api/services/${draft.id}/obligations`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/services/${draft.id}/sheet`)
      .expect(401);
    const sheet = (
      await operator.agent.get(`/api/services/${draft.id}/sheet`).expect(200)
    ).body;
    expect(sheet.content).toMatchObject({
      documento: { version: 1 },
      servicio: {
        id: draft.id,
        descripcion: "Conversión sintética 105",
        incluyePH: true,
      },
      titular: {
        nombreRazonSocial: "Titular sintético 105",
        documentoNumero: "45000105",
      },
      vehiculo: { dominio: "CZ105AA", marca: "Marca sintética" },
      pec: { nombre: "PEC sintético 105" },
      cilindros: [
        {
          numeroSerie: "SERIESYN105",
          fabricacionMes: "2020-01",
          revisionMes: "2026-10",
        },
      ],
      revisionesPH: [
        { resultado: "APROBADO", numeroCertificado: "CERT-SYN-105" },
      ],
    });
    expect(JSON.stringify(sheet)).not.toMatch(
      /"costs"|"supplierId"|Costo externo|Costo absorbido/,
    );
    await admin.agent
      .patch(`/api/people/${personId}`)
      .set(admin.headers)
      .send({ name: "Titular futuro" })
      .expect(200);
    await admin.agent
      .patch(`/api/vehicles/${vehicleId}`)
      .set(admin.headers)
      .send({ brand: "Marca futura" })
      .expect(200);
    await admin.agent
      .patch(`/api/regulatory-actors/${actors.PEC}`)
      .set(admin.headers)
      .send({ name: "PEC futuro" })
      .expect(200);
    await admin.agent
      .patch(`/api/catalog-services/${offerId}`)
      .set(admin.headers)
      .send({ name: "Oferta futura", suggestedPrice: "999.99", items: [] })
      .expect(200);
    await operator.agent
      .patch(`/api/service-drafts/${draft.id}`)
      .set(operator.headers)
      .send({ version: confirmed.version, notes: "Alteración posterior" })
      .expect(409);
    expect(
      (await operator.agent.get(`/api/services/${draft.id}/sheet`).expect(200))
        .body,
    ).toEqual(sheet);
    expect(
      (await operator.agent.get(`/api/services/${draft.id}`).expect(200)).body,
    ).toEqual(confirmed);
    expect(
      (
        await operator.agent
          .post(`/api/service-drafts/${draft.id}/confirm`)
          .set(operator.headers)
          .send(input)
          .expect(201)
      ).body,
    ).toEqual(confirmed);
    const obligations = (
      await admin.agent.get(`/api/services/${draft.id}/obligations`).expect(200)
    ).body.items;
    expect(obligations).toHaveLength(1);
    expect(obligations[0]).toMatchObject({ amount: "20.20" });
    const audit = (await admin.agent.get("/api/audit?limit=100").expect(200))
      .body.items;
    expect(audit).toContainEqual(
      expect.objectContaining({
        action: "SERVICIO_CONFIRMADO",
        entityId: draft.id,
        actorId: user.id,
      }),
    );
    await admin.agent
      .patch(`/api/users/${user.id}`)
      .set(admin.headers)
      .send({ active: false })
      .expect(200);
    await operator.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(operator.headers)
      .send(input)
      .expect(401);
  });
});
