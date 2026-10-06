import type { INestApplication } from "@nestjs/common";
import type {
  InitialEquipmentSurveyInput,
  ServiceDraft,
} from "@cilgas/contracts";
import { randomUUID } from "node:crypto";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareConfirmation } from "./service-confirmation-fixture";

async function surveyedDraft(
  app: INestApplication,
  number: number,
  ph?: InitialEquipmentSurveyInput["pairs"][number]["ph"],
) {
  const fixture = await prepareConfirmation(app, number);
  const { admin, vehicleId, component, regulator, valve, actors } = fixture;
  const input: InitialEquipmentSurveyInput = {
    idempotencyKey: randomUUID(),
    regulatorId: regulator.id,
    pairs: [
      {
        position: 1,
        cylinderId: component.id,
        valveId: valve.id,
        ph: {
          testDate: "2024-09",
          expiresOn: "2029-09-30",
          crpcId: actors.CRPC,
          result: "APROBADO",
          ...ph,
        },
      },
    ],
    sticker: {
      number: `ANT${number}`,
      enabledOn: "2025-11-05",
      expiresOn: "2026-11-30",
    },
  };
  const survey = (
    await admin.agent
      .post(`/api/vehicles/${vehicleId}/configurations/initial-survey`)
      .set(admin.headers)
      .send(input)
      .expect(201)
  ).body;
  const draft = (
    await admin.agent
      .patch(`/api/service-drafts/${fixture.draft.id}`)
      .set(admin.headers)
      .send({
        version: fixture.draft.version,
        type: "REVISION_ANUAL",
        sheetOperation: "R",
        includesPh: false,
        phReason: null,
        items: fixture.draft.items.map((item) => ({
          order: item.order,
          description: item.description,
          type: item.type,
          componentId: item.componentId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          action: "INSPECCIONAR",
          costs: [],
        })),
        interventions: fixture.draft.interventions.map((row) => ({
          ...row,
          action: row.type === "REGULADOR" ? null : "S",
          performsPh: false,
          testDate: null,
          revisionMonth: null,
          revisionExpiresOn: null,
          crpcId: null,
          phResult: null,
          certificateNumber: null,
        })),
      })
      .expect(200)
  ).body as ServiceDraft;
  return { ...fixture, draft, survey, input };
}

describe("Relevamiento inicial como base de M06 por HTTP", () => {
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

  it("deriva la vigencia anterior desde una PH aprobada de mes conocido al confirmar otra PH por modificación", async () => {
    const { admin, draft, survey, actors } = await surveyedDraft(app, 617, {
      expiresOn: null,
    });
    const changed = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          type: "MODIFICACION",
          sheetOperation: "M",
          includesPh: true,
          phReason: "MODIFICACION",
          interventions: draft.interventions.map((row) =>
            row.type === "CILINDRO"
              ? {
                  ...row,
                  performsPh: true,
                  testDate: "2026-10",
                  phResult: "APROBADO",
                  revisionExpiresOn: "2031-10-31",
                  crpcId: actors.CRPC,
                }
              : row,
          ),
        })
        .expect(200)
    ).body as ServiceDraft;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body.blockers,
    ).toEqual([]);
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: changed.version,
        expectedConfigurationId: survey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    expect(
      (await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200))
        .body.content.revisionesPH,
    ).toEqual([
      expect.objectContaining({
        fechaEnsayo: "2026-10",
        venceEl: "2031-10-31",
        resultado: "APROBADO",
      }),
    ]);
  });

  it("exige una oblea nueva distinta del antecedente aun cuando completa el número anterior automáticamente", async () => {
    const { admin, draft, survey } = await surveyedDraft(app, 616);
    const changed = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          preparation: { ...draft.preparation, newSticker: "ANT616" },
        })
        .expect(200)
    ).body as ServiceDraft;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body,
    ).toMatchObject({
      canConfirm: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: "OBLEA_NUEVA_REQUERIDA" }),
      ]),
    });
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: changed.version,
        expectedConfigurationId: survey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(409);
  });

  it("confirma R desde el equipo relevado y congela sus antecedentes conocidos sin inventar PH", async () => {
    const { admin, draft, survey, vehicleId, component, actors } =
      await surveyedDraft(app, 610);
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check).toMatchObject({
      canConfirm: true,
      blockers: [],
      currentConfigurationId: survey.configurationId,
    });
    const confirmed = (
      await admin.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(admin.headers)
        .send({
          version: draft.version,
          expectedConfigurationId: survey.configurationId,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body;
    expect(confirmed.configurationId).toBe(survey.configurationId);
    const sheet = (
      await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200)
    ).body;
    expect(sheet.content).toMatchObject({
      habilitacion: { obleaAnterior: "ANT610" },
      cilindros: [{ revisionMes: "2024-09", crpcCodigo: "SYN-CRPC-610" }],
      revisionesPH: [],
    });
    expect(
      (
        await admin.agent
          .get(`/api/vehicles/${vehicleId}/configurations`)
          .expect(200)
      ).body.configurations,
    ).toHaveLength(1);
    expect(
      (
        await admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body,
    ).toMatchObject({ revisions: [], movements: [] });
    await admin.agent
      .patch(`/api/regulatory-actors/${actors.CRPC}`)
      .set(admin.headers)
      .send({ code: "FUTURO610" })
      .expect(200);
    expect(
      (await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200))
        .body,
    ).toEqual(sheet);
  });
  it("conserva el resultado de PH desconocido y bloquea la habilitación sin presumir aprobación", async () => {
    const { admin, draft, survey, component } = await surveyedDraft(app, 611, {
      result: null,
    });
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check).toMatchObject({
      canConfirm: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: "PH_ANTECEDENTE_REQUERIDO" }),
      ]),
    });
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: draft.version,
        expectedConfigurationId: survey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(409);
    expect(
      (
        await admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body,
    ).toMatchObject({
      revisions: [],
      movements: [],
      initialSurveys: [{ ph: { result: null, testDate: "2024-09" } }],
    });
  });
  it("confirma un recambio M y conserva el relevamiento como origen histórico e idempotente", async () => {
    const { admin, draft, survey, input, vehicleId, component, valve } =
      await surveyedDraft(app, 612);
    const replacement = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send({
          modelId: valve.modelId,
          type: "VALVULA",
          serialNumber: "RECAMBIO612",
        })
        .expect(201)
    ).body;
    const changed = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          type: "MODIFICACION",
          sheetOperation: "M",
          items: [
            {
              order: 1,
              description: "Recambio válvula",
              type: "COMPONENTE",
              componentId: valve.id,
              action: "RETIRAR",
              quantity: "1",
              unitPrice: "100",
              discount: "0",
              costs: [],
            },
            {
              order: 2,
              description: "Válvula nueva",
              type: "COMPONENTE",
              componentId: replacement.id,
              action: "INSTALAR",
              quantity: "1",
              unitPrice: "0",
              discount: "0",
              costs: [],
            },
          ],
          interventions: [
            ...draft.interventions.filter((row) => row.type !== "VALVULA"),
            {
              ...draft.interventions.find((row) => row.type === "VALVULA"),
              row: 2,
              action: "D",
              finalPosition: null,
            },
            {
              type: "VALVULA",
              row: 1,
              componentId: replacement.id,
              cylinderId: component.id,
              homologationCode: replacement.model.homologationCode,
              serialNumber: replacement.serialNumber,
              action: "M",
              finalPosition: 1,
              performsPh: false,
            },
          ],
        })
        .expect(200)
    ).body as ServiceDraft;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body.blockers,
    ).toEqual([]);
    const result = (
      await admin.agent
        .post(`/api/service-drafts/${draft.id}/confirm`)
        .set(admin.headers)
        .send({
          version: changed.version,
          expectedConfigurationId: survey.configurationId,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body;
    expect(result.configurationId).not.toBe(survey.configurationId);
    const configurations = (
      await admin.agent
        .get(`/api/vehicles/${vehicleId}/configurations`)
        .expect(200)
    ).body;
    expect(configurations.configurations).toHaveLength(2);
    expect(configurations.configurations[1]).toMatchObject({
      serviceId: null,
      initialSurvey: survey,
      validUntil: result.confirmedAt,
    });
    expect(
      (
        await admin.agent
          .post(`/api/vehicles/${vehicleId}/configurations/initial-survey`)
          .set(admin.headers)
          .send(input)
          .expect(201)
      ).body,
    ).toEqual(survey);
    expect(
      (await admin.agent.get(`/api/components/${valve.id}/history`).expect(200))
        .body.movements,
    ).toEqual([
      expect.objectContaining({ action: "RETIRAR", serviceId: draft.id }),
    ]);
  });
  it("la PH y oblea reales posteriores reemplazan los antecedentes al confirmar otra revisión", async () => {
    const fixture = await surveyedDraft(app, 613, { result: null });
    const { admin, survey, vehicleId, component, actors } = fixture;
    const tested = (
      await admin.agent
        .patch(`/api/service-drafts/${fixture.draft.id}`)
        .set(admin.headers)
        .send({
          version: fixture.draft.version,
          type: "REVISION_QUINQUENAL",
          includesPh: true,
          phReason: "SERVICIO_PH",
          interventions: fixture.draft.interventions.map((row) =>
            row.type === "CILINDRO"
              ? {
                  ...row,
                  performsPh: true,
                  testDate: "2026-10-01",
                  revisionExpiresOn: "2031-10-31",
                  phResult: "APROBADO",
                  crpcId: actors.CRPC,
                }
              : row,
          ),
        })
        .expect(200)
    ).body as ServiceDraft;
    await admin.agent
      .post(`/api/service-drafts/${tested.id}/confirm`)
      .set(admin.headers)
      .send({
        version: tested.version,
        expectedConfigurationId: survey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    const next = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId,
          catalogOfferId: fixture.offerId,
          serviceDate: "2026-10-03",
        })
        .expect(201)
    ).body as ServiceDraft;
    const changed = (
      await admin.agent
        .patch(`/api/service-drafts/${next.id}`)
        .set(admin.headers)
        .send({
          version: next.version,
          type: "REVISION_ANUAL",
          sheetOperation: "R",
          includesPh: false,
          phReason: null,
          totalAmount: "0",
          people: [{ role: "TITULAR", personId: fixture.personId }],
          items: [],
          preparation: {
            pecId: actors.PEC,
            tdmId: actors.TDM,
            newSticker: "POST613",
            enabledOn: "2026-10-03",
            expiresOn: "2027-10-31",
          },
          interventions: fixture.draft.interventions,
        })
        .expect(200)
    ).body as ServiceDraft;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${next.id}/confirmation-check`)
          .expect(200)
      ).body.blockers,
    ).toEqual([]);
    await admin.agent
      .post(`/api/service-drafts/${next.id}/confirm`)
      .set(admin.headers)
      .send({
        version: changed.version,
        expectedConfigurationId: survey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    expect(
      (await admin.agent.get(`/api/services/${next.id}/sheet`).expect(200)).body
        .content,
    ).toMatchObject({
      habilitacion: { obleaAnterior: "OBLEA-SYN-613" },
      cilindros: [{ revisionMes: "2026-10", crpcCodigo: "SYN-CRPC-613" }],
      revisionesPH: [],
    });
    expect(
      (
        await admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body.revisions,
    ).toEqual([
      expect.objectContaining({
        serviceId: tested.id,
        testDate: "2026-10-01",
        result: "APROBADO",
      }),
    ]);
  });
});
