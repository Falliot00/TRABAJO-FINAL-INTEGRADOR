import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { AuditPage, UserSummary } from "../packages/contracts/src/index";
import { administrator, appOrigin } from "./environment";

async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
}

async function createOperator(page: Page) {
  const suffix = randomUUID().slice(0, 8);
  const credentials = {
    name: `Operador ${suffix}`,
    email: `operador-${suffix}@example.test`,
    password: "Synthetic-operator-2026!",
  };
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Usuarios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo usuario", exact: true })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill(credentials.name);
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(credentials.email);
  await page
    .getByLabel("Contraseña inicial", { exact: true })
    .fill(credentials.password);
  await page.getByLabel("Rol", { exact: true }).selectOption("OPERADOR");
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/users") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Crear usuario", exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const user: UserSummary = await response.json();
  expect(user).toMatchObject({
    name: credentials.name,
    email: credentials.email,
    role: "OPERADOR",
    active: true,
  });
  await expect(
    page.getByRole("row").filter({ hasText: credentials.email }),
  ).toContainText("Operador");
  return { ...credentials, id: user.id };
}

test("rechaza credenciales incorrectas y permite ingresar y cerrar la sesión", async ({
  page,
}, testInfo) => {
  await login(page, administrator.email, "Incorrect-password-2026!");
  await expect(page.getByRole("alert")).toContainText(
    "Revisá tu correo y contraseña",
  );
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);

  await login(page, administrator.email, administrator.password);
  await expect(
    page.getByRole("heading", { name: "Hola, Administración", exact: true }),
  ).toBeVisible();
  const session = await page.request.get("/api/auth/session");
  expect(session.status()).toBe(200);
  expect(await session.json()).toMatchObject({
    user: { email: administrator.email, role: "ADMINISTRADOR" },
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktop = testInfo.outputPath("inicio-desktop.png");
  await page.screenshot({
    path: desktop,
    fullPage: true,
    animations: "disabled",
  });
  await testInfo.attach("Inicio desktop", {
    path: desktop,
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Usar tema oscuro", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Usar tema claro", exact: true }),
  ).toBeVisible();
  const dark = testInfo.outputPath("inicio-oscuro.png");
  await page.screenshot({ path: dark, fullPage: true, animations: "disabled" });
  await testInfo.attach("Inicio oscuro", {
    path: dark,
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Usar tema claro", exact: true })
    .click();
  await page.setViewportSize({ width: 820, height: 1180 });
  const tablet = testInfo.outputPath("inicio-tablet.png");
  await page.screenshot({
    path: tablet,
    fullPage: true,
    animations: "disabled",
  });
  await testInfo.attach("Inicio tablet", {
    path: tablet,
    contentType: "image/png",
  });

  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ingresá a CILGAS" }),
  ).toBeVisible();
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ingresá a CILGAS" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  const loginScreenshot = testInfo.outputPath("acceso-desktop.png");
  await page.screenshot({
    path: loginScreenshot,
    fullPage: true,
    animations: "disabled",
  });
  await testInfo.attach("Acceso", {
    path: loginScreenshot,
    contentType: "image/png",
  });
});

test("crea un operador que accede al taller sin obtener cuentas ni auditoría global", async ({
  page,
  browser,
}, testInfo) => {
  await login(page, administrator.email, administrator.password);
  await expect(
    page.getByRole("heading", { name: "Hola, Administración", exact: true }),
  ).toBeVisible();
  const operator = await createOperator(page);
  const screenshot = testInfo.outputPath("usuarios-desktop.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await testInfo.attach("Gestión de usuarios", {
    path: screenshot,
    contentType: "image/png",
  });

  const operatorContext = await browser.newContext({ baseURL: appOrigin });
  try {
    const operatorPage = await operatorContext.newPage();
    await login(operatorPage, operator.email, operator.password);
    await expect(
      operatorPage.getByRole("heading", {
        name: "Hola, Operador",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      operatorPage
        .getByRole("navigation")
        .getByRole("button", { name: "Usuarios", exact: true }),
    ).toHaveCount(0);
    await expect(
      operatorPage
        .getByRole("navigation")
        .getByRole("button", { name: "Auditoría", exact: true }),
    ).toHaveCount(0);

    for (const endpoint of ["/api/users", "/api/audit"]) {
      const response = await operatorContext.request.get(endpoint);
      expect(response.status()).toBe(403);
      const denied: unknown = await response.json();
      expect(denied).toMatchObject({ statusCode: 403 });
      expect(JSON.stringify(denied)).not.toContain(administrator.email);
      expect(JSON.stringify(denied)).not.toContain("items");
    }
  } finally {
    await operatorContext.close();
  }
});

test("el cambio de rol y la desactivación invalidan las sesiones existentes", async ({
  page,
  browser,
}) => {
  await login(page, administrator.email, administrator.password);
  await expect(
    page.getByRole("heading", { name: "Hola, Administración", exact: true }),
  ).toBeVisible();
  const operator = await createOperator(page);
  const operatorContext = await browser.newContext({ baseURL: appOrigin });
  try {
    const operatorPage = await operatorContext.newPage();
    await login(operatorPage, operator.email, operator.password);
    await expect(
      operatorPage.getByRole("heading", {
        name: "Hola, Operador",
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: `Editar ${operator.name}`, exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Rol", exact: true })
      .selectOption("ADMINISTRADOR");
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar cambios", exact: true })
      .click();
    await expect(
      page.getByRole("row").filter({ hasText: operator.email }),
    ).toContainText("Administrador");
    expect(
      (await operatorContext.request.get("/api/auth/session")).status(),
    ).toBe(401);
    await operatorPage.reload();
    await expect(
      operatorPage.getByRole("heading", { name: "Ingresá a CILGAS" }),
    ).toBeVisible();

    await login(operatorPage, operator.email, operator.password);
    await expect(
      operatorPage
        .getByRole("navigation")
        .getByRole("button", { name: "Usuarios", exact: true }),
    ).toBeVisible();
    expect((await operatorContext.request.get("/api/users")).status()).toBe(
      200,
    );

    await page
      .getByRole("button", { name: `Editar ${operator.name}`, exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Estado de la cuenta", exact: true })
      .selectOption("false");
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar cambios", exact: true })
      .click();
    await expect(
      page.getByRole("row").filter({ hasText: operator.email }),
    ).toContainText("Desactivada");
    expect(
      (await operatorContext.request.get("/api/auth/session")).status(),
    ).toBe(401);
    await operatorPage.reload();
    await expect(
      operatorPage.getByRole("heading", { name: "Ingresá a CILGAS" }),
    ).toBeVisible();
    await login(operatorPage, operator.email, operator.password);
    await expect(operatorPage.getByRole("alert")).toContainText(
      "Revisá tu correo y contraseña",
    );
    expect(
      (await operatorContext.request.get("/api/auth/session")).status(),
    ).toBe(401);
  } finally {
    await operatorContext.close();
  }
});

test("revoca todos los accesos de una cuenta y conserva auditoría sin secretos", async ({
  page,
  browser,
}, testInfo) => {
  await login(page, administrator.email, administrator.password);
  await expect(
    page.getByRole("heading", { name: "Hola, Administración", exact: true }),
  ).toBeVisible();
  const operator = await createOperator(page);
  const firstContext = await browser.newContext({ baseURL: appOrigin });
  const secondContext = await browser.newContext({ baseURL: appOrigin });
  try {
    const firstPage = await firstContext.newPage();
    const secondPage = await secondContext.newPage();
    await login(firstPage, operator.email, operator.password);
    await expect(
      firstPage.getByRole("heading", { name: "Hola, Operador", exact: true }),
    ).toBeVisible();
    await login(secondPage, operator.email, operator.password);
    await expect(
      secondPage.getByRole("heading", { name: "Hola, Operador", exact: true }),
    ).toBeVisible();
    for (const context of [firstContext, secondContext]) {
      expect((await context.request.get("/api/auth/session")).status()).toBe(
        200,
      );
    }
    const cookies = [
      ...(await page.context().cookies()),
      ...(await firstContext.cookies()),
      ...(await secondContext.cookies()),
    ];

    await page
      .getByRole("button", { name: `Editar ${operator.name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Revocar sesiones", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Revocar ahora", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      `Se cerraron todas las sesiones de ${operator.name}`,
    );
    for (const context of [firstContext, secondContext]) {
      expect((await context.request.get("/api/auth/session")).status()).toBe(
        401,
      );
    }
    await firstPage.reload();
    await expect(
      firstPage.getByRole("heading", { name: "Ingresá a CILGAS" }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: operator.email }),
    ).toContainText("Activa");

    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("button", { name: "Auditoría", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Auditoría", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Sesiones revocadas", { exact: true }).first(),
    ).toBeVisible();
    const response = await page.request.get("/api/audit?limit=100");
    expect(response.status()).toBe(200);
    const audit: AuditPage = await response.json();
    expect(audit.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "USUARIO_CREADO",
          entityId: operator.id,
          result: "EXITO",
        }),
        expect.objectContaining({
          action: "SESIONES_REVOCADAS",
          entityId: operator.id,
          result: "EXITO",
        }),
      ]),
    );
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toMatch(/passwordHash|tokenHash|csrfToken|\$argon2/);
    for (const secret of [
      administrator.password,
      operator.password,
      ...cookies.map((cookie) => cookie.value),
    ]) {
      expect(serialized).not.toContain(secret);
    }

    const screenshot = testInfo.outputPath("auditoria-desktop.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach("Auditoría", {
      path: screenshot,
      contentType: "image/png",
    });
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
