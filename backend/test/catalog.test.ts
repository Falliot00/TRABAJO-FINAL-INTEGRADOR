import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { signedIn } from "./session";

describe("Proveedores y catálogo propuesto", () => {
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

  it("recupera proveedores por CUIT y nombre, evita duplicados y conserva su baja auditada", async () => {
    await request(app.getHttpServer()).get("/api/suppliers").expect(401);
    const admin = await signedIn(app);
    const created = await admin.agent
      .post("/api/suppliers")
      .set(admin.headers)
      .send({
        name: " Proveedor sintético ",
        cuit: "20-12345678-6",
        email: "PROVEEDOR@example.test",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: "Proveedor sintético",
      cuit: "20123456786",
      email: "proveedor@example.test",
      active: true,
    });
    expect(
      (await admin.agent.get("/api/suppliers?q=20-12345678-6").expect(200)).body
        .items,
    ).toEqual([created.body]);
    expect(
      (await admin.agent.get("/api/suppliers?q=sintético").expect(200)).body
        .items,
    ).toEqual([created.body]);
    expect(
      (
        await admin.agent
          .get("/api/suppliers/duplicates?cuit=20-12345678-6")
          .expect(200)
      ).body.items,
    ).toEqual([created.body]);
    await admin.agent
      .post("/api/suppliers")
      .set(admin.headers)
      .send({ name: "Duplicado", cuit: "20123456786" })
      .expect(409);
    await admin.agent
      .post("/api/suppliers")
      .set(admin.headers)
      .send({ name: "CUIT inválido", cuit: "20123456780" })
      .expect(400);
    const updated = await admin.agent
      .patch(`/api/suppliers/${created.body.id}`)
      .set(admin.headers)
      .send({ active: false, email: null })
      .expect(200);
    expect(
      (await admin.agent.get(`/api/suppliers/${created.body.id}`).expect(200))
        .body,
    ).toEqual(updated.body);
    expect(
      (await admin.agent.get("/api/suppliers?active=true").expect(200)).body
        .items,
    ).toEqual([]);
    expect(
      (await admin.agent.get("/api/audit").expect(200)).body.items,
    ).toContainEqual(
      expect.objectContaining({
        action: "PROVEEDOR_ACTUALIZADO",
        entity: "proveedores",
        entityId: created.body.id,
        actorId: "9007199254740993",
      }),
    );
  });

  it("conserva importes exactos y composición editable de una oferta sin cambiar la identidad de sus ítems", async () => {
    const admin = await signedIn(app);
    const supplier = (
      await admin.agent
        .post("/api/suppliers")
        .set(admin.headers)
        .send({ name: "Proveedor de composición" })
        .expect(201)
    ).body;
    const created = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          code: " anual-base ",
          name: "Revisión anual",
          description: "Revisión y oblea propuesta",
          type: "REVISION_ANUAL",
          suggestedPrice: "999999999999.99",
          items: [
            {
              order: 1,
              description: "Inspección",
              type: "INSPECCION",
              quantity: "1.25",
              unitPrice: "10.10",
              unitCost: "0.10",
            },
            {
              order: 2,
              description: "Oblea",
              type: "OBLEA",
              quantity: "1",
              unitPrice: "0.20",
              unitCost: "0.15",
              supplierId: supplier.id,
            },
          ],
        })
        .expect(201)
    ).body;
    expect(created).toMatchObject({
      code: "ANUAL-BASE",
      suggestedPrice: "999999999999.99",
      items: [
        {
          order: 1,
          quantity: "1.25",
          unitPrice: "10.10",
          unitCost: "0.10",
          supplierId: null,
        },
        {
          order: 2,
          quantity: "1.00",
          unitPrice: "0.20",
          unitCost: "0.15",
          supplierId: supplier.id,
        },
      ],
    });
    expect(
      (await admin.agent.get(`/api/catalog-services/${created.id}`).expect(200))
        .body,
    ).toEqual(created);
    expect(
      (await admin.agent.get("/api/catalog-services?q=anual-base").expect(200))
        .body.items,
    ).toEqual([created]);
    expect(
      (
        await admin.agent
          .get("/api/catalog-services/duplicates?code=anual-base")
          .expect(200)
      ).body.items,
    ).toEqual([created]);
    const updated = (
      await admin.agent
        .patch(`/api/catalog-services/${created.id}`)
        .set(admin.headers)
        .send({
          suggestedPrice: "20.30",
          active: false,
          items: [
            { ...created.items[1], order: 1 },
            { ...created.items[0], order: 2, unitPrice: "20.10" },
          ],
        })
        .expect(200)
    ).body;
    expect(updated).toMatchObject({
      suggestedPrice: "20.30",
      active: false,
      items: [
        { id: created.items[1].id, order: 1 },
        { id: created.items[0].id, order: 2, unitPrice: "20.10" },
      ],
    });
    expect(
      (await admin.agent.get(`/api/catalog-services/${created.id}`).expect(200))
        .body,
    ).toEqual(updated);
    await admin.agent
      .post("/api/catalog-services")
      .set(admin.headers)
      .send({
        code: "anual-base",
        name: "Duplicada",
        description: "Duplicada",
        type: "OTRO",
        suggestedPrice: "0",
        items: [],
      })
      .expect(409);
    expect(
      (await admin.agent.get("/api/audit").expect(200)).body.items,
    ).toContainEqual(
      expect.objectContaining({
        action: "OFERTA_ACTUALIZADA",
        entity: "catalogo_servicios",
        entityId: created.id,
        actorId: "9007199254740993",
      }),
    );
  });
  it("rechaza referencias nuevas inactivas y composiciones ambiguas sin guardar parcialmente ni auditar éxito", async () => {
    const admin = await signedIn(app);
    const supplier = (
      await admin.agent
        .post("/api/suppliers")
        .set(admin.headers)
        .send({ name: "Proveedor conservado" })
        .expect(201)
    ).body;
    const item = {
      order: 1,
      description: "PH propuesta",
      type: "ENSAYO_PH",
      quantity: "1",
      unitPrice: "10",
      unitCost: "5",
      supplierId: supplier.id,
    };
    const input = {
      code: "QUINQUENAL-VALIDACION",
      name: "Quinquenal",
      description: "Propuesta",
      type: "REVISION_QUINQUENAL",
      suggestedPrice: "10",
      items: [item],
    };
    const created = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send(input)
        .expect(201)
    ).body;
    await admin.agent
      .patch(`/api/suppliers/${supplier.id}`)
      .set(admin.headers)
      .send({ active: false })
      .expect(200);
    await admin.agent
      .post("/api/catalog-services")
      .set(admin.headers)
      .send({ ...input, code: "INACTIVA" })
      .expect(400);
    const retained = (
      await admin.agent
        .patch(`/api/catalog-services/${created.id}`)
        .set(admin.headers)
        .send({
          name: "Quinquenal ajustada",
          items: created.items,
        })
        .expect(200)
    ).body;
    const beforeAudit = (
      await admin.agent.get("/api/audit?limit=100").expect(200)
    ).body.items;
    for (const data of [
      { name: "No debe guardarse", items: [{ ...item, supplierId: "999999" }] },
      {
        name: "No debe guardarse",
        items: [
          { ...item, supplierId: null },
          { ...item, supplierId: null },
        ],
      },
      { items: [created.items[0], { ...created.items[0], order: 2 }] },
      { items: [{ ...created.items[0], id: "999999" }] },
      { items: [{ ...item, supplierId: null, quantity: "0" }] },
      { items: [{ ...item, supplierId: null, unitCost: "0.001" }] },
      { items: [{ ...item, supplierId: null, unknown: "campo" }] },
      { suggestedPrice: 10.5 },
      { suggestedPrice: "1e2" },
      { suggestedPrice: "-1" },
      { suggestedPrice: "1000000000000" },
      { items: null },
      { active: null },
    ]) {
      await admin.agent
        .patch(`/api/catalog-services/${created.id}`)
        .set(admin.headers)
        .send(data)
        .expect(400);
      expect(
        (
          await admin.agent
            .get(`/api/catalog-services/${created.id}`)
            .expect(200)
        ).body,
      ).toEqual(retained);
    }
    expect(
      (await admin.agent.get("/api/audit?limit=100").expect(200)).body.items,
    ).toEqual(beforeAudit);
    const emptied = (
      await admin.agent
        .patch(`/api/catalog-services/${created.id}`)
        .set(admin.headers)
        .send({ items: [] })
        .expect(200)
    ).body;
    expect(emptied.items).toEqual([]);
  });

  it("limita al operador a datos comerciales y rechaza administración directa, CSRF y filtros inventados", async () => {
    const admin = await signedIn(app);
    await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({
        name: "Operador catálogo",
        email: "catalog@example.test",
        password: "Synthetic-operator-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const operator = await signedIn(
      app,
      "catalog@example.test",
      "Synthetic-operator-2026!",
    );
    const supplier = (
      await admin.agent
        .post("/api/suppliers")
        .set(admin.headers)
        .send({ name: "Proveedor restringido" })
        .expect(201)
    ).body;
    const input = {
      code: "OPERADOR",
      name: "Oferta visible",
      description: "Revisión y oblea",
      type: "REVISION_ANUAL",
      suggestedPrice: "100.10",
      items: [
        {
          order: 1,
          description: "Oblea",
          type: "OBLEA",
          quantity: "1",
          unitPrice: "100.10",
          unitCost: "75.05",
          supplierId: supplier.id,
        },
      ],
    };
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send(input)
        .expect(201)
    ).body;
    for (const path of [
      "/api/catalog-services?q=OPERADOR",
      `/api/catalog-services/${offer.id}`,
      "/api/catalog-services/duplicates?code=OPERADOR",
    ]) {
      const response = await operator.agent.get(path).expect(200);
      const visible = response.body.id ? response.body : response.body.items[0];
      expect(visible).toMatchObject({
        code: "OPERADOR",
        suggestedPrice: "100.10",
        items: [{ unitPrice: "100.10" }],
      });
      expect(JSON.stringify(response.body)).not.toMatch(
        /unitCost|supplierId|75\.05/,
      );
    }
    for (const path of [
      "/api/suppliers",
      `/api/suppliers/${supplier.id}`,
      "/api/suppliers/duplicates?cuit=20123456786",
    ])
      await operator.agent.get(path).expect(403);
    await operator.agent
      .post("/api/suppliers")
      .set(operator.headers)
      .send({ name: "Bloqueado" })
      .expect(403);
    await operator.agent
      .patch(`/api/suppliers/${supplier.id}`)
      .set(operator.headers)
      .send({ active: false })
      .expect(403);
    await operator.agent
      .post("/api/catalog-services")
      .set(operator.headers)
      .send(input)
      .expect(403);
    await operator.agent
      .patch(`/api/catalog-services/${offer.id}`)
      .set(operator.headers)
      .send({ active: false })
      .expect(403);
    await admin.agent
      .patch(`/api/catalog-services/${offer.id}`)
      .send({ active: false })
      .expect(403);
    await admin.agent
      .post("/api/suppliers")
      .send({ name: "Sin CSRF" })
      .expect(403);
    await operator.agent
      .get("/api/catalog-services?includeCosts=true")
      .expect(400);
    await request(app.getHttpServer()).get("/api/catalog-services").expect(401);
  });

  it("serializa ofertas duplicadas y revierte composición y auditoría si falla el cambio de código", async () => {
    const admin = await signedIn(app);
    const input = {
      code: "CONCURRENTE",
      name: "Oferta única",
      description: "Propuesta",
      type: "OTRO",
      suggestedPrice: "0",
      items: [],
    };
    const concurrent = await Promise.all(
      [0, 1].map(() =>
        admin.agent
          .post("/api/catalog-services")
          .set(admin.headers)
          .send(input),
      ),
    );
    expect(concurrent.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const offer = (
      await admin.agent
        .post("/api/catalog-services")
        .set(admin.headers)
        .send({
          ...input,
          code: "TRANSACCION",
          items: [
            {
              order: 1,
              description: "Trabajo propuesto",
              type: "MANO_OBRA",
              quantity: "2",
              unitPrice: "0.10",
              unitCost: "0",
            },
          ],
        })
        .expect(201)
    ).body;
    const beforeAudit = (
      await admin.agent.get("/api/audit?limit=100").expect(200)
    ).body.items;
    await admin.agent
      .patch(`/api/catalog-services/${offer.id}`)
      .set(admin.headers)
      .send({ code: "CONCURRENTE", items: [] })
      .expect(409);
    expect(
      (await admin.agent.get(`/api/catalog-services/${offer.id}`).expect(200))
        .body,
    ).toEqual(offer);
    expect(
      (await admin.agent.get("/api/audit?limit=100").expect(200)).body.items,
    ).toEqual(beforeAudit);
    const first = (
      await admin.agent.get("/api/catalog-services?limit=1").expect(200)
    ).body;
    const next = (
      await admin.agent
        .get(`/api/catalog-services?limit=1&cursor=${first.nextCursor}`)
        .expect(200)
    ).body;
    expect(next.items[0].id).not.toBe(first.items[0].id);
    expect(
      (
        await admin.agent
          .get(
            `/api/catalog-services/duplicates?code=TRANSACCION&excludeId=${offer.id}`,
          )
          .expect(200)
      ).body.items,
    ).toEqual([]);
  });
});
