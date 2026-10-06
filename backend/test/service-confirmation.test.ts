import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { signedIn } from "./session";
import { randomUUID } from "node:crypto";
import {
  prepareConfirmation,
  syntheticRegulatoryValidation,
} from "./service-confirmation-fixture";

describe("Confirmación de servicios", () => {
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
  it("mantiene editable el borrador y diagnostica los datos concretos pendientes antes de confirmar", async () => {
    const admin = await signedIn(app);
    const vehicle = (
      await admin.agent
        .post("/api/vehicles")
        .set(admin.headers)
        .send({ plate: "CN123AA", brand: "Marca", model: "Modelo", year: 2020 })
        .expect(201)
    ).body;
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          code: "CONFIRMAR",
          name: "Anual",
          description: "Anual",
          type: "REVISION_ANUAL",
          suggestedPrice: "0",
          items: [],
        })
        .expect(201)
    ).body;
    const draft = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId: vehicle.id,
          catalogOfferId: offer.id,
          serviceDate: "2026-10-02",
        })
        .expect(201)
    ).body;
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check).toMatchObject({
      serviceId: draft.id,
      version: 1,
      currentConfigurationId: null,
      canConfirm: false,
    });
    expect(check.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TITULAR_REQUERIDO" }),
        expect.objectContaining({ code: "VEHICULO_INCOMPLETO" }),
      ]),
    );
    expect(
      check.blockers.map((blocker: { code: string }) => blocker.code),
    ).not.toEqual(expect.arrayContaining(["RF-07", "RF-08"]));
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: 1,
        idempotencyKey: "02020202-0202-4020-8020-020202020202",
        expectedConfigurationId: null,
      })
      .expect(409);
    expect(
      (await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200))
        .body,
    ).toEqual(draft);
  });
});

describe("Coherencia de la configuración al confirmar", () => {
  let app: INestApplication;
  let dispose: () => Promise<void>;
  beforeAll(async () => {
    const database = await prepareTestDatabase();
    dispose = database.dispose;
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
  it("no deja instalado un cilindro rechazado aunque no se haya transcripto posición final", async () => {
    const { admin, draft, vehicleId, offerId, component } =
      await prepareConfirmation(app, 201);
    const confirmed = (
      await admin.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(admin.headers)
        .send({
          version: draft.version,
          idempotencyKey: randomUUID(),
          expectedConfigurationId: null,
        })
        .expect(201)
    ).body;
    const next = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({ vehicleId, catalogOfferId: offerId, serviceDate: "2026-10-03" })
        .expect(201)
    ).body;
    const revision = (
      await admin.agent
        .patch(`/api/service-drafts/${next.id}`)
        .set(admin.headers)
        .send({
          version: next.version,
          includesPh: true,
          sheetOperation: "R",
          totalAmount: "0",
          preparation: {
            ...draft.preparation,
            newSticker: null,
            enabledOn: null,
            expiresOn: null,
          },
          interventions: [
            {
              ...draft.interventions[0],
              finalPosition: null,
              phResult: "RECHAZADO",
              revisionExpiresOn: null,
            },
          ],
        })
        .expect(200)
    ).body;
    await admin.agent
      .post(`/api/service-drafts/${next.id}/confirm`)
      .set(admin.headers)
      .send({
        version: revision.version,
        idempotencyKey: randomUUID(),
        expectedConfigurationId: confirmed.configurationId,
      })
      .expect(409);
    expect(
      (
        await admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body.revisions,
    ).toHaveLength(1);
    expect(
      (await admin.agent.get(`/api/service-drafts/${next.id}`).expect(200))
        .body,
    ).toEqual(revision);
  });
  it("bloquea una instalación de accesorios que no puede representar en la configuración", async () => {
    const { admin, draft } = await prepareConfirmation(app, 202);
    const item = Object.fromEntries(
      Object.entries(draft.items[0]!).filter(
        ([key]) => !["amount", "catalogItemId"].includes(key),
      ),
    );
    const edited = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          items: [
            item,
            {
              order: 2,
              description: "Instalación de accesorio",
              type: "ACCESORIO",
              action: "INSTALAR",
              quantity: "1",
              unitPrice: "0",
              discount: "0",
              costs: [],
            },
          ],
        })
        .expect(200)
    ).body;
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check.blockers).toContainEqual(
      expect.objectContaining({ code: "CONFIGURACION_ACCESORIOS_PENDIENTE" }),
    );
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: edited.version,
        idempotencyKey: randomUUID(),
        expectedConfigurationId: null,
      })
      .expect(409);
  });
  it("no interpreta la ausencia de configuración registrada como equipo relevado para una revisión anual", async () => {
    const { admin, draft } = await prepareConfirmation(app, 203);
    const edited = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          type: "REVISION_ANUAL",
          sheetOperation: "R",
        })
        .expect(200)
    ).body;
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check.blockers).toContainEqual(
      expect.objectContaining({ code: "BASE_CONFIGURACION_DESCONOCIDA" }),
    );
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: edited.version,
        idempotencyKey: randomUUID(),
        expectedConfigurationId: null,
      })
      .expect(409);
  });
  it("no atribuye al vehículo un ensayo de un cilindro que sigue instalado en otro vehículo", async () => {
    const first = await prepareConfirmation(app, 204);
    await first.admin.agent
      .post(`/api/service-drafts/${first.draft.id}/confirm`)
      .set(first.admin.headers)
      .send({
        version: first.draft.version,
        idempotencyKey: randomUUID(),
        expectedConfigurationId: null,
      })
      .expect(201);
    const second = await prepareConfirmation(app, 205);
    const revision = (
      await second.admin.agent
        .patch(`/api/service-drafts/${second.draft.id}`)
        .set(second.admin.headers)
        .send({
          version: second.draft.version,
          interventions: [
            { ...second.draft.interventions[0], row: 2, performsPh: false },
            { ...first.draft.interventions[0], finalPosition: null },
          ],
        })
        .expect(200)
    ).body;
    await second.admin.agent
      .post(`/api/service-drafts/${second.draft.id}/confirm`)
      .set(second.admin.headers)
      .send({
        version: revision.version,
        idempotencyKey: randomUUID(),
        expectedConfigurationId: null,
      })
      .expect(409);
    expect(
      (
        await first.admin.agent
          .get(`/api/components/${first.component.id}/history`)
          .expect(200)
      ).body.revisions,
    ).toHaveLength(1);
  });
  it("conserva inspecciones, ensayos y mantenimiento confirmados en la historia sin convertirlos en movimientos", async () => {
    const { admin, draft, component } = await prepareConfirmation(app, 206);
    const installations = draft.items.map((item) =>
      Object.fromEntries(
        Object.entries(item).filter(
          ([key]) => !["amount", "catalogItemId"].includes(key),
        ),
      ),
    );
    const activities = [
      {
        action: "INSPECCIONAR",
        description: "Inspección de fijaciones",
        type: "INSPECCION",
      },
      {
        action: "ENSAYAR",
        description: "Ensayo del cilindro",
        type: "ENSAYO_PH",
      },
      {
        action: "MANTENER",
        description: "Mantenimiento exterior",
        type: "MANO_OBRA",
      },
    ];
    const prepared = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          items: [
            ...installations,
            ...activities.map((activity, index) => ({
              ...activity,
              order: index + installations.length + 1,
              componentId: component.id,
              quantity: "1",
              unitPrice: "0",
              discount: "0",
              costs: [],
            })),
          ],
        })
        .expect(200)
    ).body;
    expect(
      (
        await admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body.activities,
    ).toEqual([]);
    const confirmed = (
      await admin.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(admin.headers)
        .send({
          version: prepared.version,
          idempotencyKey: randomUUID(),
          expectedConfigurationId: null,
        })
        .expect(201)
    ).body;
    const history = (
      await admin.agent
        .get(`/api/components/${component.id}/history`)
        .expect(200)
    ).body;
    expect(history.activities).toEqual([
      {
        id: prepared.items[3].id,
        serviceId: draft.id,
        action: "INSPECCIONAR",
        description: "Inspección de fijaciones",
        occurredAt: confirmed.confirmedAt,
        recordedBy: "9007199254740993",
      },
      {
        id: prepared.items[4].id,
        serviceId: draft.id,
        action: "ENSAYAR",
        description: "Ensayo del cilindro",
        occurredAt: confirmed.confirmedAt,
        recordedBy: "9007199254740993",
      },
      {
        id: prepared.items[5].id,
        serviceId: draft.id,
        action: "MANTENER",
        description: "Mantenimiento exterior",
        occurredAt: confirmed.confirmedAt,
        recordedBy: "9007199254740993",
      },
    ]);
    expect(history.movements).toHaveLength(1);
    expect(history.revisions).toHaveLength(1);
  });
});
