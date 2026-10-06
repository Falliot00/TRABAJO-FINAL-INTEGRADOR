import type { INestApplication } from "@nestjs/common";
import type {
  ServiceDraft,
  Component,
  UpdateServiceDraftRequest,
} from "@cilgas/contracts";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareComplete } from "./service-rules-fixture";
import { prepareConfirmation } from "./service-confirmation-fixture";

describe("Matriz PH, oblea y limites de mes por HTTP", () => {
  let app: INestApplication;
  let dispose: () => Promise<void>;
  let databaseUrl: string;
  beforeAll(async () => {
    const db = await prepareTestDatabase();
    databaseUrl = db.url;
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
  it("un rechazo mensual posterior prevalece sobre una PH aprobada con día conocido del mismo mes", async () => {
    const fixture = await prepareConfirmation(app, 504);
    const { admin } = fixture;
    const confirm = async (
      draft: ServiceDraft,
      configurationId: string | null,
    ) =>
      (
        await admin.agent
          .post(`/api/service-drafts/${draft.id}/confirm`)
          .set(admin.headers)
          .send({
            version: draft.version,
            expectedConfigurationId: configurationId,
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body;
    const first = await confirm(fixture.draft, null);
    const replacements: Component[] = [];
    for (const part of [fixture.component, fixture.valve])
      replacements.push(
        (
          await admin.agent
            .post("/api/components")
            .set(admin.headers)
            .send({
              type: part.type,
              modelId: part.modelId,
              serialNumber: `REPLACE-${part.type}-504`,
              ...(part.type === "CILINDRO"
                ? { manufactureMonth: "2020-01" }
                : {}),
            })
            .expect(201)
        ).body,
      );
    let draft = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId: fixture.vehicleId,
          catalogOfferId: fixture.offerId,
          serviceDate: "2026-10-20",
        })
        .expect(201)
    ).body as ServiceDraft;
    const effect = (id: string, order: number, action: string) => ({
      order,
      description: action,
      type: "COMPONENTE",
      componentId: id,
      action,
      quantity: "1",
      unitPrice: "0",
      discount: "0",
      costs: [],
    });
    const replacementRows = replacements.map((part) => ({
      type: part.type,
      componentId: part.id,
      cylinderId: part.type === "VALVULA" ? replacements[0]!.id : null,
      row: 2,
      finalPosition: 1,
      action: "M",
      condition: "USADO",
      homologationCode: part.model.homologationCode,
      serialNumber: part.serialNumber,
      performsPh: false,
      ...(part.type === "CILINDRO"
        ? {
            manufactureMonth: "2020-01",
            revisionMonth: "2026-10",
            crpcId: fixture.actors.CRPC,
          }
        : {}),
    }));
    draft = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          type: "REVISION_ANUAL",
          sheetOperation: "R",
          phReason: "SERVICIO_PH",
          includesPh: true,
          totalAmount: "0",
          preparation: {
            ...fixture.draft.preparation,
            previousSticker: fixture.draft.preparation!.newSticker,
            newSticker: "REJECT-504",
            enabledOn: "2026-10-20",
          },
          items: [
            effect(fixture.component.id, 1, "RETIRAR"),
            effect(fixture.valve.id, 2, "RETIRAR"),
            ...replacements.map((part, index) =>
              effect(part.id, index + 3, "INSTALAR"),
            ),
          ],
          interventions: [
            ...fixture.draft.interventions.map((row) =>
              row.type === "REGULADOR"
                ? { ...row, action: "S" }
                : {
                    ...row,
                    action: "D",
                    finalPosition: null,
                    ...(row.type === "CILINDRO"
                      ? {
                          testDate: "2026-10",
                          phResult: "RECHAZADO",
                          revisionExpiresOn: null,
                        }
                      : {}),
                  },
            ),
            ...replacementRows,
          ],
        })
        .expect(200)
    ).body;
    const rejected = await confirm(draft, first.configurationId);
    const history = (
      await admin.agent
        .get(`/api/components/${fixture.component.id}/history`)
        .expect(200)
    ).body;
    expect(
      history.revisions.map((revision: { result: string }) => revision.result),
    ).toEqual(["APROBADO", "RECHAZADO"]);
    const next = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId: fixture.vehicleId,
          catalogOfferId: fixture.offerId,
          serviceDate: "2026-10-21",
        })
        .expect(201)
    ).body;
    draft = (
      await admin.agent
        .patch(`/api/service-drafts/${next.id}`)
        .set(admin.headers)
        .send({
          version: next.version,
          type: "MODIFICACION",
          sheetOperation: "M",
          phReason: null,
          includesPh: false,
          totalAmount: "0",
          preparation: {
            ...fixture.draft.preparation,
            previousSticker: "REJECT-504",
            newSticker: "INVALID-504",
            enabledOn: "2026-10-21",
          },
          items: [
            effect(fixture.component.id, 1, "INSTALAR"),
            effect(fixture.valve.id, 2, "INSTALAR"),
          ],
          interventions: [
            ...replacementRows.map((row) => ({ ...row, row: 1, action: "S" })),
            ...fixture.draft.interventions.map((row) =>
              row.type === "REGULADOR"
                ? { ...row, action: "S" }
                : {
                    ...row,
                    row: 2,
                    finalPosition: 2,
                    action: "M",
                    performsPh: false,
                    testDate: null,
                    phResult: null,
                    revisionExpiresOn: null,
                    certificateNumber: null,
                  },
            ),
          ],
        })
        .expect(200)
    ).body;
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "PH_VENCIDA" })]),
    );
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: draft.version,
        expectedConfigurationId: rejected.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(409);
  });
  it("permite PH de varios cilindros cuando el motivo global es el vencimiento de uno", async () => {
    const fixture = await prepareComplete(app, 503);
    const { admin } = fixture;
    await admin.agent
      .post(`/api/service-drafts/${fixture.draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: fixture.draft.version,
        expectedConfigurationId: null,
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    const parts: {
      id: string;
      type: string;
      serialNumber: string;
      model: { homologationCode: string };
    }[] = [];
    for (const type of ["CILINDRO", "VALVULA"]) {
      const model = (
        await admin.agent
          .post("/api/component-models")
          .set(admin.headers)
          .send({ type, homologationCode: `MIX-${type}` })
          .expect(201)
      ).body;
      parts.push(
        (
          await admin.agent
            .post("/api/components")
            .set(admin.headers)
            .send({
              type,
              modelId: model.id,
              serialNumber: `MIX-${type}`,
              ...(type === "CILINDRO" ? { manufactureMonth: "2020-01" } : {}),
            })
            .expect(201)
        ).body,
      );
    }
    const next = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId: fixture.vehicleId,
          catalogOfferId: fixture.offerId,
          serviceDate: "2032-11-01",
        })
        .expect(201)
    ).body;
    const draft = (
      await admin.agent
        .patch(`/api/service-drafts/${next.id}`)
        .set(admin.headers)
        .send({
          version: next.version,
          type: "REVISION_QUINQUENAL",
          sheetOperation: "R",
          phReason: "VENCIMIENTO",
          includesPh: true,
          totalAmount: "0",
          preparation: {
            ...fixture.draft.preparation,
            previousSticker: fixture.draft.preparation!.newSticker,
            previousStickerExpiresOn: "2027-10",
            newSticker: "MIX-503",
            enabledOn: "2032-11-01",
            expiresOn: "2033-11-30",
          },
          items: parts.map((part, index) => ({
            order: index + 1,
            description: "Montaje",
            type: "COMPONENTE",
            componentId: part.id,
            action: "INSTALAR",
            quantity: "1",
            unitPrice: "0",
            discount: "0",
            costs: [],
          })),
          interventions: [
            ...fixture.draft.interventions.map((row) => ({
              ...row,
              action: "S",
              ...(row.type === "CILINDRO"
                ? {
                    testDate: "2032-11",
                    revisionMonth: "2026-10",
                    revisionExpiresOn: "2037-11-30",
                  }
                : {}),
            })),
            ...parts.map((part) => ({
              type: part.type,
              componentId: part.id,
              cylinderId: part.type === "VALVULA" ? parts[0]!.id : null,
              row: 2,
              finalPosition: 2,
              action: "M",
              condition: "USADO",
              homologationCode: part.model.homologationCode,
              serialNumber: part.serialNumber,
              performsPh: part.type === "CILINDRO",
              ...(part.type === "CILINDRO"
                ? {
                    manufactureMonth: "2020-01",
                    revisionMonth: "2029-11",
                    testDate: "2032-11",
                    revisionExpiresOn: "2037-11-30",
                    phResult: "APROBADO",
                    crpcId: fixture.actors.CRPC,
                  }
                : {}),
            })),
          ],
        })
        .expect(200)
    ).body;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body.blockers,
    ).toEqual([]);
  });
  it("incluye el 29 de febrero, mantiene S sin movimientos y usa R por PH vencida con oblea vigente", async () => {
    const fixture = await prepareComplete(app, 501);
    const { admin } = fixture;
    const patch = async (
      draft: ServiceDraft,
      input: Omit<UpdateServiceDraftRequest, "version">,
    ) =>
      (
        await admin.agent
          .patch(`/api/service-drafts/${draft.id}`)
          .set(admin.headers)
          .send({ version: draft.version, ...input })
          .expect(200)
      ).body as ServiceDraft;
    const check = async (draft: ServiceDraft) =>
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body;
    const confirm = async (draft: ServiceDraft, config: string | null) =>
      (
        await admin.agent
          .post(`/api/service-drafts/${draft.id}/confirm`)
          .set(admin.headers)
          .send({
            version: draft.version,
            expectedConfigurationId: config,
            idempotencyKey: randomUUID(),
          })
          .expect(201)
      ).body;
    let draft = await patch(fixture.draft, {
      serviceDate: "2023-02-28",
      preparation: {
        ...fixture.draft.preparation,
        enabledOn: "2023-02-28",
        expiresOn: "2024-02-29",
      },
      interventions: fixture.draft.interventions.map((row) =>
        row.performsPh
          ? {
              ...row,
              testDate: "2023-02",
              revisionMonth: null,
              revisionExpiresOn: "2028-02-29",
            }
          : row,
      ),
    });
    expect((await check(draft)).blockers).toEqual([]);
    const converted = await confirm(draft, null);
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
    const keeping = draft.interventions.map((row) => ({
      ...row,
      action: "S" as const,
      performsPh: false,
      testDate: null,
      revisionMonth: row.type === "CILINDRO" ? "2023-02" : null,
      revisionExpiresOn: null,
      phResult: null,
      certificateNumber: null,
    }));
    draft = await patch(next, {
      type: "REVISION_ANUAL",
      sheetOperation: "R",
      includesPh: false,
      phReason: null,
      totalAmount: "0",
      items: [],
      preparation: {
        ...draft.preparation,
        previousSticker: draft.preparation!.newSticker,
        previousStickerExpiresOn: "2024-02",
        newSticker: "RENEW-501",
        enabledOn: "2027-09-30",
        expiresOn: "2028-09-30",
      },
      interventions: keeping,
    });

    for (const missing of [
      { revisionMonth: null },
      { crpcId: null },
      { revisionMonth: null, crpcId: null },
    ]) {
      draft = await patch(draft, {
        interventions: keeping.map((row) =>
          row.type === "CILINDRO" ? { ...row, ...missing } : row,
        ),
      });
      expect((await check(draft)).blockers).toEqual([]);
    }
    const renewal = await confirm(draft, converted.configurationId);
    expect(renewal.configurationId).toBe(converted.configurationId);
    const renewedSheet = (
      await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200)
    ).body;
    expect(renewedSheet.content.cilindros[0].revisionMes).toBe("2023-02");
    expect(renewedSheet.content.cilindros[0].crpcCodigo).toBe("SYN-CRPC-501");
    expect(renewedSheet.content.revisionesPH).toEqual([]);
    const pending = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId: fixture.vehicleId,
          catalogOfferId: fixture.offerId,
          serviceDate: "2028-02-29",
        })
        .expect(201)
    ).body as ServiceDraft;
    const prep = {
      ...draft.preparation,
      previousSticker: "RENEW-501",
      previousStickerExpiresOn: "2028-09",
      newSticker: "PH-501",
      enabledOn: "2028-02-29",
      expiresOn: "2029-02-28",
    };
    draft = await patch(pending, {
      type: "REVISION_ANUAL",
      sheetOperation: "R",
      includesPh: false,
      phReason: null,
      totalAmount: "0",
      items: [],
      preparation: prep,
      interventions: keeping,
    });
    expect((await check(draft)).blockers).toEqual([]);
    draft = await patch(draft, {
      serviceDate: "2028-03-01",
      preparation: {
        ...prep,
        enabledOn: "2028-03-01",
        expiresOn: "2029-03-31",
      },
    });
    expect((await check(draft)).blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "PH_VENCIDA" })]),
    );
    draft = await patch(draft, {
      type: "MODIFICACION",
      sheetOperation: "M",
      includesPh: true,
      phReason: "MODIFICACION",
      interventions: keeping.map((row) =>
        row.type === "CILINDRO"
          ? {
              ...row,
              performsPh: true,
              testDate: "2028-03",
              phResult: "APROBADO",
              revisionExpiresOn: "2033-03-31",
            }
          : row,
      ),
    });
    expect((await check(draft)).blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MOTIVO_PH_INCONSISTENTE" }),
      ]),
    );
    draft = await patch(draft, {
      type: "REVISION_ANUAL",
      sheetOperation: "R",
      phReason: "VENCIMIENTO",
    });
    expect((await check(draft)).blockers).toEqual([]);
    await confirm(draft, renewal.configurationId);
    // La representación relacional del documento también conserva "Revisado" actual.
    const schema = new URL(databaseUrl).searchParams.get("schema");
    if (!schema || !/^test_[a-f0-9]{32}$/.test(schema))
      throw new Error("Se requiere el esquema efímero de esta prueba.");
    const database = new Client({ connectionString: databaseUrl });
    await database.connect();
    try {
      const persisted = await database.query<{ revision: string }>(
        `SELECT to_char(fc.revision_mes, 'YYYY-MM') AS revision FROM "${schema}".ficha_componentes fc JOIN "${schema}".fichas f ON f.id = fc.ficha_id WHERE f.servicio_id = $1 AND fc.tipo = 'CILINDRO'`,
        [draft.id],
      );
      expect(persisted.rows).toEqual([{ revision: "2028-03" }]);
    } finally {
      await database.end();
    }
    const history = (
      await admin.agent
        .get(`/api/components/${fixture.cylinder.id}/history`)
        .expect(200)
    ).body;
    expect(history.movements).toHaveLength(1);
    expect(history.revisions).toEqual([
      expect.objectContaining({ testDate: "2023-02", expiresOn: "2028-02-29" }),
      expect.objectContaining({ testDate: "2028-03", expiresOn: "2033-03-31" }),
    ]);
  });
  it("exige retiro completo en D/B y permite documentarlo sin emitir oblea", async () => {
    const fixture = await prepareComplete(app, 502);
    const { admin } = fixture;
    const converted = (
      await admin.agent
        .post(`/api/service-drafts/${fixture.draft.id}/confirm`)
        .set(admin.headers)
        .send({
          version: fixture.draft.version,
          expectedConfigurationId: null,
          idempotencyKey: randomUUID(),
        })
        .expect(201)
    ).body;
    let draft = (
      await admin.agent
        .post("/api/service-drafts")
        .set(admin.headers)
        .send({
          vehicleId: fixture.vehicleId,
          catalogOfferId: fixture.offerId,
          serviceDate: "2026-10-03",
        })
        .expect(201)
    ).body as ServiceDraft;
    const keeping = fixture.draft.interventions.map((row) => ({
      ...row,
      action: "S",
      performsPh: false,
      testDate: null,
      phResult: null,
      certificateNumber: null,
      revisionExpiresOn: null,
      revisionMonth: row.type === "CILINDRO" ? "2026-10" : null,
    }));
    draft = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          type: "DESMONTAJE",
          sheetOperation: "D",
          includesPh: false,
          totalAmount: "0",
          items: [],
          preparation: {
            pecId: fixture.actors.PEC,
            tdmId: fixture.actors.TDM,
            enabledOn: "2026-10-03",
          },
          interventions: keeping,
        })
        .expect(200)
    ).body;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body.blockers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CONFIGURACION_INCONSISTENTE" }),
      ]),
    );
    draft = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          items: keeping.map((row, index) => ({
            order: index + 1,
            description: "Desmontaje",
            type: "COMPONENTE",
            componentId: row.componentId,
            action: "RETIRAR",
            quantity: "1",
            unitPrice: "0",
            discount: "0",
            costs: [],
          })),
          interventions: keeping.map((row) => ({
            ...row,
            action: "D",
            finalPosition: null,
          })),
        })
        .expect(200)
    ).body;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body.blockers,
    ).toEqual([]);
    draft = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({ version: draft.version, sheetOperation: "B" })
        .expect(200)
    ).body;
    expect(
      (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body.blockers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CONFIGURACION_INCONSISTENTE" }),
      ]),
    );
    draft = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          interventions: draft.interventions.map((row) => ({
            ...row,
            action: "B",
          })),
        })
        .expect(200)
    ).body;
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({
        version: draft.version,
        expectedConfigurationId: converted.configurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    const sheet = (
      await admin.agent.get(`/api/services/${draft.id}/sheet`).expect(200)
    ).body;
    expect(sheet.content.habilitacion).toMatchObject({
      obleaNueva: null,
      vencimiento: null,
    });
    const configurations = (
      await admin.agent
        .get(`/api/vehicles/${fixture.vehicleId}/configurations`)
        .expect(200)
    ).body;
    expect(configurations.configurations[0].components).toEqual([]);
  });
});
