import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { signedIn } from "./session";

describe("Borradores compartidos de servicios", () => {
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

  it("recupera un borrador con propuesta histórica y personas del vehículo sin emitir resultados", async () => {
    const admin = await signedIn(app);
    const person = (
      await admin.agent
        .post("/api/people")
        .set(admin.headers)
        .send({
          type: "FISICA",
          name: "Titular borrador",
          documentType: "DNI",
          documentNumber: "12345678",
        })
        .expect(201)
    ).body;
    const vehicle = (
      await admin.agent
        .post("/api/vehicles")
        .set(admin.headers)
        .send({ plate: "AB123CD", brand: "Marca", model: "Modelo", year: 2020 })
        .expect(201)
    ).body;
    await admin.agent
      .post(`/api/vehicles/${vehicle.id}/relationships`)
      .set(admin.headers)
      .send({ personId: person.id, role: "TITULAR", from: "2026-01-01" })
      .expect(201);
    const supplier = (
      await admin.agent
        .post("/api/suppliers")
        .set(admin.headers)
        .send({ name: "Proveedor propuesta" })
        .expect(201)
    ).body;
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          code: "BORRADOR-ANUAL",
          name: "Revisión anual histórica",
          description: "Inspección y oblea",
          type: "REVISION_ANUAL",
          suggestedPrice: "100.10",
          items: [
            {
              order: 1,
              description: "Oblea propuesta",
              type: "OBLEA",
              quantity: "2",
              unitPrice: "50.05",
              unitCost: "10.10",
              supplierId: supplier.id,
            },
          ],
        })
        .expect(201)
    ).body;
    const created = (
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
    expect(created).toMatchObject({
      status: "BORRADOR",
      version: 1,
      createdBy: "9007199254740993",
      totalAmount: "100.10",
      description: "Revisión anual histórica",
      people: [{ role: "TITULAR", personId: person.id }],
      items: [
        {
          catalogItemId: offer.items[0].id,
          amount: "100.10",
          costs: [
            {
              amount: "20.20",
              supplierId: supplier.id,
              treatment: "PROVEEDOR",
            },
          ],
        },
      ],
    });
    expect(
      (await admin.agent.get(`/api/service-drafts/${created.id}`).expect(200))
        .body,
    ).toEqual(created);
    expect(
      (await admin.agent.get("/api/service-drafts?q=ab123cd").expect(200)).body
        .items,
    ).toEqual([created]);
    expect(
      (await admin.agent.get("/api/service-drafts?q=12345678").expect(200)).body
        .items,
    ).toEqual([created]);
    await admin.agent
      .patch(`/api/catalog-services/${offer.id}`)
      .set(admin.headers)
      .send({ name: "Oferta futura", suggestedPrice: "500", items: [] })
      .expect(200);
    expect(
      (await admin.agent.get(`/api/service-drafts/${created.id}`).expect(200))
        .body,
    ).toMatchObject({
      ...created,
      items: [{ ...created.items[0], catalogItemId: null }],
    });
    expect(
      (
        await admin.agent
          .get(`/api/vehicles/${vehicle.id}/configurations`)
          .expect(200)
      ).body.available,
    ).toBe(true);
    expect(
      (await admin.agent.get("/api/audit?limit=100").expect(200)).body.items,
    ).toContainEqual(
      expect.objectContaining({
        action: "BORRADOR_SERVICIO_CREADO",
        entity: "servicios",
        entityId: created.id,
        actorId: "9007199254740993",
      }),
    );
  });
  it("guarda ajustes comerciales, roles y preparación técnica incompleta compartida sin perder costos privados ni autoría", async () => {
    const admin = await signedIn(app);
    const operatorUser = (
      await admin.agent
        .post("/api/users")
        .set(admin.headers)
        .send({
          name: "Operador borradores",
          email: "drafts@example.test",
          password: "Synthetic-operator-2026!",
          role: "OPERADOR",
        })
        .expect(201)
    ).body;
    const operator = await signedIn(
      app,
      "drafts@example.test",
      "Synthetic-operator-2026!",
    );
    const vehicle = (
      await admin.agent
        .post("/api/vehicles")
        .set(admin.headers)
        .send({ plate: "AC234DE", brand: "Marca", model: "Modelo", year: 2020 })
        .expect(201)
    ).body;
    const payer = (
      await admin.agent
        .post("/api/people")
        .set(admin.headers)
        .send({
          type: "FISICA",
          name: "Pagador elegido",
          documentType: "DNI",
          documentNumber: "87654321",
        })
        .expect(201)
    ).body;
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({
          type: "CILINDRO",
          homologationCode: "CIL-DRAFT",
          brand: "Marca",
        })
        .expect(201)
    ).body;
    const component = (
      await admin.agent
        .post("/api/components")
        .set(admin.headers)
        .send({
          modelId: model.id,
          type: "CILINDRO",
          serialNumber: "SERIE-DRAFT",
        })
        .expect(201)
    ).body;
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          code: "BORRADOR-PH",
          name: "Quinquenal propuesta",
          description: "PH propuesta",
          type: "REVISION_QUINQUENAL",
          suggestedPrice: "100",
          items: [
            {
              order: 1,
              description: "PH",
              type: "ENSAYO_PH",
              quantity: "1",
              unitPrice: "100",
              unitCost: "25.25",
            },
          ],
        })
        .expect(201)
    ).body;
    const created = (
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
    const item = {
      id: created.items[0].id,
      order: 1,
      description: "PH acordada",
      type: "ENSAYO_PH",
      componentId: component.id,
      action: "ENSAYAR",
      quantity: "1",
      unitPrice: "110.10",
      discount: "0.10",
    };
    const edited = (
      await operator.agent
        .patch(`/api/service-drafts/${created.id}`)
        .set(operator.headers)
        .send({
          version: 1,
          description: "Quinquenal ajustada",
          totalAmount: "99.99",
          notes: "Revisar antes de confirmar",
          people: [{ role: "PAGADOR", personId: payer.id }],
          items: [item],
          sheetOperation: "R",
          preparation: { newSticker: "PREPARADA", notes: "Todavía incompleta" },
          interventions: [
            {
              type: "CILINDRO",
              row: 1,
              componentId: component.id,
              serialNumber: component.serialNumber,
              performsPh: true,
              phResult: "APROBADO",
            },
          ],
        })
        .expect(200)
    ).body;
    expect(edited).toMatchObject({
      version: 2,
      createdBy: created.createdBy,
      createdByName: "Administrador de prueba",
      totalAmount: "99.99",
      items: [{ amount: "110.00" }],
      people: [{ personId: payer.id, role: "PAGADOR" }],
      preparation: { newSticker: "PREPARADA", notes: "Todavía incompleta" },
      interventions: [
        {
          type: "CILINDRO",
          componentId: component.id,
          performsPh: true,
          phResult: "APROBADO",
        },
      ],
    });
    expect(JSON.stringify(edited)).not.toMatch(/costs|supplierId|25\.25/);
    expect(
      (
        await operator.agent
          .get(`/api/service-drafts/${created.id}`)
          .expect(200)
      ).body,
    ).toEqual(edited);
    expect(
      (await admin.agent.get(`/api/service-drafts/${created.id}`).expect(200))
        .body.items[0].costs,
    ).toEqual(created.items[0].costs);
    expect(
      (await admin.agent.get("/api/audit?limit=100").expect(200)).body.items,
    ).toContainEqual(
      expect.objectContaining({
        action: "BORRADOR_SERVICIO_ACTUALIZADO",
        entityId: created.id,
        actorId: operatorUser.id,
      }),
    );
    expect(
      (
        await operator.agent
          .get(`/api/components/${component.id}/history`)
          .expect(200)
      ).body.available,
    ).toBe(true);
    await operator.agent
      .patch(`/api/service-drafts/${created.id}`)
      .set(operator.headers)
      .send({ version: 2, items: [{ ...item, costs: [] }] })
      .expect(403);
    expect(
      (await admin.agent.get(`/api/service-drafts/${created.id}`).expect(200))
        .body.version,
    ).toBe(2);
  });
  it("permite iniciar con varios contactos vigentes sin elegir arbitrariamente el contacto del servicio", async () => {
    const admin = await signedIn(app);
    const vehicle = (
      await admin.agent
        .post("/api/vehicles")
        .set(admin.headers)
        .send({ plate: "AD345EF", brand: "Marca", model: "Modelo", year: 2020 })
        .expect(201)
    ).body;
    for (const documentNumber of ["11112222", "33334444"]) {
      const person = (
        await admin.agent
          .post("/api/people")
          .set(admin.headers)
          .send({
            type: "FISICA",
            name: `Contacto ${documentNumber}`,
            documentType: "DNI",
            documentNumber,
          })
          .expect(201)
      ).body;
      await admin.agent
        .post(`/api/vehicles/${vehicle.id}/relationships`)
        .set(admin.headers)
        .send({ personId: person.id, role: "CONTACTO", from: "2026-01-01" })
        .expect(201);
    }
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          code: "CONTACTOS-DRAFT",
          name: "Trabajo",
          description: "Trabajo",
          type: "OTRO",
          suggestedPrice: "0",
          items: [],
        })
        .expect(201)
    ).body;
    const created = (
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
    expect(created.people).toEqual([]);
  });
  it("rechaza cambios ambiguos y ediciones concurrentes sin sobrescribir preparación, importes ni auditoría", async () => {
    const admin = await signedIn(app);
    const vehicle = (
      await admin.agent
        .post("/api/vehicles")
        .set(admin.headers)
        .send({ plate: "AE456FG", brand: "Marca", model: "Modelo", year: 2020 })
        .expect(201)
    ).body;
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          code: "CONFLICTO-DRAFT",
          name: "Trabajo",
          description: "Trabajo",
          type: "OTRO",
          suggestedPrice: "10.10",
          items: [
            {
              order: 1,
              description: "Original",
              type: "MANO_OBRA",
              quantity: "1",
              unitPrice: "10.10",
              unitCost: "1",
            },
          ],
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
    const item = {
      id: draft.items[0].id,
      order: 1,
      description: "Ajustado",
      type: "MANO_OBRA",
      quantity: "1",
      unitPrice: "20.20",
      discount: "0",
    };
    const auditBefore = (
      await admin.agent.get("/api/audit?limit=100").expect(200)
    ).body.items;
    for (const change of [
      { preparation: [] },
      { preparation: "inválida" },
      { items: null },
      { version: null },
      { items: [[]] },
      { people: [[]] },
      { interventions: [[]] },
      { items: [{ ...item, costs: [[]] }] },
      { totalAmount: "1e2" },
      { totalAmount: 12.3 },
      { status: "CONFIRMADO" },
      { createdBy: "1" },
      { serviceDate: "2026-02-30" },
      { serviceDate: "0000-01-01" },
      { preparation: { enabledOn: "2026-12-01", expiresOn: "2026-11-01" } },
      { items: [item, item] },
      { items: [{ ...item, id: "999999" }] },
      { items: [{ ...item, discount: "20.21" }] },
      {
        items: [
          {
            ...item,
            costs: [
              {
                concept: "Proveedor inválido",
                treatment: "PROVEEDOR",
                supplierId: "999999",
                amount: "5",
              },
            ],
          },
        ],
      },
      {
        items: [item],
        interventions: [
          { type: "CILINDRO", row: 1, performsPh: true, componentId: "999999" },
        ],
      },
      { interventions: [{ type: "REGULADOR", row: 4, performsPh: false }] },
      {
        interventions: [
          { type: "CILINDRO", row: 1, performsPh: false, unknown: "dato" },
        ],
      },
    ]) {
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({ version: 1, ...change })
        .expect(400);
      expect(
        (await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200))
          .body,
      ).toEqual(draft);
    }
    expect(
      (await admin.agent.get("/api/audit?limit=100").expect(200)).body.items,
    ).toEqual(auditBefore);
    const edits = await Promise.all(
      ["A", "B"].map((notes) =>
        admin.agent
          .patch(`/api/service-drafts/${draft.id}`)
          .set(admin.headers)
          .send({ version: 1, notes }),
      ),
    );
    expect(edits.map((edit) => edit.status).sort()).toEqual([200, 409]);
    expect(
      (await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200))
        .body,
    ).toEqual(edits.find((edit) => edit.status === 200)!.body);
    const auditAfter = (
      await admin.agent.get("/api/audit?limit=100").expect(200)
    ).body.items;
    expect(auditAfter).toContainEqual(
      expect.objectContaining({
        entityId: draft.id,
        action: "BORRADOR_SERVICIO_ACTUALIZADO",
        detail: "Versión 1 → 2. Campos actualizados: notes.",
      }),
    );
    expect(
      auditAfter.filter(
        (event: { action: string; entityId: string }) =>
          event.action === "BORRADOR_SERVICIO_ACTUALIZADO" &&
          event.entityId === draft.id,
      ),
    ).toHaveLength(1);
    await admin.agent
      .patch(`/api/service-drafts/${draft.id}`)
      .send({ version: 2, notes: "Sin CSRF" })
      .expect(403);
    await request(app.getHttpServer()).get("/api/service-drafts").expect(401);
    await admin.agent.get("/api/service-drafts?includeCosts=true").expect(400);
    await admin.agent
      .post(`/api/service-drafts/${draft.id}/confirm`)
      .set(admin.headers)
      .send({})
      .expect(400);
  });
  it("ajusta costos autorizados e ítems con redondeo decimal, conserva referencias dadas de baja y permite quitar lo descartado", async () => {
    const admin = await signedIn(app);
    const vehicle = (
      await admin.agent
        .post("/api/vehicles")
        .set(admin.headers)
        .send({ plate: "AF567GH", brand: "Marca", model: "Modelo", year: 2020 })
        .expect(201)
    ).body;
    const person = (
      await admin.agent
        .post("/api/people")
        .set(admin.headers)
        .send({
          type: "FISICA",
          name: "Titular conservado",
          documentType: "DNI",
          documentNumber: "55556666",
        })
        .expect(201)
    ).body;
    await admin.agent
      .post(`/api/vehicles/${vehicle.id}/relationships`)
      .set(admin.headers)
      .send({ personId: person.id, role: "TITULAR", from: "2026-01-01" })
      .expect(201);
    const supplier = (
      await admin.agent
        .post("/api/suppliers")
        .set(admin.headers)
        .send({ name: "Proveedor conservado borrador" })
        .expect(201)
    ).body;
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          code: "COSTOS-DRAFT",
          name: "Trabajo",
          description: "Trabajo",
          type: "OTRO",
          suggestedPrice: "0.13",
          items: [
            {
              order: 1,
              description: "Concepto fraccionario",
              type: "MANO_OBRA",
              quantity: "1.25",
              unitPrice: "0.10",
              unitCost: "0.10",
              supplierId: supplier.id,
            },
          ],
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
    expect(draft.items[0]).toMatchObject({
      amount: "0.13",
      costs: [{ amount: "0.13", supplierId: supplier.id }],
    });
    for (const path of [
      `vehicles/${vehicle.id}`,
      `people/${person.id}`,
      `suppliers/${supplier.id}`,
      `catalog-services/${offer.id}`,
    ])
      await admin.agent
        .patch(`/api/${path}`)
        .set(admin.headers)
        .send({ active: false })
        .expect(200);
    const original = {
      id: draft.items[0].id,
      order: 2,
      description: "Concepto histórico",
      type: "MANO_OBRA",
      quantity: "1.25",
      unitPrice: "0.10",
      discount: "0",
      costs: [
        {
          concept: "Costo revisado",
          supplierId: supplier.id,
          treatment: "PROVEEDOR",
          amount: "0.15",
        },
        { concept: "Costo interno", treatment: "ABSORBIDO", amount: "1.01" },
      ],
    };
    const added = {
      order: 1,
      description: "Retiro sin cargo",
      type: "MANO_OBRA",
      quantity: "1",
      unitPrice: "0",
      discount: "0",
      costs: [],
    };
    const updated = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: 1,
          vehicleId: vehicle.id,
          people: [{ role: "TITULAR", personId: person.id }],
          items: [original, added],
        })
        .expect(200)
    ).body;
    expect(updated.items).toMatchObject([
      { order: 1, amount: "0.00", costs: [] },
      {
        id: draft.items[0].id,
        order: 2,
        amount: "0.13",
        costs: [{ amount: "0.15" }, { amount: "1.01" }],
      },
    ]);
    await admin.agent
      .post("/api/service-drafts")
      .set(admin.headers)
      .send({
        vehicleId: vehicle.id,
        catalogOfferId: offer.id,
        serviceDate: "2026-10-02",
      })
      .expect(400);
    await admin.agent
      .patch(`/api/service-drafts/${draft.id}`)
      .set(admin.headers)
      .send({ version: 2, people: [{ role: "PAGADOR", personId: person.id }] })
      .expect(400);
    const emptied = (
      await admin.agent
        .patch(`/api/service-drafts/${draft.id}`)
        .set(admin.headers)
        .send({
          version: 2,
          items: [],
          people: [],
          preparation: null,
          interventions: [],
        })
        .expect(200)
    ).body;
    expect(emptied).toMatchObject({
      version: 3,
      items: [],
      people: [],
      preparation: null,
      interventions: [],
    });
    expect(
      (await admin.agent.get(`/api/service-drafts/${draft.id}`).expect(200))
        .body,
    ).toEqual(emptied);
  });
});
