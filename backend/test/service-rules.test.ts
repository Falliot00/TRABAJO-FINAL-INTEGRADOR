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
    const { admin, draft } = await prepareComplete(app, 301);
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
});
