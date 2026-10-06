import type {
  Component,
  ServiceDraft,
  ServiceInterventionInput,
} from "@cilgas/contracts";
import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareComplete } from "./service-rules-fixture";

type Fixture = Awaited<ReturnType<typeof prepareComplete>>;
async function confirm(
  fixture: Fixture,
  draft: ServiceDraft,
  expected: string | null,
  status = 201,
) {
  return (
    await fixture.admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(fixture.admin.headers)
      .send({
        version: draft.version,
        idempotencyKey: randomUUID(),
        expectedConfigurationId: expected,
      })
      .expect(status)
  ).body;
}
async function component(
  fixture: Fixture,
  type: "VALVULA" | "CILINDRO",
  suffix: string,
): Promise<Component> {
  const model = (
    await fixture.admin.agent
      .post("/api/component-models")
      .set(fixture.admin.headers)
      .send({ type, homologationCode: `CODE-${suffix}` })
      .expect(201)
  ).body;
  return (
    await fixture.admin.agent
      .post("/api/components")
      .set(fixture.admin.headers)
      .send({
        type,
        modelId: model.id,
        serialNumber: `SERIE-${suffix}`,
        ...(type === "CILINDRO" ? { manufactureMonth: "2020-01" } : {}),
      })
      .expect(201)
  ).body;
}
function installed(
  component: Component,
  row: number,
  cylinderId?: string,
): ServiceInterventionInput {
  return {
    type: component.type,
    row,
    componentId: component.id,
    cylinderId: cylinderId ?? null,
    homologationCode: component.model.homologationCode,
    serialNumber: component.serialNumber,
    condition: "NUEVO",
    action: "M",
    finalPosition: row,
    performsPh: false,
  };
}
function effect(
  componentId: string,
  order: number,
  action: "INSTALAR" | "RETIRAR",
) {
  return {
    order,
    type: "COMPONENTE",
    description: action,
    componentId,
    action,
    quantity: "1",
    unitPrice: "0",
    discount: "0",
    costs: [],
  };
}

describe("Parejas historicas de cilindro y valvula por HTTP", () => {
  let app: INestApplication;
  let dispose: () => Promise<void>;
  beforeAll(async () => {
    const db = await prepareTestDatabase();
    dispose = db.dispose;
    app = await createApplication({
      ...process.env,
      NODE_ENV: "test",
      APP_ORIGIN: "http://localhost:5173",
      DATABASE_URL: db.url,
    });
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await dispose?.();
  });
  it("conserva cuatro parejas resultantes y las cuatro valvulas salientes D/B en Observaciones", async () => {
    const fixture = await prepareComplete(app, 401);
    const { admin } = fixture;
    const cylinders = [fixture.cylinder];
    const valves = [fixture.valve];
    for (let index = 2; index <= 4; index++) {
      cylinders.push(await component(fixture, "CILINDRO", `401-C${index}`));
      valves.push(await component(fixture, "VALVULA", `401-V${index}`));
    }
    const interventions = [...fixture.draft.interventions];
    const items = fixture.draft.items.map((item) =>
      Object.fromEntries(
        Object.entries(item).filter(
          ([key]) => !["amount", "catalogItemId"].includes(key),
        ),
      ),
    );
    for (let index = 1; index < 4; index++) {
      const cylinder = cylinders[index]!;
      const valve = valves[index]!;
      interventions.push(
        {
          ...fixture.draft.interventions.find(
            (row) => row.type === "CILINDRO",
          )!,
          ...installed(cylinder, index + 1),
          manufactureMonth: "2020-01",
          performsPh: true,
        },
        installed(valve, index + 1, cylinder.id),
      );
      items.push(
        effect(cylinder.id, items.length + 1, "INSTALAR"),
        effect(valve.id, items.length + 2, "INSTALAR"),
      );
    }
    const initial = (
      await admin.agent
        .patch(`/api/service-drafts/${fixture.draft.id}`)
        .set(admin.headers)
        .send({ version: fixture.draft.version, interventions, items })
        .expect(200)
    ).body as ServiceDraft;
    const confirmed = await confirm(fixture, initial, null);
    const originalSheet = (
      await admin.agent.get(`/api/services/${initial.id}/sheet`).expect(200)
    ).body;
    const next = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId: fixture.vehicleId,
          catalogOfferId: fixture.offerId,
          serviceDate: "2027-09-30",
        })
        .expect(201)
    ).body as ServiceDraft;
    const incoming: Component[] = [];
    for (let index = 1; index <= 4; index++)
      incoming.push(await component(fixture, "VALVULA", `402-V${index}`));
    const updated = (
      await admin.agent
        .patch(`/api/service-drafts/${next.id}`)
        .set(admin.headers)
        .send({
          version: next.version,
          type: "MODIFICACION",
          sheetOperation: "M",
          includesPh: false,
          phReason: null,
          totalAmount: "0",
          preparation: {
            ...initial.preparation,
            previousSticker: initial.preparation!.newSticker,
            previousStickerExpiresOn: "2027-10",
            newSticker: "OBLEA-402",
            enabledOn: "2027-09-30",
            expiresOn: "2028-09-30",
          },
          items: valves.flatMap((valve, index) => [
            effect(valve.id, index * 2 + 1, "RETIRAR"),
            effect(incoming[index]!.id, index * 2 + 2, "INSTALAR"),
          ]),
          interventions: [
            ...initial.interventions
              .filter((row) => row.type !== "VALVULA")
              .map((row) => ({
                ...row,
                action: "S",
                performsPh: false,
                testDate: null,
                phResult: null,
                certificateNumber: null,
                revisionMonth: row.type === "CILINDRO" ? "2026-10" : null,
              })),
            ...valves.map((valve, index) => ({
              ...installed(valve, index + 5, cylinders[index]!.id),
              action: index % 2 ? "D" : "B",
              finalPosition: null,
            })),
            ...incoming.map((valve, index) =>
              installed(valve, index + 1, cylinders[index]!.id),
            ),
          ],
        })
        .expect(200)
    ).body as ServiceDraft;
    await confirm(fixture, updated, confirmed.configurationId);
    const sheet = (
      await admin.agent.get(`/api/services/${updated.id}/sheet`).expect(200)
    ).body;
    expect(sheet.content.valvulasRetiradas).toHaveLength(4);
    for (let index = 0; index < 4; index++) {
      expect(sheet.content.cilindros[index].valvula.componenteId).toBe(
        incoming[index]!.id,
      );
      expect(sheet.content.documento.observaciones).toContain(
        valves[index]!.serialNumber,
      );
      expect(sheet.content.documento.observaciones).toContain(
        cylinders[index]!.serialNumber,
      );
      const history = (
        await admin.agent
          .get(`/api/components/${cylinders[index]!.id}/history`)
          .expect(200)
      ).body;
      expect(history.cylinderValveLinks).toEqual([
        expect.objectContaining({
          valveId: valves[index]!.id,
          validUntil: expect.any(String),
        }),
        expect.objectContaining({
          valveId: incoming[index]!.id,
          validUntil: null,
        }),
      ]);
      expect(history.movements).toHaveLength(1);
    }
    expect(
      (await admin.agent.get(`/api/services/${initial.id}/sheet`).expect(200))
        .body,
    ).toEqual(originalSheet);
    const reuse = await prepareComplete(app, 403);
    let retry = reuse.draft;
    for (const [index, expected] of [
      [0, 409],
      [1, 201],
    ] as const) {
      retry = (
        await reuse.admin.agent
          .patch(`/api/service-drafts/${retry.id}`)
          .set(reuse.admin.headers)
          .send({
            version: retry.version,
            items: reuse.draft.items.map((item) => {
              const input = Object.fromEntries(
                Object.entries(item).filter(
                  ([key]) => !["amount", "catalogItemId"].includes(key),
                ),
              );
              return item.componentId === reuse.valve.id
                ? { ...input, componentId: valves[index]!.id }
                : input;
            }),
            interventions: reuse.draft.interventions.map((row) =>
              row.componentId === reuse.valve.id
                ? installed(valves[index]!, 1, reuse.cylinder.id)
                : row,
            ),
          })
          .expect(200)
      ).body;
      await confirm(reuse, retry, null, expected);
    }
  });
});
