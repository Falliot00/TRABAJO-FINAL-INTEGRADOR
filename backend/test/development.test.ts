import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

describe("Servidor de desarrollo", () => {
  it("arranca mediante tsx y publica contratos OpenAPI válidos", async () => {
    const script = `
      const { createApplication } = require('./src/app');
      const request = require('supertest');
      (async () => {
        const app = await createApplication();
        try {
          await app.init();
          const response = await request(app.getHttpServer()).get('/api/docs-json');
          if (response.status !== 200) throw new Error('OpenAPI no disponible.');
          console.log('OPENAPI:' + JSON.stringify(response.body));
        } finally {
          await app.close();
        }
      })().catch((error) => { console.error(error.message); process.exitCode = 1; });
    `;
    const { stdout } = await run(
      process.execPath,
      [path.resolve("node_modules/tsx/dist/cli.mjs"), "-e", script],
      {
        env: {
          ...process.env,
          NODE_ENV: "development",
          APP_ORIGIN: "http://localhost:5173",
          // OpenAPI generation must not require a running database.
          DATABASE_URL: "postgresql://unused:unused@localhost:1/cilgas_test",
        },
        timeout: 20000,
      },
    );
    const json = stdout
      .split(/\r?\n/)
      .find((line) => line.startsWith("OPENAPI:"));
    expect(json).toBeDefined();
    const spec = JSON.parse(json!.slice("OPENAPI:".length));
    expect(spec.paths["/api/auth/login"].post).toBeDefined();
    expect(spec.components.schemas.LoginDto.properties.email.type).toBe(
      "string",
    );
    expect(spec.components.schemas.CreateUserDto.properties.role.enum).toEqual([
      "ADMINISTRADOR",
      "OPERADOR",
    ]);
    expect(spec.components.schemas.UpdateUserDto.properties.active.type).toBe(
      "boolean",
    );
    expect(spec.components.securitySchemes.cookie.name).toBe("cilgas_session");
    expect(spec.components.schemas.SessionUserDto.properties.id.type).toBe(
      "string",
    );
    expect(spec.components.schemas.UserSummaryDto.properties.id.type).toBe(
      "string",
    );
    expect(spec.components.schemas.AuditEventDto.properties.id.type).toBe(
      "string",
    );
    expect(
      spec.components.schemas.AuditEventDto.properties.actorId,
    ).toMatchObject({ type: "string", nullable: true });
    expect(
      spec.components.schemas.AuditEventDto.properties.entityId,
    ).toMatchObject({ type: "string", nullable: true });
    expect(
      spec.components.schemas.AuditPageDto.properties.nextCursor,
    ).toMatchObject({ type: "string", nullable: true });
    expect(
      spec.paths["/api/auth/login"].post.responses["201"].content[
        "application/json"
      ].schema.$ref,
    ).toBe("#/components/schemas/SessionResponseDto");
    expect(
      spec.paths["/api/auth/session"].get.responses["200"].content[
        "application/json"
      ].schema.$ref,
    ).toBe("#/components/schemas/SessionResponseDto");
    expect(
      spec.paths["/api/auth/csrf"].get.responses["200"].content[
        "application/json"
      ].schema.$ref,
    ).toBe("#/components/schemas/CsrfResponseDto");
    expect(
      spec.paths["/api/users"].get.responses["200"].content["application/json"]
        .schema,
    ).toMatchObject({
      type: "array",
      items: { $ref: "#/components/schemas/UserSummaryDto" },
    });
    expect(spec.paths["/api/users/{id}"].patch.parameters).toContainEqual(
      expect.objectContaining({
        name: "id",
        in: "path",
        schema: { type: "string" },
      }),
    );
    expect(
      spec.paths["/api/audit"].get.responses["200"].content["application/json"]
        .schema.$ref,
    ).toBe("#/components/schemas/AuditPageDto");
    expect(
      spec.paths["/api/auth/logout"].post.responses["204"],
    ).not.toHaveProperty("content");
    expect(
      spec.paths["/api/users/{id}/revoke-sessions"].post.responses["204"],
    ).not.toHaveProperty("content");
    expect(
      spec.components.schemas.WorkshopResponseDto.properties.tdmId,
    ).toMatchObject({ type: "string", nullable: true });
    expect(
      spec.components.schemas.ComponentModelResponseDto.properties
        .capacityLiters,
    ).toMatchObject({ type: "string", nullable: true });
    expect(
      spec.components.schemas.PersonResponseDto.properties.documentNumber.type,
    ).toBe("string");
    expect(
      spec.components.schemas.VehicleResponseDto.properties.injection,
    ).toMatchObject({ type: "boolean", nullable: true });
    expect(
      spec.components.schemas.VehicleRelationshipResponseDto.properties.from,
    ).toMatchObject({ type: "string", format: "date" });
    expect(
      spec.paths["/api/people"].get.responses["200"].content["application/json"]
        .schema.$ref,
    ).toBe("#/components/schemas/PeoplePageDto");
    expect(
      spec.paths["/api/vehicles/{id}"].get.responses["200"].content[
        "application/json"
      ].schema.$ref,
    ).toBe("#/components/schemas/VehicleDetailResponseDto");
  });
});
