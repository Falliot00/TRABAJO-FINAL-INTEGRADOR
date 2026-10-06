import type { INestApplication } from "@nestjs/common";
import type {
  Component,
  ServiceDraft,
  ServiceInterventionInput,
  UpdateServiceDraftRequest,
} from "@cilgas/contracts";
import { randomUUID } from "node:crypto";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareConfirmation } from "./service-confirmation-fixture";

type Fixture = Awaited<ReturnType<typeof prepareConfirmation>>;
const documented = (
  component: Component,
  position: number,
  data: Partial<ServiceInterventionInput> = {},
): ServiceInterventionInput => ({
  type: component.type,
  row: position,
  componentId: component.id,
  homologationCode: component.model.homologationCode,
  serialNumber: component.serialNumber,
  condition: "USADO",
  manufactureMonth: component.manufactureMonth,
  action: component.type === "REGULADOR" ? null : "S",
  finalPosition: position,
  performsPh: false,
  ...data,
});
async function work(
  fixture: Fixture,
  changes: Partial<UpdateServiceDraftRequest>,
  day = "2026-10-02",
) {
  const { admin, vehicleId, offerId, personId, actors } = fixture;
  const draft = (
    await admin.agent
      .post("/api/service-drafts")
      .set(admin.headers)
      .send({ vehicleId, catalogOfferId: offerId, serviceDate: day })
      .expect(201)
  ).body as ServiceDraft;
  return (
    await admin.agent
      .patch(`/api/service-drafts/${draft.id}`)
      .set(admin.headers)
      .send({
        version: draft.version,
        type: "REVISION_ANUAL",
        sheetOperation: "R",
        includesPh: false,
        phReason: null,
        totalAmount: "0",
        people: [{ role: "TITULAR", personId }],
        items: [],
        preparation: {
          pecId: actors.PEC,
          tdmId: actors.TDM,
          newSticker: randomUUID(),
          enabledOn: day,
          expiresOn: "2027-10-31",
        },
        interventions: [
          documented(fixture.component, 1),
          documented(fixture.regulator, 1),
          documented(fixture.valve, 1, { cylinderId: fixture.component.id }),
        ],
        ...changes,
      })
      .expect(200)
  ).body as ServiceDraft;
}
async function confirm(
  fixture: Fixture,
  draft: ServiceDraft,
  expectedConfigurationId: string | null,
) {
  expect(
    (
      await fixture.admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body.blockers,
  ).toEqual([]);
  return (
    await fixture.admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(fixture.admin.headers)
      .send({
        version: draft.version,
        expectedConfigurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(201)
  ).body;
}
const actionItem = (
  component: Component,
  order: number,
  action: "INSTALAR" | "RETIRAR",
) => ({
  order,
  description: `${action} ${component.type}`,
  type: "COMPONENTE" as const,
  componentId: component.id,
  action,
  quantity: "1",
  unitPrice: "0",
  discount: "0",
  costs: [],
});

describe("Precedencia de antecedentes y hechos técnicos por HTTP", () => {
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

  it("un antecedente sin fecha entre relevamientos fechados no permite ocultar el rechazo con una aprobación antigua", async () => {
    const first = await prepareConfirmation(app, 627);
    let fixture = first;
    const facts = [
      { testDate: "2026-09", result: "RECHAZADO", expiresOn: null },
      { testDate: null, result: null, expiresOn: null },
      { testDate: "2024-09", result: "APROBADO", expiresOn: "2029-09-30" },
    ];
    for (let index = 0; index < facts.length; index += 1) {
      if (index)
        fixture = await prepareConfirmation(app, 627 + index, first.component);
      const { admin, vehicleId, component, regulator, valve, actors } = fixture;
      const survey = (
        await admin.agent
          .post(`/api/vehicles/${vehicleId}/configurations/initial-survey`)
          .set(admin.headers)
          .send({
            idempotencyKey: randomUUID(),
            regulatorId: regulator.id,
            pairs: [
              {
                position: 1,
                cylinderId: component.id,
                valveId: valve.id,
                ph: { ...facts[index], crpcId: actors.CRPC },
              },
            ],
          })
          .expect(201)
      ).body;
      if (index === facts.length - 1) {
        const blocked = await work(fixture, {});
        expect(
          (
            await admin.agent
              .get(`/api/service-drafts/${blocked.id}/confirmation-check`)
              .expect(200)
          ).body.canConfirm,
        ).toBe(false);
        await admin.agent
          .post(`/api/service-drafts/${blocked.id}/confirm`)
          .set(admin.headers)
          .send({
            version: blocked.version,
            expectedConfigurationId: survey.configurationId,
            idempotencyKey: randomUUID(),
          })
          .expect(409);
      } else {
        const components = [component, regulator, valve];
        const retired = await work(fixture, {
          type: "DESMONTAJE",
          sheetOperation: "D",
          preparation: { pecId: actors.PEC, tdmId: actors.TDM },
          items: components.map((item, i) =>
            actionItem(item, i + 1, "RETIRAR"),
          ),
          interventions: components.map((item) =>
            documented(item, 1, {
              action: "D",
              finalPosition: null,
              cylinderId: item.type === "VALVULA" ? component.id : null,
            }),
          ),
        });
        await confirm(fixture, retired, survey.configurationId);
      }
    }
  });
  it("un rechazo relevado después de una PH real del mismo día mantiene bloqueada la habilitación", async () => {
    const original = await prepareConfirmation(app, 632);
    const first = await confirm(original, original.draft, null);
    const components = [original.component, original.regulator, original.valve];
    const retired = await work(original, {
      type: "DESMONTAJE",
      sheetOperation: "D",
      preparation: { pecId: original.actors.PEC, tdmId: original.actors.TDM },
      items: components.map((item, index) =>
        actionItem(item, index + 1, "RETIRAR"),
      ),
      interventions: components.map((item) =>
        documented(item, 1, {
          action: "D",
          finalPosition: null,
          cylinderId: item.type === "VALVULA" ? original.component.id : null,
        }),
      ),
    });
    await confirm(original, retired, first.configurationId);
    const moved = await prepareConfirmation(app, 633, original.component);
    const survey = (
      await moved.admin.agent
        .post(`/api/vehicles/${moved.vehicleId}/configurations/initial-survey`)
        .set(moved.admin.headers)
        .send({
          idempotencyKey: randomUUID(),
          regulatorId: moved.regulator.id,
          pairs: [
            {
              position: 1,
              cylinderId: original.component.id,
              valveId: moved.valve.id,
              ph: {
                testDate: "2026-10-01",
                crpcId: moved.actors.CRPC,
                result: "RECHAZADO",
              },
            },
          ],
        })
        .expect(201)
    ).body;
    const blocked = await work(moved, {});
    expect(
      (
        await moved.admin.agent
          .get(`/api/service-drafts/${blocked.id}/confirmation-check`)
          .expect(200)
      ).body,
    ).toMatchObject({
      canConfirm: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: "ANTECEDENTE_PH_INCONSISTENTE" }),
      ]),
    });
    await moved.admin.agent
      .post(`/api/service-drafts/${blocked.id}/confirm`)
      .set(moved.admin.headers)
      .send({
        version: blocked.version,
        expectedConfigurationId: survey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(409);
  });

  it("un relevamiento mensual posterior no oculta un rechazo real y una PH real aprobada posterior lo supera", async () => {
    const original = await prepareConfirmation(app, 620);
    const { admin, component, regulator, valve, actors, vehicleId } = original;
    const spareCylinder = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send({
          modelId: component.modelId,
          type: "CILINDRO",
          serialNumber: "SPARE620",
          manufactureMonth: "2020-01",
        })
        .expect(201)
    ).body as Component;
    const spareValve = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send({
          modelId: valve.modelId,
          type: "VALVULA",
          serialNumber: "SPAREVALVE620",
        })
        .expect(201)
    ).body as Component;
    const ph = {
      testDate: "2024-09",
      expiresOn: "2029-09-30",
      crpcId: actors.CRPC,
      result: "APROBADO",
    };
    const survey = (
      await admin.agent
        .post(`/api/vehicles/${vehicleId}/configurations/initial-survey`)
        .set(admin.headers)
        .send({
          idempotencyKey: randomUUID(),
          regulatorId: regulator.id,
          pairs: [
            { position: 1, cylinderId: component.id, valveId: valve.id, ph },
            {
              position: 2,
              cylinderId: spareCylinder.id,
              valveId: spareValve.id,
              ph,
            },
          ],
          sticker: {
            number: "ANT620",
            enabledOn: "2025-11-01",
            expiresOn: "2026-11-30",
          },
        })
        .expect(201)
    ).body;
    const rejected = await work(original, {
      type: "MODIFICACION",
      sheetOperation: "M",
      includesPh: true,
      phReason: "MODIFICACION",
      items: [
        actionItem(component, 1, "RETIRAR"),
        actionItem(valve, 2, "RETIRAR"),
      ],
      interventions: [
        documented(regulator, 1),
        documented(component, 1, {
          action: "D",
          finalPosition: null,
          performsPh: true,
          testDate: "2026-10",
          crpcId: actors.CRPC,
          phResult: "RECHAZADO",
        }),
        documented(valve, 1, {
          cylinderId: component.id,
          action: "D",
          finalPosition: null,
        }),
        documented(spareCylinder, 2),
        documented(spareValve, 2, { cylinderId: spareCylinder.id }),
      ],
    });
    await confirm(original, rejected, survey.configurationId);

    const moved = await prepareConfirmation(app, 621, component);
    const movedSurvey = (
      await moved.admin.agent
        .post(`/api/vehicles/${moved.vehicleId}/configurations/initial-survey`)
        .set(moved.admin.headers)
        .send({
          idempotencyKey: randomUUID(),
          regulatorId: moved.regulator.id,
          pairs: [
            {
              position: 1,
              cylinderId: component.id,
              valveId: moved.valve.id,
              ph: {
                testDate: "2026-10",
                expiresOn: "2031-10-31",
                crpcId: moved.actors.CRPC,
                result: "APROBADO",
              },
            },
          ],
        })
        .expect(201)
    ).body;
    const blocked = await work(moved, {}, "2026-10-03");
    expect(
      (
        await moved.admin.agent
          .get(`/api/service-drafts/${blocked.id}/confirmation-check`)
          .expect(200)
      ).body,
    ).toMatchObject({
      canConfirm: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: "ANTECEDENTE_PH_INCONSISTENTE" }),
      ]),
    });
    await moved.admin.agent
      .post(`/api/service-drafts/${blocked.id}/confirm`)
      .set(moved.admin.headers)
      .send({
        version: blocked.version,
        expectedConfigurationId: movedSurvey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(409);

    const approved = await work(
      moved,
      {
        type: "REVISION_QUINQUENAL",
        includesPh: true,
        phReason: "SERVICIO_PH",
        interventions: [
          documented(component, 1, {
            performsPh: true,
            testDate: "2026-10",
            revisionExpiresOn: "2031-10-31",
            crpcId: moved.actors.CRPC,
            phResult: "APROBADO",
          }),
          documented(moved.regulator, 1),
          documented(moved.valve, 1, { cylinderId: component.id }),
        ],
      },
      "2026-10-04",
    );
    await confirm(moved, approved, movedSurvey.configurationId);
    const reviewed = await work(moved, {}, "2026-10-05");
    await confirm(moved, reviewed, movedSurvey.configurationId);
    expect(
      (
        await moved.admin.agent
          .get(`/api/services/${reviewed.id}/sheet`)
          .expect(200)
      ).body.content,
    ).toMatchObject({
      cilindros: [{ revisionMes: "2026-10", crpcCodigo: "SYN-CRPC-621" }],
      revisionesPH: [],
    });
    expect(
      (
        await moved.admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body.revisions,
    ).toEqual([
      expect.objectContaining({
        serviceId: rejected.id,
        testDate: "2026-10",
        result: "RECHAZADO",
      }),
      expect.objectContaining({
        serviceId: approved.id,
        testDate: "2026-10",
        result: "APROBADO",
      }),
    ]);
  });
  it("la PH relevada más reciente acompaña al cilindro y un nuevo antecedente parcial no hereda aprobación ni CRPC antiguos", async () => {
    const original = await prepareConfirmation(app, 622);
    const { admin, component, regulator, valve } = original;
    const tested = (
      await admin.agent
        .patch(`/api/service-drafts/${original.draft.id}`)
        .set(admin.headers)
        .send({
          version: original.draft.version,
          serviceDate: "2024-09-02",
          preparation: {
            ...original.draft.preparation,
            enabledOn: "2024-09-02",
            expiresOn: "2025-09-30",
          },
          interventions: original.draft.interventions.map((row) =>
            row.type === "CILINDRO"
              ? {
                  ...row,
                  testDate: "2024-09",
                  revisionMonth: "2024-09",
                  revisionExpiresOn: "2029-09-30",
                }
              : row,
          ),
        })
        .expect(200)
    ).body as ServiceDraft;
    const first = await confirm(original, tested, null);
    const remove = async (fixture: Fixture, configurationId: string) => {
      const components = [fixture.component, fixture.regulator, fixture.valve];
      const retired = await work(fixture, {
        type: "DESMONTAJE",
        sheetOperation: "D",
        items: components.map((item, index) =>
          actionItem(item, index + 1, "RETIRAR"),
        ),
        preparation: { pecId: fixture.actors.PEC, tdmId: fixture.actors.TDM },
        interventions: components.map((item) =>
          documented(item, 1, {
            action: "D",
            finalPosition: null,
            cylinderId: item.type === "VALVULA" ? fixture.component.id : null,
          }),
        ),
      });
      await confirm(fixture, retired, configurationId);
    };
    await remove(original, first.configurationId);
    const next = await prepareConfirmation(app, 623, component);
    const nextSurvey = (
      await next.admin.agent
        .post(`/api/vehicles/${next.vehicleId}/configurations/initial-survey`)
        .set(next.admin.headers)
        .send({
          idempotencyKey: randomUUID(),
          regulatorId: next.regulator.id,
          pairs: [
            {
              position: 1,
              cylinderId: component.id,
              valveId: next.valve.id,
              ph: {
                testDate: "2025-09",
                expiresOn: "2030-09-30",
                crpcId: next.actors.CRPC,
                result: "APROBADO",
              },
            },
          ],
        })
        .expect(201)
    ).body;
    const review = await work(next, {});
    await confirm(next, review, nextSurvey.configurationId);
    expect(
      (
        await next.admin.agent
          .get(`/api/services/${review.id}/sheet`)
          .expect(200)
      ).body.content,
    ).toMatchObject({
      cilindros: [{ revisionMes: "2025-09", crpcCodigo: "SYN-CRPC-623" }],
      revisionesPH: [],
    });
    await remove(next, nextSurvey.configurationId);
    const partial = await prepareConfirmation(app, 624, component);
    const partialSurvey = (
      await partial.admin.agent
        .post(
          `/api/vehicles/${partial.vehicleId}/configurations/initial-survey`,
        )
        .set(partial.admin.headers)
        .send({
          idempotencyKey: randomUUID(),
          regulatorId: partial.regulator.id,
          pairs: [
            {
              position: 1,
              cylinderId: component.id,
              valveId: partial.valve.id,
              ph: { testDate: "2026-09" },
            },
          ],
        })
        .expect(201)
    ).body;
    const blocked = await work(partial, {});
    expect(
      (
        await partial.admin.agent
          .get(`/api/service-drafts/${blocked.id}/confirmation-check`)
          .expect(200)
      ).body,
    ).toMatchObject({
      canConfirm: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: "PH_ANTECEDENTE_REQUERIDO" }),
      ]),
    });
    await partial.admin.agent
      .post(`/api/service-drafts/${blocked.id}/confirm`)
      .set(partial.admin.headers)
      .send({
        version: blocked.version,
        expectedConfigurationId: partialSurvey.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(409);
    const history = (
      await partial.admin.agent
        .get(`/api/components/${component.id}/history`)
        .expect(200)
    ).body;
    expect(history.revisions).toEqual([
      expect.objectContaining({
        testDate: "2024-09",
        crpcId: original.actors.CRPC,
      }),
    ]);
    expect(history.initialSurveys).toHaveLength(2);
    expect(history.initialSurveys[1]).toMatchObject({
      ph: { testDate: "2026-09", crpcId: null, result: null },
    });
    expect(
      (
        await admin.agent
          .get(`/api/components/${regulator.id}/history`)
          .expect(200)
      ).body.movements,
    ).toHaveLength(2);
    expect(
      (await admin.agent.get(`/api/components/${valve.id}/history`).expect(200))
        .body.movements,
    ).toHaveLength(2);
  });
});
