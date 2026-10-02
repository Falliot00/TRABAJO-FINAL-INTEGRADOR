import request from "supertest";
import type { INestApplication } from "@nestjs/common";

export async function signedIn(
  app: INestApplication,
  email = "admin@example.test",
  password = "Synthetic-admin-2026!",
) {
  const agent = request.agent(app.getHttpServer());
  const csrf = await agent.get("/api/auth/csrf").expect(200);
  await agent
    .post("/api/auth/login")
    .set("Origin", "http://localhost:5173")
    .set("X-CSRF-Token", csrf.body.csrfToken as string)
    .send({ email, password })
    .expect(201);
  const authenticated = await agent.get("/api/auth/csrf").expect(200);
  return {
    agent,
    headers: {
      Origin: "http://localhost:5173",
      "X-CSRF-Token": authenticated.body.csrfToken as string,
    },
  };
}
