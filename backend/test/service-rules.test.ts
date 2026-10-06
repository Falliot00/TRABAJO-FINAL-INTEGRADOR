import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareComplete } from "./service-rules-fixture";

describe("M06: confirmación con reglas operativas reales por HTTP", () => {
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
  it("confirma una conversión completa con firmas manuales y oblea al fin del mes", async () => {
    const { admin, draft, cylinder, valve } = await prepareComplete(app, 301);
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check.blockers).toEqual([]);
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
    expect(confirmed).toMatchObject({
      status: "CONFIRMADO",
      pdfStatus: "PENDIENTE",
    });
    const sheet = (
      await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200)
    ).body;
    expect(sheet.snapshotVersion).toBe(2);
    expect(sheet.content.cilindros).toEqual([
      expect.objectContaining({
        componenteId: cylinder.id,
        valvula: expect.objectContaining({ componenteId: valve.id }),
      }),
    ]);
    const history = (
      await admin.agent.get(`/api/components/${valve.id}/history`).expect(200)
    ).body;
    expect(history.cylinderValveLinks).toEqual([
      expect.objectContaining({
        cylinderId: cylinder.id,
        valveId: valve.id,
        validUntil: null,
      }),
    ]);
    expect(sheet.content.revisionesPH).toEqual([
      expect.objectContaining({
        fechaEnsayo: "2026-10",
        numeroCertificado: null,
      }),
    ]);
    expect(sheet.content.habilitacion).toMatchObject({
      fecha: "2026-10-02",
      vencimiento: "2027-10-31",
    });
  });
  it("bloquea marcas MSDB y parejas incompletas sin producir efectos", async () => {
    const fixture = await prepareComplete(app, 302);
    const { admin, valve } = fixture;
    let draft = fixture.draft;
    for (const invalid of [
      { cylinderId: null },
      { action: "S" },
      { finalPosition: null },
    ]) {
      draft = (
        await admin.agent
          .patch(`/api/service-drafts/${draft.id}`)
          .set(admin.headers)
          .send({
            version: draft.version,
            interventions: fixture.draft.interventions.map((row) =>
              row.componentId === valve.id ? { ...row, ...invalid } : row,
            ),
          })
          .expect(200)
      ).body;
      const check = (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body;
      expect(check.blockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "CONFIGURACION_INCONSISTENTE" }),
        ]),
      );
      await admin.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(admin.headers)
        .send({
          version: draft.version,
          expectedConfigurationId: null,
          idempotencyKey: randomUUID(),
        })
        .expect(409);
    }
    expect(
      (await admin.agent.get(`/api/components/${valve.id}/history`).expect(200))
        .body.movements,
    ).toEqual([]);
  });

  it("contrasta vencimientos y matriz PH con hechos verificables, conservando el borrador", async () => {
    const fixture = await prepareComplete(app, 303);
    const { admin } = fixture;
    let draft = fixture.draft;
    const cases = [
      {
        preparation: { ...fixture.draft.preparation, expiresOn: "2027-10-02" },
        code: "VENCIMIENTO_OBLEA",
      },
      {
        preparation: { ...fixture.draft.preparation, enabledOn: "2026-10-01" },
        code: "HABILITACION_FECHA",
      },
      {
        preparation: {
          ...fixture.draft.preparation,
          previousSticker: fixture.draft.preparation!.newSticker,
        },
        code: "OBLEA_NUEVA_REQUERIDA",
      },
      {
        type: "OTRO",
        sheetOperation: "M",
        phReason: "VENCIMIENTO",
        code: "OPERACION_PH",
      },
      {
        interventions: fixture.draft.interventions.map((row) =>
          row.performsPh ? { ...row, revisionExpiresOn: "2031-10-01" } : row,
        ),
        code: "VENCIMIENTO_PH",
      },
      {
        interventions: fixture.draft.interventions.map((row) =>
          row.performsPh ? { ...row, testDate: "2026-11" } : row,
        ),
        code: "FECHA_PH",
      },
    ];
    for (const { code, ...input } of cases) {
      draft = (
        await admin.agent
          .patch(`/api/service-drafts/${draft.id}`)
          .set(admin.headers)
          .send({
            version: draft.version,
            type: "CONVERSION",
            sheetOperation: "C",
            phReason: "CONVERSION",
            preparation: fixture.draft.preparation,
            interventions: fixture.draft.interventions,
            ...input,
          })
          .expect(200)
      ).body;
      const check = (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body;
      expect(check.blockers).toEqual(
        expect.arrayContaining([expect.objectContaining({ code })]),
      );
    }
  });
});
