import type { INestApplication } from "@nestjs/common";
import type {
  AuditPage,
  InitialEquipmentSurvey,
  InitialEquipmentSurveyInput,
  VehicleConfigurations,
} from "@cilgas/contracts";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import request from "supertest";
import { createApplication } from "../src/app";
import { prepareTestDatabase } from "./database";
import { prepareConfirmation } from "./service-confirmation-fixture";
import { signedIn } from "./session";

type Fixture = Awaited<ReturnType<typeof prepareConfirmation>>;

function surveyInput(fixture: Fixture): InitialEquipmentSurveyInput {
  return {
    idempotencyKey: randomUUID(),
    regulatorId: fixture.regulator.id,
    pairs: [
      {
        position: 1,
        cylinderId: fixture.component.id,
        valveId: fixture.valve.id,
        ph: { testDate: "2024-09", crpcId: fixture.actors.CRPC },
      },
    ],
    sticker: { number: `PREV-${fixture.vehicleId}`, expiresOn: "2027-09-30" },
  };
}

const register = (fixture: Fixture, input: InitialEquipmentSurveyInput) =>
  fixture.admin.agent
    .post(`/api/vehicles/${fixture.vehicleId}/configurations/initial-survey`)
    .set(fixture.admin.headers)
    .send(input);

async function configurations(fixture: Fixture) {
  return (
    await fixture.admin.agent
      .get(`/api/vehicles/${fixture.vehicleId}/configurations`)
      .expect(200)
  ).body as VehicleConfigurations;
}

async function surveyEvents(fixture: Fixture, configurationId?: string) {
  const audit = (
    await fixture.admin.agent.get("/api/audit?limit=100").expect(200)
  ).body as AuditPage;
  return audit.items.filter(
    (event) =>
      event.action === "EQUIPO_RELEVADO" &&
      (configurationId === undefined || event.entityId === configurationId),
  );
}

describe("Garantías del relevamiento inicial por HTTP", () => {
  let app: INestApplication;
  let dispose: () => Promise<void>;
  let databaseUrl: string;
  beforeAll(async () => {
    const database = await prepareTestDatabase();
    dispose = database.dispose;
    databaseUrl = database.url;
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

  async function isolatedConnection() {
    const schema = new URL(databaseUrl).searchParams.get("schema");
    if (!schema || !/^test_[a-f0-9]{32}$/.test(schema))
      throw new Error("La fixture requiere su esquema efímero aislado.");
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(`SET search_path TO "${schema}"`);
    return client;
  }

  it("reintenta concurrentemente la misma solicitud sin duplicar configuración ni auditoría", async () => {
    const fixture = await prepareConfirmation(app, 701);
    const input = surveyInput(fixture);
    const responses = await Promise.all(
      Array.from({ length: 3 }, () => register(fixture, input)),
    );
    expect(responses.map((response) => response.status)).toEqual([
      201, 201, 201,
    ]);
    const result = responses[0]!.body as InitialEquipmentSurvey;
    expect(responses[1]!.body).toEqual(result);
    expect(responses[2]!.body).toEqual(result);
    const history = await configurations(fixture);
    expect(history.configurations).toHaveLength(1);
    expect(history.configurations[0]).toMatchObject({
      id: result.configurationId,
      serviceId: null,
      initialSurvey: result,
    });
    expect(await surveyEvents(fixture, result.configurationId)).toHaveLength(1);
    await register(fixture, { ...input, idempotencyKey: randomUUID() }).expect(
      409,
    );
    await register(fixture, { ...input, notes: "Otra observación" }).expect(
      409,
    );
    expect((await register(fixture, input).expect(201)).body).toEqual(result);

    const other = await prepareConfirmation(app, 702);
    const otherInput = surveyInput(other);
    await register(other, {
      ...otherInput,
      idempotencyKey: input.idempotencyKey,
    }).expect(409);
    expect((await configurations(other)).configurations).toEqual([]);
    await register(other, otherInput).expect(201);
  });

  it("conserva una sola configuración ante dos relevamientos distintos del mismo vehículo", async () => {
    const fixture = await prepareConfirmation(app, 703);
    const first = surveyInput(fixture);
    const second = {
      ...first,
      idempotencyKey: randomUUID(),
      notes: "Otro registro",
    };
    const responses = await Promise.all([
      register(fixture, first),
      register(fixture, second),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const accepted = responses.find((response) => response.status === 201)!
      .body as InitialEquipmentSurvey;
    const history = await configurations(fixture);
    expect(history.configurations).toHaveLength(1);
    expect(history.configurations[0]!.initialSurvey).toEqual(accepted);
    expect(await surveyEvents(fixture, accepted.configurationId)).toHaveLength(
      1,
    );
  });

  it("impide que dos vehículos releven simultáneamente el mismo cilindro", async () => {
    const first = await prepareConfirmation(app, 704);
    const second = await prepareConfirmation(app, 705, first.component);
    const fixtures = [first, second];
    const responses = await Promise.all(
      fixtures.map((fixture) => register(fixture, surveyInput(fixture))),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const winnerIndex = responses.findIndex(
      (response) => response.status === 201,
    );
    const winner = fixtures[winnerIndex]!;
    const loser = fixtures[1 - winnerIndex]!;
    const accepted = responses[winnerIndex]!.body as InitialEquipmentSurvey;
    expect((await configurations(winner)).configurations).toHaveLength(1);
    expect((await configurations(loser)).configurations).toEqual([]);
    expect(await surveyEvents(winner, accepted.configurationId)).toHaveLength(
      1,
    );
    const history = (
      await winner.admin.agent
        .get(`/api/components/${first.component.id}/history`)
        .expect(200)
    ).body;
    expect(history).toMatchObject({
      activities: [],
      movements: [],
      revisions: [],
      cylinderValveLinks: [
        {
          configurationId: accepted.configurationId,
          cylinderId: first.component.id,
          valveId: winner.valve.id,
          serviceId: null,
        },
      ],
    });
    expect(history.initialSurveys).toHaveLength(1);
  });

  it("rechaza confirmar con una configuración revisada antes del relevamiento", async () => {
    const fixture = await prepareConfirmation(app, 706);
    const check = (
      await fixture.admin.agent
        .get(`/api/service-drafts/${fixture.draft.id}/confirmation-check`)
        .expect(200)
    ).body;
    expect(check).toMatchObject({
      canConfirm: true,
      currentConfigurationId: null,
      version: fixture.draft.version,
    });
    const registered = (
      await register(fixture, surveyInput(fixture)).expect(201)
    ).body as InitialEquipmentSurvey;
    await fixture.admin.agent
      .post(`/api/service-drafts/${fixture.draft.id}/confirm`)
      .set(fixture.admin.headers)
      .send({
        version: check.version,
        expectedConfigurationId: check.currentConfigurationId,
        idempotencyKey: randomUUID(),
      })
      .expect(409);
    expect(
      (
        await fixture.admin.agent
          .get(`/api/service-drafts/${fixture.draft.id}`)
          .expect(200)
      ).body,
    ).toEqual(fixture.draft);
    expect((await configurations(fixture)).currentConfigurationId).toBe(
      registered.configurationId,
    );
    await fixture.admin.agent
      .get(`/api/services/${fixture.draft.id}`)
      .expect(404);
    await fixture.admin.agent
      .get(`/api/services/${fixture.draft.id}/sheet`)
      .expect(404);
    expect(
      (
        await fixture.admin.agent
          .get(`/api/services/${fixture.draft.id}/obligations`)
          .expect(200)
      ).body.items,
    ).toEqual([]);
  });

  it("exige sesión, CSRF y permiso vigente, y revocar la sesión impide incluso repetir una solicitud exitosa", async () => {
    const fixture = await prepareConfirmation(app, 707);
    const input = surveyInput(fixture);
    const route = `/api/vehicles/${fixture.vehicleId}/configurations/initial-survey`;
    const anonymous = request.agent(app.getHttpServer());
    const csrf = (await anonymous.get("/api/auth/csrf").expect(200)).body;
    await anonymous
      .post(route)
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrf.csrfToken as string)
      .send(input)
      .expect(401);
    const user = (
      await fixture.admin.agent
        .post("/api/users")
        .set(fixture.admin.headers)
        .send({
          name: "Operador relevamiento",
          email: "survey-707@example.test",
          password: "Synthetic-survey-2026!",
          role: "OPERADOR",
        })
        .expect(201)
    ).body;
    const operator = await signedIn(
      app,
      "survey-707@example.test",
      "Synthetic-survey-2026!",
    );
    await operator.agent.post(route).send(input).expect(403);

    // Permission policy is external persistent configuration. Results remain
    // observable through HTTP; this fixture never inspects application writes.
    const policy = await isolatedConnection();
    try {
      await policy.query(
        "DELETE FROM roles_permisos WHERE rol_id = (SELECT id FROM roles WHERE codigo = 'OPERADOR') AND permiso_id = (SELECT id FROM permisos WHERE codigo = 'servicios.gestionar')",
      );
      await operator.agent
        .post(route)
        .set(operator.headers)
        .send(input)
        .expect(403);
      expect((await configurations(fixture)).configurations).toEqual([]);
    } finally {
      await policy.query(
        "INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r CROSS JOIN permisos p WHERE r.codigo = 'OPERADOR' AND p.codigo = 'servicios.gestionar' ON CONFLICT DO NOTHING",
      );
      await policy.end();
    }
    const accepted = (
      await operator.agent
        .post(route)
        .set(operator.headers)
        .send(input)
        .expect(201)
    ).body as InitialEquipmentSurvey;
    expect(accepted.recordedBy).toBe(user.id);
    expect(await surveyEvents(fixture, accepted.configurationId)).toEqual([
      expect.objectContaining({ actorId: user.id, result: "EXITO" }),
    ]);
    await fixture.admin.agent
      .post(`/api/users/${user.id}/revoke-sessions`)
      .set(fixture.admin.headers)
      .expect(204);
    await operator.agent
      .post(route)
      .set(operator.headers)
      .send(input)
      .expect(401);
    expect(
      (await configurations(fixture)).configurations[0]!.initialSurvey,
    ).toEqual(accepted);
  });

  it("revierte el relevamiento completo si falla el commit de auditoría y permite reintentar la misma solicitud", async () => {
    const fixture = await prepareConfirmation(app, 708);
    const input = surveyInput(fixture);
    const eventsBefore = await surveyEvents(fixture);
    const failure = await isolatedConnection();
    try {
      // A deferred database constraint rejects COMMIT independently of the
      // write order inside the application transaction.
      await failure.query(`CREATE FUNCTION reject_test_survey() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.accion = 'EQUIPO_RELEVADO' THEN RAISE EXCEPTION 'Synthetic survey commit failure'; END IF;
          RETURN NEW;
        END;
      $$`);
      await failure.query(`CREATE CONSTRAINT TRIGGER reject_test_survey
        AFTER INSERT ON auditoria DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION reject_test_survey()`);
      await register(fixture, input).expect(500);
    } finally {
      await failure.query(
        "DROP TRIGGER IF EXISTS reject_test_survey ON auditoria",
      );
      await failure.query("DROP FUNCTION IF EXISTS reject_test_survey()");
      await failure.end();
    }
    expect(await configurations(fixture)).toMatchObject({
      canRegisterInitialSurvey: true,
      currentConfigurationId: null,
      configurations: [],
    });
    expect(
      (
        await fixture.admin.agent
          .get(`/api/components/${fixture.component.id}/history`)
          .expect(200)
      ).body,
    ).toMatchObject({
      activities: [],
      movements: [],
      revisions: [],
      initialSurveys: [],
      cylinderValveLinks: [],
    });
    expect(await surveyEvents(fixture)).toEqual(eventsBefore);
    expect(
      (
        await fixture.admin.agent
          .get(`/api/service-drafts/${fixture.draft.id}`)
          .expect(200)
      ).body,
    ).toEqual(fixture.draft);
    const accepted = (await register(fixture, input).expect(201))
      .body as InitialEquipmentSurvey;
    expect((await configurations(fixture)).configurations).toHaveLength(1);
    expect(await surveyEvents(fixture, accepted.configurationId)).toHaveLength(
      1,
    );
    expect((await register(fixture, input).expect(201)).body).toEqual(accepted);
  });

  it("serializa el relevamiento y la confirmación concurrentes sobre el mismo vehículo", async () => {
    const fixture = await prepareConfirmation(app, 709);
    const responses = await Promise.all([
      register(fixture, surveyInput(fixture)),
      fixture.admin.agent
        .post(`/api/service-drafts/${fixture.draft.id}/confirm`)
        .set(fixture.admin.headers)
        .send({
          version: fixture.draft.version,
          expectedConfigurationId: null,
          idempotencyKey: randomUUID(),
        }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const surveyed = responses[0]!.status === 201;
    const history = await configurations(fixture);
    expect(history.configurations).toHaveLength(1);
    const current = history.configurations[0]!;
    expect(current.serviceId).toBe(surveyed ? null : fixture.draft.id);
    expect(await surveyEvents(fixture, current.id)).toHaveLength(
      surveyed ? 1 : 0,
    );
    await fixture.admin.agent
      .get(`/api/services/${fixture.draft.id}/sheet`)
      .expect(surveyed ? 404 : 200);
    const component = (
      await fixture.admin.agent
        .get(`/api/components/${fixture.component.id}/history`)
        .expect(200)
    ).body;
    expect(component.initialSurveys).toHaveLength(surveyed ? 1 : 0);
    expect(component.movements).toHaveLength(surveyed ? 0 : 1);
    expect(component.revisions).toHaveLength(surveyed ? 0 : 1);
  });
});
