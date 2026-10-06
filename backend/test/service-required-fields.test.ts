import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareConfirmation } from "./service-confirmation-fixture";

describe("Datos obligatorios para confirmar M06", () => {
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

  it("exige teléfono del titular al confirmar y conserva el borrador incompleto", async () => {
    const { admin, draft, personId } = await prepareConfirmation(app, 501);
    await admin.agent
      .patch(`/api/people/${personId}`)
      .set(admin.headers)
      .send({ phone: null })
      .expect(200);
    const before = (
      await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200)
    ).body;
    const check = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "TITULAR_INCOMPLETO",
          message: expect.stringContaining("teléfono"),
        }),
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
    expect(
      (await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200))
        .body,
    ).toEqual(before);
    await admin.agent
      .patch(`/api/people/${personId}`)
      .set(admin.headers)
      .send({ phone: "3410000000" })
      .expect(200);
    const corrected = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(corrected.blockers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TITULAR_INCOMPLETO" }),
      ]),
    );
  });

  it("exige domicilio completo, titular e identificación del vehículo y admite S/N e inyección No", async () => {
    const { admin, draft, personId, vehicleId } = await prepareConfirmation(
      app,
      502,
    );
    for (const [field, value, label] of [
      ["street", "Calle de prueba", "calle"],
      ["streetNumber", "S/N", "altura"],
      ["postalCode", "2000", "CPA"],
      ["locality", "Rosario", "localidad"],
      ["province", "Santa Fe", "provincia"],
    ]) {
      await admin.agent
        .patch(`/api/people/${personId}`)
        .set(admin.headers)
        .send({ [field]: null })
        .expect(200);
      const check = (
        await admin.agent
          .get(`/api/service-drafts/${draft.id}/confirmation-check`)
          .expect(200)
      ).body;
      expect(check.blockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "TITULAR_INCOMPLETO",
            message: expect.stringContaining(label),
          }),
        ]),
      );
      await admin.agent
        .patch(`/api/people/${personId}`)
        .set(admin.headers)
        .send({ [field]: value })
        .expect(200);
    }
    await admin.agent
      .patch(`/api/vehicles/${vehicleId}`)
      .set(admin.headers)
      .send({ injection: null, type: null })
      .expect(200);
    const missingVehicle = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(missingVehicle.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VEHICULO_INCOMPLETO" }),
      ]),
    );
    await admin.agent
      .patch(`/api/vehicles/${vehicleId}`)
      .set(admin.headers)
      .send({ injection: false, type: "PARTICULAR" })
      .expect(200);
    const corrected = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(corrected.blockers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: expect.stringMatching(/TITULAR_INCOMPLETO|VEHICULO_INCOMPLETO/),
        }),
      ]),
    );
    const edited = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({ version: draft.version, people: [] })
        .expect(200)
    ).body;
    const noOwner = (
      await admin.agent
        .get(`/api/service-drafts/${edited.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(noOwner.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TITULAR_REQUERIDO" }),
      ]),
    );
  });

  it("exige la identificación del encabezado pero permite firmas y matrículas manuales", async () => {
    const { admin, draft, actors } = await prepareConfirmation(app, 503);
    for (const id of Object.values(actors)) {
      await admin.agent
        .patch(`/api/regulatory-actors/${id}`)
        .set(admin.headers)
        .send({ technicalResponsible: null, responsibleLicense: null })
        .expect(200);
    }
    await admin.agent
      .patch(`/api/regulatory-actors/${actors.TDM}`)
      .set(admin.headers)
      .send({ cuit: null, address: null })
      .expect(200);
    const incomplete = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(incomplete.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ENCABEZADO_INCOMPLETO",
          message: expect.stringContaining("CUIT"),
        }),
      ]),
    );
    await admin.agent
      .patch(`/api/regulatory-actors/${actors.TDM}`)
      .set(admin.headers)
      .send({ cuit: "20123456786", address: "Calle de prueba 123" })
      .expect(200);
    const manual = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(manual.blockers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ENCABEZADO_INCOMPLETO" }),
      ]),
    );
  });

  it("exige código y serie sólo del accesorio que se documenta y admite casillas vacías", async () => {
    const { admin, draft } = await prepareConfirmation(app, 504);
    const incomplete = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: draft.version,
          interventions: [
            ...draft.interventions,
            {
              type: "ACCESORIO",
              row: 1,
              description: "Manómetro",
              performsPh: false,
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
    expect(check.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ACCESORIO_INCOMPLETO" }),
      ]),
    );
    await admin.agent
      .patch(`/api/service-drafts/${draft.id}`)
      .set(admin.headers)
      .send({
        version: incomplete.version,
        interventions: [
          ...draft.interventions,
          {
            type: "ACCESORIO",
            row: 1,
            description: "Manómetro",
            homologationCode: "MAN-PRUEBA",
            serialNumber: "MAN-504",
            performsPh: false,
          },
          { type: "ACCESORIO", row: 2, performsPh: false },
        ],
      })
      .expect(200);
    const corrected = (
      await admin.agent
        .get(`/api/service-drafts/${draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(corrected.blockers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ACCESORIO_INCOMPLETO" }),
      ]),
    );
  });
});
