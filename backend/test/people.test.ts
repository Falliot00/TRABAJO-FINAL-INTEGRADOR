import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { signedIn } from "./session";

describe("Personas y vehículos del taller", () => {
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

  it("recupera personas por documento o nombre, anticipa duplicados y conserva datos editables", async () => {
    await request(app.getHttpServer()).get("/api/people").expect(401);
    const admin = await signedIn(app);
    const created = await admin.agent
      .post("/api/people")
      .set(admin.headers)
      .send({
        type: "FISICA",
        name: " Persona sintética ",
        documentType: "DNI",
        documentNumber: "01.234.567",
        street: "Calle sintética",
        streetNumber: "010",
        email: "PERSONA@example.test",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: "Persona sintética",
      documentNumber: "01234567",
      streetNumber: "010",
      email: "persona@example.test",
      active: true,
    });
    const exact = await admin.agent.get("/api/people?q=01.234.567").expect(200);
    expect(exact.body.items).toEqual([created.body]);
    const matches = await admin.agent
      .get(
        "/api/people/duplicates?documentType=DNI&documentNumber=01234567&name=Persona",
      )
      .expect(200);
    expect(matches.body.items).toContainEqual(created.body);
    const similar = await admin.agent
      .get("/api/people/duplicates?name=persona%20sint")
      .expect(200);
    expect(similar.body.items).toContainEqual(created.body);
    await admin.agent
      .post("/api/people")
      .set(admin.headers)
      .send({
        type: "FISICA",
        name: "Otra persona",
        documentType: "DNI",
        documentNumber: "01234567",
      })
      .expect(409);
    const updated = await admin.agent
      .patch(`/api/people/${created.body.id}`)
      .set(admin.headers)
      .send({
        name: "Persona actualizada",
        street: null,
        email: null,
        active: false,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      street: null,
      email: null,
      active: false,
    });
    expect(
      (await admin.agent.get(`/api/people/${created.body.id}`).expect(200))
        .body,
    ).toEqual(updated.body);
    expect(
      (
        await admin.agent
          .get(
            `/api/people/duplicates?documentType=DNI&documentNumber=01234567&excludeId=${created.body.id}`,
          )
          .expect(200)
      ).body.items,
    ).toEqual([]);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toContainEqual(
      expect.objectContaining({
        action: "PERSONA_ACTUALIZADA",
        entity: "personas",
        entityId: created.body.id,
        actorId: "9007199254740993",
        detail: "Campos actualizados: name, street, email, active.",
      }),
    );
  });
  it("registra vehículos con dominio normalizado, muestra duplicados y permite editar sin confundir datos desconocidos", async () => {
    const admin = await signedIn(app);
    const input = {
      plate: " ab 123 cd ",
      brand: "Marca sintética",
      model: "Modelo sintético",
      year: 2024,
      type: "OTROS",
      otherTypeDetail: "Clasificación sintética",
      engineNumber: "000ABC",
    };
    const concurrent = await Promise.all(
      [0, 1].map(() =>
        admin.agent.post("/api/vehicles").set(admin.headers).send(input),
      ),
    );
    expect(concurrent.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const vehicle = concurrent.find(
      (response) => response.status === 201,
    )!.body;
    expect(vehicle).toMatchObject({
      plate: "AB123CD",
      injection: null,
      engineNumber: "000ABC",
    });
    expect(
      (await admin.agent.get("/api/vehicles?q=ab-123-cd").expect(200)).body
        .items,
    ).toEqual([vehicle]);
    expect(
      (
        await admin.agent
          .get("/api/vehicles/duplicates?plate=AB123CD")
          .expect(200)
      ).body.items,
    ).toEqual([vehicle]);
    await admin.agent
      .patch(`/api/vehicles/${vehicle.id}`)
      .set(admin.headers)
      .send({ type: "PARTICULAR" })
      .expect(400);
    const updated = await admin.agent
      .patch(`/api/vehicles/${vehicle.id}`)
      .set(admin.headers)
      .send({
        type: "PARTICULAR",
        otherTypeDetail: null,
        injection: false,
        engineNumber: null,
        active: false,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      type: "PARTICULAR",
      otherTypeDetail: null,
      injection: false,
      engineNumber: null,
      active: false,
    });
    const detail = await admin.agent
      .get(`/api/vehicles/${vehicle.id}`)
      .expect(200);
    expect(detail.body).toMatchObject({ ...updated.body, relationships: [] });
    for (const data of [
      { plate: "INVALIDA" },
      { year: 2201 },
      { year: 2024.5 },
      { plate: null },
      { active: null },
      { injection: "false" },
      { type: "OTROS", otherTypeDetail: null },
    ]) {
      await admin.agent
        .patch(`/api/vehicles/${vehicle.id}`)
        .set(admin.headers)
        .send(data)
        .expect(400);
    }
    expect(
      (
        await admin.agent
          .get(`/api/vehicles/duplicates?plate=AB123CD&excludeId=${vehicle.id}`)
          .expect(200)
      ).body.items,
    ).toEqual([]);
    const audit = await admin.agent.get("/api/audit").expect(200);
    expect(audit.body.items).toContainEqual(
      expect.objectContaining({
        action: "VEHICULO_ACTUALIZADO",
        entityId: vehicle.id,
      }),
    );
  });
  it("permite al operador recuperar vehículos de una persona y cambiar titular sin perder contactos ni historia", async () => {
    const admin = await signedIn(app);
    await admin.agent
      .post("/api/users")
      .set(admin.headers)
      .send({
        name: "Operador personas",
        email: "people@example.test",
        password: "Synthetic-operator-2026!",
        role: "OPERADOR",
      })
      .expect(201);
    const operator = await signedIn(
      app,
      "people@example.test",
      "Synthetic-operator-2026!",
    );
    const people = [];
    for (const documentNumber of ["20100101", "20100102", "20100103"]) {
      const person = await operator.agent
        .post("/api/people")
        .set(operator.headers)
        .send({
          type: "FISICA",
          name: `Persona ${documentNumber}`,
          documentType: "DNI",
          documentNumber,
        })
        .expect(201);
      people.push(person.body);
    }
    const vehicle = (
      await operator.agent
        .post("/api/vehicles")
        .set(operator.headers)
        .send({
          plate: "XYZ123",
          brand: "Marca sintética",
          model: "Modelo",
          year: 2005,
        })
        .expect(201)
    ).body;
    const path = `/api/vehicles/${vehicle.id}/relationships`;
    const initial = await operator.agent
      .post(path)
      .set(operator.headers)
      .send({ personId: people[0].id, role: "TITULAR", from: "2020-01-01" })
      .expect(201);
    expect(initial.body.relationships).toContainEqual(
      expect.objectContaining({
        personId: people[0].id,
        from: "2020-01-01",
        until: null,
      }),
    );
    const withContact = await operator.agent
      .post(path)
      .set(operator.headers)
      .send({ personId: people[1].id, role: "CONTACTO", from: "2021-01-01" })
      .expect(201);
    const contact = withContact.body.relationships.find(
      (link: { role: string }) => link.role === "CONTACTO",
    );
    await operator.agent
      .post(path)
      .set(operator.headers)
      .send({ personId: people[1].id, role: "CONTACTO", from: "2021-02-01" })
      .expect(409);
    const transfers = await Promise.all(
      [people[1], people[2]].map((person) =>
        operator.agent
          .post(path)
          .set(operator.headers)
          .send({ personId: person.id, role: "TITULAR", from: "2022-01-01" }),
      ),
    );
    expect(transfers.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const history = (
      await operator.agent.get(`/api/vehicles/${vehicle.id}`).expect(200)
    ).body;
    expect(history.relationships).toHaveLength(3);
    expect(
      history.relationships.filter(
        (link: { role: string; until: string | null }) =>
          link.role === "TITULAR" && link.until === null,
      ),
    ).toHaveLength(1);
    expect(history.relationships).toContainEqual(
      expect.objectContaining({
        personId: people[0].id,
        from: "2020-01-01",
        until: "2022-01-01",
        person: expect.objectContaining({ documentNumber: "20100101" }),
      }),
    );
    const recovered = await operator.agent
      .get(`/api/vehicles?personId=${people[0].id}`)
      .expect(200);
    expect(recovered.body.items).toContainEqual(vehicle);
    await operator.agent
      .patch(`${path}/${contact.id}`)
      .set(operator.headers)
      .send({ until: "2021-01-01" })
      .expect(400);
    await operator.agent
      .patch(`${path}/${contact.id}`)
      .set(operator.headers)
      .send({ until: "2021-02-30" })
      .expect(400);
    const closed = await operator.agent
      .patch(`${path}/${contact.id}`)
      .set(operator.headers)
      .send({ until: "2023-01-01" })
      .expect(200);
    expect(closed.body.relationships).toContainEqual(
      expect.objectContaining({ id: contact.id, until: "2023-01-01" }),
    );
    await operator.agent
      .post(path)
      .set(operator.headers)
      .send({ personId: people[0].id, role: "TITULAR", from: "2021-01-01" })
      .expect(409);
    await operator.agent
      .post(path)
      .set(operator.headers)
      .send({ personId: people[0].id, role: "PAGADOR", from: "2024-01-01" })
      .expect(400);
    const actorId = (await operator.agent.get("/api/auth/session")).body.user
      .id;
    const audit = await admin.agent.get("/api/audit?limit=100").expect(200);
    expect(audit.body.items).toContainEqual(
      expect.objectContaining({
        action: "VINCULO_VEHICULO_CERRADO",
        entityId: contact.id,
        actorId,
      }),
    );
    await operator.agent.get("/api/audit").expect(403);
  });
  it("valida documentos también al editar y pagina resultados sin aceptar filtros de identidad vacíos", async () => {
    const admin = await signedIn(app);
    const input = {
      type: "JURIDICA",
      name: "Listado especial uno",
      documentType: "CUIT",
      documentNumber: "20-12345678-6",
    };
    const taxPerson = (
      await admin.agent
        .post("/api/people")
        .set(admin.headers)
        .send(input)
        .expect(201)
    ).body;
    await admin.agent
      .post("/api/people")
      .set(admin.headers)
      .send({
        type: "FISICA",
        name: "Listado especial dos",
        documentType: "PASAPORTE",
        documentNumber: "AA000001",
      })
      .expect(201);
    for (const data of [
      { documentNumber: "20123456789" },
      { documentType: "DNI" },
      { name: null },
      { active: null },
      { email: "inválido" },
      { unknown: "campo" },
    ]) {
      await admin.agent
        .patch(`/api/people/${taxPerson.id}`)
        .set(admin.headers)
        .send(data)
        .expect(400);
    }
    const original = await admin.agent
      .get(`/api/people/${taxPerson.id}`)
      .expect(200);
    expect(original.body).toEqual(taxPerson);
    const first = await admin.agent
      .get("/api/people?q=Listado%20especial&limit=1")
      .expect(200);
    expect(first.body.items).toHaveLength(1);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await admin.agent
      .get(
        `/api/people?q=Listado%20especial&limit=1&cursor=${first.body.nextCursor}`,
      )
      .expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].id).not.toBe(first.body.items[0].id);
    expect(second.body.nextCursor).toBeNull();
    await admin.agent.get("/api/people?cursor=").expect(400);
    await admin.agent.get("/api/vehicles?personId=").expect(400);
    await admin.agent.get("/api/people?cursor=9223372036854775808").expect(400);
    await admin.agent.get("/api/people?active=invalid").expect(400);
    await admin.agent.get("/api/people?q=one&q=two").expect(400);
  });
});
