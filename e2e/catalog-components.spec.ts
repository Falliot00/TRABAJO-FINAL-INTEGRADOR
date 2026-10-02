import { expect, test, type Page } from "@playwright/test";
import { administrator, appOrigin } from "./environment";
import { randomInt, randomUUID } from "node:crypto";

async function fixture(page: Page, path: string, data: object) {
  const csrf = await (await page.request.get("/api/auth/csrf")).json();
  const response = await page.request.post(`/api/${path}`, {
    headers: { Origin: appOrigin, "X-CSRF-Token": csrf.csrfToken },
    data,
  });
  expect(response.status()).toBe(201);
  return response.json();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(administrator.email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(administrator.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
});

test("identifica un cilindro por su modelo y serie y recupera su fabricación sin instalarlo", async ({
  page,
}, testInfo) => {
  const code = `M04-E2E-${randomUUID().slice(0, 8).toUpperCase()}`;
  await fixture(page, "component-models", {
    type: "CILINDRO",
    homologationCode: code,
    brand: "Marca de prueba",
    capacityLiters: "60.50",
  });
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Componentes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo componente", exact: true })
    .click();
  await page
    .getByLabel("Buscar modelo para el componente", { exact: true })
    .fill(code);
  await page
    .getByRole("button", { name: "Buscar modelos", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Seleccionar ${code}`, exact: true })
    .click();
  await page.getByLabel("Número de serie", { exact: true }).fill("000123");
  await page
    .getByLabel("Fabricación (mes y año)", { exact: true })
    .fill("2020-02");
  await page
    .getByRole("button", { name: "Crear componente", exact: true })
    .click();
  await page.getByLabel("Buscar componentes", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: code });
  await expect(row).toContainText("000123");
  await expect(row).toContainText("02/2020");
  await row.getByRole("button", { name: "Editar 000123", exact: true }).click();
  await expect(
    page.getByLabel("Fabricación (mes y año)", { exact: true }),
  ).toHaveValue("2020-02");
  await page.getByLabel("Fabricación (mes y año)", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Guardar componente", exact: true })
    .click();
  await expect(row).toContainText("Sin informar");
  await row
    .getByRole("button", { name: "Ver historia de 000123", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Historia técnica", exact: true }),
  ).toContainText("Sin movimientos registrados.");
  await expect(
    page.getByRole("region", { name: "Historia técnica", exact: true }),
  ).toContainText("Sin intervenciones registradas.");
  await expect(
    page.getByRole("button", { name: "Instalar", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: testInfo.outputPath("componentes-tablet.png"),
    fullPage: true,
  });
});

test("ofrece componentes, catálogo y proveedores en el espacio del administrador", async ({
  page,
}) => {
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  for (const name of ["Componentes", "Catálogo", "Proveedores"]) {
    await navigation.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
});

test("registra un proveedor y recupera su CUIT sin duplicarlo, conservando ediciones", async ({
  page,
}) => {
  const name = `Proveedor E2E ${randomUUID().slice(0, 8)}`;
  const base = `30${randomInt(10000000, 99999999)}`;
  const remainder =
    11 -
    ([5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce(
      (sum, weight, index) => sum + Number(base[index]) * weight,
      0,
    ) %
      11);
  const cuit = `${base}${remainder === 11 ? 0 : remainder === 10 ? 9 : remainder}`;
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Proveedores", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo proveedor", exact: true })
    .click();
  await page.getByLabel("Nombre o razón social", { exact: true }).fill(name);
  await page.getByLabel("CUIT", { exact: true }).fill(cuit);
  await page.getByLabel("Teléfono", { exact: true }).fill("341-0000000");
  await page
    .getByRole("button", { name: "Crear proveedor", exact: true })
    .click();
  await expect(page.getByRole("row").filter({ hasText: cuit })).toContainText(
    name,
  );
  await page
    .getByRole("button", { name: "Nuevo proveedor", exact: true })
    .click();
  await page
    .getByLabel("Nombre o razón social", { exact: true })
    .fill("Duplicado E2E");
  await page
    .getByLabel("CUIT", { exact: true })
    .fill(`${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`);
  await page
    .getByRole("button", { name: "Crear proveedor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Usar proveedor existente", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre o razón social", { exact: true }),
  ).toHaveValue(name);
  await page.getByLabel("Teléfono", { exact: true }).fill("");
  await page
    .getByRole("textbox", { name: "Observaciones", exact: true })
    .fill("Condición comercial de prueba");
  await page
    .getByRole("button", { name: "Guardar proveedor", exact: true })
    .click();
  await page.getByLabel("Buscar proveedores", { exact: true }).fill(cuit);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: `Editar ${name}`, exact: true })
    .click();
  await expect(page.getByLabel("Teléfono", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Observaciones", exact: true }),
  ).toHaveValue("Condición comercial de prueba");
});

test("prepara una quinquenal ajustable y permite al operador consultar sólo sus precios de venta", async ({
  page,
}, testInfo) => {
  const code = `QUIN-E2E-${randomUUID().slice(0, 8).toUpperCase()}`;
  const name = `Quinquenal ${code}`;
  const supplierName = `Proveedor ${code}`;
  await fixture(page, "suppliers", { name: supplierName });
  const operatorEmail = `catalog-${randomUUID().slice(0, 8)}@example.test`;
  const operatorPassword = "Synthetic-catalog-e2e-2026!";
  await fixture(page, "users", {
    name: "Operador catálogo E2E",
    email: operatorEmail,
    password: operatorPassword,
    role: "OPERADOR",
  });
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await navigation
    .getByRole("button", { name: "Catálogo", exact: true })
    .click();
  await page.getByRole("button", { name: "Nueva oferta", exact: true }).click();
  await page.getByLabel("Código", { exact: true }).fill(code);
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page
    .getByRole("textbox", { name: "Descripción", exact: true })
    .fill("Propuesta editable para dos cilindros");
  await page
    .getByRole("combobox", { name: "Tipo de oferta", exact: true })
    .selectOption("REVISION_QUINQUENAL");
  await page
    .getByLabel("Precio sugerido (ARS)", { exact: true })
    .fill("125000,50");
  await page
    .getByRole("button", { name: "Usar propuesta habitual", exact: true })
    .click();
  const ph = page.getByRole("group", { name: "Ítem 3", exact: true });
  await expect(ph.getByLabel("Concepto", { exact: true })).toHaveValue(
    "Ensayo PH por cilindro",
  );
  await ph.getByLabel("Cantidad", { exact: true }).fill("2");
  await ph.getByLabel("Costo unitario (ARS)", { exact: true }).fill("20000,25");
  await ph
    .getByLabel("Precio unitario (ARS)", { exact: true })
    .fill("30000,50");
  await ph
    .getByLabel("Buscar proveedor del ítem", { exact: true })
    .fill(supplierName);
  await ph
    .getByRole("button", { name: "Buscar proveedores", exact: true })
    .click();
  await ph
    .getByRole("button", { name: `Seleccionar ${supplierName}`, exact: true })
    .click();
  const valves = page.getByRole("group", { name: "Ítem 4", exact: true });
  await expect(valves.getByLabel("Concepto", { exact: true })).toHaveValue(
    "Reemplazo de válvula por cilindro",
  );
  await valves.getByLabel("Cantidad", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Crear oferta", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: code });
  await expect(row).toContainText("125000.50");
  await row
    .getByRole("button", { name: `Editar ${name}`, exact: true })
    .click();
  await expect(
    ph.getByLabel("Costo unitario (ARS)", { exact: true }),
  ).toHaveValue("20000.25");
  await expect(ph).toContainText(supplierName);
  await valves
    .getByRole("button", { name: "Quitar ítem", exact: true })
    .click();
  await page
    .getByLabel("Precio sugerido (ARS)", { exact: true })
    .fill("100000.25");
  await page
    .getByRole("button", { name: "Guardar oferta", exact: true })
    .click();
  await expect(row).toContainText("100000.25");
  await row
    .getByRole("button", { name: `Ver composición de ${name}`, exact: true })
    .click();
  const composition = page.getByRole("region", {
    name: `Composición de ${name}`,
    exact: true,
  });
  await expect(composition).toContainText("Revisión anual");
  await expect(composition).toContainText("Oblea nueva");
  await expect(composition).not.toContainText("Reemplazo de válvula");
  await page.screenshot({
    path: testInfo.outputPath("catalogo-admin-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(operatorEmail);
  await page.getByLabel("Contraseña", { exact: true }).fill(operatorPassword);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await navigation
    .getByRole("button", { name: "Catálogo", exact: true })
    .click();
  await expect(
    navigation.getByRole("button", { name: "Proveedores", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Nueva oferta", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Buscar ofertas", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await row
    .getByRole("button", { name: `Ver composición de ${name}`, exact: true })
    .click();
  await expect(composition).toContainText("30000.50");
  await expect(composition).not.toContainText("20000.25");
  await expect(
    composition.getByRole("columnheader", {
      name: "Costo unitario (ARS)",
      exact: true,
    }),
  ).toHaveCount(0);
  const response = await page.request.get(`/api/catalog-services?q=${code}`);
  expect(response.status()).toBe(200);
  const offer = (await response.json()).items[0];
  expect(offer.suggestedPrice).toBe("100000.25");
  for (const item of offer.items) {
    expect(item).not.toHaveProperty("unitCost");
    expect(item).not.toHaveProperty("supplierId");
  }
  expect((await page.request.get("/api/suppliers")).status()).toBe(403);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: testInfo.outputPath("catalogo-operador-tablet.png"),
    fullPage: true,
  });
});
