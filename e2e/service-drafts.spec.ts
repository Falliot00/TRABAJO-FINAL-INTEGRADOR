import { expect, test, type Page } from "@playwright/test";
import { randomInt, randomUUID } from "node:crypto";
import type { ServiceDraft } from "../packages/contracts/src/index.js";
import { administrator, appOrigin } from "./environment";

async function createFixture(page: Page, path: string, data: object) {
  const csrf = await (await page.request.get("/api/auth/csrf")).json();
  const response = await page.request.post(`/api/${path}`, {
    headers: { Origin: appOrigin, "X-CSRF-Token": csrf.csrfToken },
    data,
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
}

test("accede a los borradores compartidos del taller sin cobros ni pagos", async ({
  page,
}) => {
  await login(page, administrator.email, administrator.password);
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Servicios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Servicios", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nuevo borrador", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Confirmar servicio|Registrar cobro|Registrar pago/,
    }),
  ).toHaveCount(0);
});

test("explica los datos pendientes y conserva el borrador editable sin confirmar", async ({
  page,
}, testInfo) => {
  await login(page, administrator.email, administrator.password);
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const plate =
    Array.from({ length: 3 }, () =>
      String.fromCharCode(randomInt(65, 91)),
    ).join("") + String(randomInt(100, 1000));
  const vehicle = await createFixture(page, "vehicles", {
    plate,
    brand: "Marca sintética",
    model: "Modelo sintético",
    year: 2020,
  });
  const offer = await createFixture(page, "catalog-services", {
    code: `CONF-${suffix}`,
    name: `Confirmación ${suffix}`,
    description: "Revisión con preparación incompleta",
    type: "REVISION_ANUAL",
    suggestedPrice: "100.00",
    items: [
      {
        order: 1,
        description: "Inspección",
        type: "INSPECCION",
        quantity: "1",
        unitPrice: "100.00",
        unitCost: "0",
      },
    ],
  });
  const draft: ServiceDraft = await createFixture(page, "service-drafts", {
    vehicleId: vehicle.id,
    catalogOfferId: offer.id,
    serviceDate: "2026-10-02",
  });
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Servicios", exact: true })
    .click();
  await page
    .getByLabel("Buscar borradores", { exact: true })
    .fill(vehicle.plate);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", {
      name: `Revisar confirmación ${draft.id}`,
      exact: true,
    })
    .click();
  const review = page.getByRole("region", {
    name: `Revisar confirmación del servicio ${draft.id}`,
    exact: true,
  });
  await expect(review).toContainText("VEHICULO_INCOMPLETO");
  await expect(review).toContainText("TITULAR_REQUERIDO");
  await expect(review).toContainText("BASE_CONFIGURACION_DESCONOCIDA");
  await expect(review).not.toContainText("RF-07");
  await expect(review).not.toContainText("RF-08");
  await expect(
    review.getByRole("button", { name: "Confirmar servicio", exact: true }),
  ).toHaveCount(0);
  const csrf = await (await page.request.get("/api/auth/csrf")).json();
  const rejected = await page.request.post(
    `/api/service-drafts/${draft.id}/confirm`,
    {
      headers: { Origin: appOrigin, "X-CSRF-Token": csrf.csrfToken },
      data: {
        version: draft.version,
        idempotencyKey: randomUUID(),
        expectedConfigurationId: null,
      },
    },
  );
  expect(rejected.status()).toBe(409);
  const preserved = await (
    await page.request.get(`/api/service-drafts/${draft.id}`)
  ).json();
  expect(preserved).toEqual(draft);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: testInfo.outputPath("confirmacion-bloqueada-tablet.png"),
    fullPage: true,
  });
  await review
    .getByRole("button", { name: "Cerrar revisión", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Editar borrador ${draft.id}`, exact: true })
    .click();
  await page
    .getByLabel("Descripción del servicio", { exact: true })
    .fill(`Pendiente ${suffix}`);
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Borrador guardado");
});

test("recupera la propuesta ajustada desde otra cuenta y conserva la autoría sin exponer costos", async ({
  page,
}, testInfo) => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const plate =
    Array.from({ length: 3 }, () =>
      String.fromCharCode(randomInt(65, 91)),
    ).join("") + String(randomInt(100, 1000));
  const offerName = `Revisión M06 ${suffix}`;
  const personName = `Titular M06 ${suffix}`;
  const operatorEmail = `m06-${suffix.toLowerCase()}@example.test`;
  const operatorPassword = "Synthetic-m06-e2e-2026!";
  await login(page, administrator.email, administrator.password);
  const person = await createFixture(page, "people", {
    type: "FISICA",
    name: personName,
    documentType: "DNI",
    documentNumber: String(randomInt(20000000, 90000000)),
  });
  const vehicle = await createFixture(page, "vehicles", {
    plate,
    brand: "Marca M06",
    model: "Modelo M06",
    year: 2020,
  });
  await createFixture(page, `vehicles/${vehicle.id}/relationships`, {
    personId: person.id,
    role: "TITULAR",
    from: "2026-10-01",
  });
  const supplier = await createFixture(page, "suppliers", {
    name: `Proveedor reservado ${suffix}`,
  });
  const componentModel = await createFixture(page, "component-models", {
    type: "CILINDRO",
    homologationCode: `CM06-${suffix}`,
    capacityLiters: "60",
  });
  const serial = `000${suffix}`;
  const component = await createFixture(page, "components", {
    type: "CILINDRO",
    modelId: componentModel.id,
    serialNumber: serial,
    manufactureMonth: "2020-02",
  });
  await createFixture(page, "catalog-services", {
    code: `M06-${suffix}`,
    name: offerName,
    description: "Propuesta inicial M06",
    type: "REVISION_ANUAL",
    suggestedPrice: "25000.50",
    items: [
      {
        order: 1,
        description: "Inspección propuesta",
        type: "INSPECCION",
        quantity: "1",
        unitPrice: "25000.50",
        unitCost: "6000.25",
        supplierId: supplier.id,
      },
    ],
  });
  const operator = await createFixture(page, "users", {
    name: `Operador M06 ${suffix}`,
    email: operatorEmail,
    password: operatorPassword,
    role: "OPERADOR",
  });
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await navigation
    .getByRole("button", { name: "Servicios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo borrador", exact: true })
    .click();
  await page
    .getByLabel("Buscar vehículo del servicio", { exact: true })
    .fill(plate);
  await page
    .getByRole("button", { name: "Buscar vehículos", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Seleccionar ${plate}`, exact: true })
    .click();
  await page
    .getByLabel("Buscar oferta del servicio", { exact: true })
    .fill(offerName);
  await page
    .getByRole("button", { name: "Buscar ofertas", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Seleccionar ${offerName}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Crear borrador", exact: true })
    .click();
  await expect(
    page.getByLabel("Total acordado (ARS)", { exact: true }),
  ).toHaveValue("25000.50");
  await expect(
    page.getByText(personName, { exact: false }).first(),
  ).toBeVisible();
  const item = page.getByRole("group", { name: "Ítem 1", exact: true });
  await item.getByLabel("Cantidad", { exact: true }).fill("2");
  await item
    .getByLabel("Precio unitario (ARS)", { exact: true })
    .fill("15000,25");
  await page
    .getByLabel("Total acordado (ARS)", { exact: true })
    .fill("30000,50");
  const description = `Trabajo ajustado ${suffix}`;
  await page
    .getByLabel("Descripción del servicio", { exact: true })
    .fill(description);
  await page.getByLabel("Oblea anterior", { exact: true }).fill("000012345");
  await page
    .getByLabel("Observaciones de la ficha", { exact: true })
    .fill("Preparación incompleta compartida");
  await page
    .getByRole("button", { name: "Agregar intervención", exact: true })
    .click();
  const intervention = page.getByRole("group", {
    name: "Intervención 1",
    exact: true,
  });
  await intervention
    .getByLabel("Buscar componente existente", { exact: true })
    .fill(serial);
  await intervention
    .getByRole("button", { name: "Buscar componentes", exact: true })
    .click();
  await intervention
    .getByRole("button", { name: `Seleccionar ${serial}`, exact: true })
    .click();
  await intervention.getByLabel("Preparar ensayo PH", { exact: true }).check();
  await intervention
    .getByRole("combobox", { name: "Posición final propuesta", exact: true })
    .selectOption("1");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Borrador guardado");
  const drafts = await (
    await page.request.get(`/api/service-drafts?q=${plate}`)
  ).json();
  const saved: ServiceDraft = drafts.items[0];
  expect(saved).toMatchObject({
    description,
    totalAmount: "30000.50",
    status: "BORRADOR",
  });
  expect(saved.items[0]).toMatchObject({
    quantity: "2.00",
    unitPrice: "15000.25",
    amount: "30000.50",
  });
  expect(saved.preparation).toMatchObject({
    previousSticker: "000012345",
    notes: "Preparación incompleta compartida",
  });
  expect(saved.interventions[0]).toMatchObject({
    componentId: component.id,
    serialNumber: serial,
    manufactureMonth: "2020-02",
    finalPosition: 1,
    performsPh: true,
    phResult: null,
  });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByLabel("Correo electrónico", { exact: true }),
  ).toBeVisible();
  await login(page, operatorEmail, operatorPassword);
  await navigation
    .getByRole("button", { name: "Servicios", exact: true })
    .click();
  await page.getByLabel("Buscar borradores", { exact: true }).fill(plate);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: `Editar borrador ${saved.id}`, exact: true })
    .click();
  await expect(
    page.getByLabel("Descripción del servicio", { exact: true }),
  ).toHaveValue(description);
  await expect(item.getByLabel("Cantidad", { exact: true })).toHaveValue(
    "2.00",
  );
  await expect(page.getByLabel("Oblea anterior", { exact: true })).toHaveValue(
    "000012345",
  );
  await expect(
    intervention.getByLabel("Número de serie documental", { exact: true }),
  ).toHaveValue(serial);
  await expect(
    intervention.getByRole("combobox", {
      name: "Resultado PH preparado",
      exact: true,
    }),
  ).toHaveValue("");
  await expect(
    page.getByText(`Proveedor reservado ${suffix}`, { exact: false }),
  ).toHaveCount(0);
  const privateResponse = await page.request.get(
    `/api/service-drafts/${saved.id}`,
  );
  expect(privateResponse.status()).toBe(200);
  const publicDraft: ServiceDraft = await privateResponse.json();
  for (const entry of publicDraft.items)
    expect(entry).not.toHaveProperty("costs");
  await page
    .getByLabel("Descripción del servicio", { exact: true })
    .fill(`${description} continuado`);
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Borrador guardado");
  await page
    .getByRole("button", { name: `Editar borrador ${saved.id}`, exact: true })
    .click();
  await expect(
    page.getByLabel("Descripción del servicio", { exact: true }),
  ).toHaveValue(`${description} continuado`);
  const continued: ServiceDraft = await (
    await page.request.get(`/api/service-drafts/${saved.id}`)
  ).json();
  expect(continued.createdBy).toBe(saved.createdBy);
  expect(continued.createdBy).not.toBe(operator.id);
  await page.screenshot({
    path: testInfo.outputPath("borrador-operador-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: testInfo.outputPath("borrador-operador-tablet.png"),
    fullPage: true,
  });
});
