import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareConfirmation } from "./service-confirmation-fixture";

describe("Relevamiento inicial por HTTP", () => {
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

  it("registra equipo y antecedentes parciales sin inventar servicios ni ensayos", async () => {
    const { admin, vehicleId, component, regulator, valve, actors, draft } =
      await prepareConfirmation(app, 601);
    const input = {
      idempotencyKey: randomUUID(),
      regulatorId: regulator.id,
      pairs: [
        {
          position: 1,
          cylinderId: component.id,
          valveId: valve.id,
          ph: { testDate: "2024-09", crpcId: actors.CRPC },
        },
      ],
      sticker: { number: "PREV-601", expiresOn: "2027-09-30" },
      notes: "Equipo existente observado",
    };
    const started = Date.now();
    const result = (
      await admin.agent
        .post(`/api/vehicles/${vehicleId}/configurations/initial-survey`)
        .set(admin.headers)
        .send(input)
        .expect(201)
    ).body;
    expect(result).toMatchObject({
      vehicleId,
      recordedBy: "9007199254740993",
      regulatorId: regulator.id,
      pairs: [
        {
          position: 1,
          cylinderId: component.id,
          valveId: valve.id,
          ph: {
            testDate: "2024-09",
            crpcId: actors.CRPC,
            result: null,
            expiresOn: null,
            certificateNumber: null,
          },
        },
      ],
      sticker: { number: "PREV-601", enabledOn: null, expiresOn: "2027-09-30" },
    });
    expect(Date.parse(result.recordedAt)).toBeGreaterThanOrEqual(started);
    const history = (
      await admin.agent
        .get(`/api/vehicles/${vehicleId}/configurations`)
        .expect(200)
    ).body;
    expect(history).toMatchObject({
      currentConfigurationId: result.configurationId,
      canRegisterInitialSurvey: false,
      configurations: [
        {
          serviceId: null,
          validFrom: result.recordedAt,
          validUntil: null,
          initialSurvey: result,
        },
      ],
    });
    expect(
      (
        await admin.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body,
    ).toMatchObject({
      activities: [],
      movements: [],
      revisions: [],
      initialSurveys: [
        {
          configurationId: result.configurationId,
          ph: { testDate: "2024-09", result: null },
        },
      ],
    });
    expect(
      (await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200))
        .body,
    ).toEqual(draft);
    expect(
      (await admin.agent.get("/api/services").expect(200)).body.items,
    ).toEqual([]);
    const events = (await admin.agent.get("/api/audit?limit=100").expect(200))
      .body.items;
    expect(events).toContainEqual(
      expect.objectContaining({
        action: "EQUIPO_RELEVADO",
        entityId: result.configurationId,
        actorId: result.recordedBy,
      }),
    );
  });

  it("rechaza antecedentes imposibles sin consumir la primera configuración", async () => {
    const { admin, vehicleId, component, regulator, valve, actors } =
      await prepareConfirmation(app, 602);
    const pair = { position: 1, cylinderId: component.id, valveId: valve.id };
    const input = {
      idempotencyKey: randomUUID(),
      regulatorId: regulator.id,
      pairs: [pair],
    };
    const invalid = [
      { pairs: [{ ...pair, ph: { testDate: "2024-02-30" } }] },
      { pairs: [{ ...pair, ph: { testDate: "2999-01" } }] },
      { pairs: [{ ...pair, ph: { testDate: "2019-12" } }] },
      {
        pairs: [
          { ...pair, ph: { testDate: "2024-01", expiresOn: "2023-12-31" } },
        ],
      },
      {
        pairs: [
          { ...pair, ph: { result: "RECHAZADO", expiresOn: "2029-01-31" } },
        ],
      },
      { pairs: [{ ...pair, ph: { crpcId: actors.PEC } }] },
      { pairs: [pair, { ...pair, position: 2 }] },
      {
        pairs: Array.from({ length: 5 }, (_, i) => ({
          ...pair,
          position: i + 1,
        })),
      },
      { regulatorId: component.id },
      { sticker: { enabledOn: "2999-01-01" } },
      { sticker: { enabledOn: "2024-05-01", expiresOn: "2024-04-30" } },
      { sticker: { expiresOn: "2024-02-30" } },
      { pairs: [{ ...pair, ph: { expiresOn: "2029-09-15" } }] },
      { sticker: { expiresOn: "2027-09-15" } },
      {
        pairs: [
          {
            ...pair,
            ph: {
              testDate: "2024-01",
              expiresOn: "2039-12-31",
              result: "APROBADO",
            },
          },
        ],
      },
      { sticker: { enabledOn: "2020-01-01", expiresOn: "2039-12-31" } },
    ];
    for (const bad of invalid)
      await admin.agent
        .post(`/api/vehicles/${vehicleId}/configurations/initial-survey`)
        .set(admin.headers)
        .send({ ...input, ...bad })
        .expect(400);
    expect(
      (
        await admin.agent
          .get(`/api/vehicles/${vehicleId}/configurations`)
          .expect(200)
      ).body,
    ).toMatchObject({ canRegisterInitialSurvey: true, configurations: [] });
    await admin.agent
      .post(`/api/vehicles/${vehicleId}/configurations/initial-survey`)
      .set(admin.headers)
      .send(input)
      .expect(201);
  });
});
