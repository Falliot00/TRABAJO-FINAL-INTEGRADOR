import { expect, test, type Page } from "@playwright/test";
import { randomInt, randomUUID } from "node:crypto";
import type {
  Component,
  ServiceDraft,
} from "../packages/contracts/src/index.js";
import { administrator, appOrigin } from "./environment";

async function writeFixture(
  page: Page,
  path: string,
  data: object,
  method: "post" | "patch" = "post",
) {
  const csrf = await (await page.request.get("/api/auth/csrf")).json();
  const response = await page.request[method](`/api/${path}`, {
    headers: { Origin: appOrigin, "X-CSRF-Token": csrf.csrfToken },
    data,
  });
  expect(response.status(), await response.text()).toBe(
    method === "post" ? 201 : 200,
  );
  return response.json();
}

async function prepareConversion(page: Page) {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const person = await writeFixture(page, "people", {
    type: "FISICA",
    name: `Titular confirmación ${suffix}`,
    documentType: "DNI",
    documentNumber: String(randomInt(20000000, 90000000)),
    street: "Calle de prueba",
    streetNumber: "S/N",
    locality: "Rosario",
    province: "Santa Fe",
    postalCode: "2000",
    phone: "3410000000",
  });
  const vehicle = await writeFixture(page, "vehicles", {
    plate:
      Array.from({ length: 3 }, () =>
        String.fromCharCode(randomInt(65, 91)),
      ).join("") + String(randomInt(100, 1000)),
    brand: "Marca de prueba",
    model: "Modelo de prueba",
    year: 2020,
    type: "PARTICULAR",
    injection: false,
  });
  const actors: Record<string, string> = {};
  for (const type of ["PEC", "TDM", "CRPC"]) {
    const actor = await writeFixture(page, "regulatory-actors", {
      type,
      code: `${type}-${suffix}`,
      name: `${type} de prueba`,
      cuit: "20123456786",
      address: "Calle de prueba 123",
      locality: "Rosario",
      phone: "3410000000",
    });
    actors[type] = actor.id;
  }
  const components: Component[] = [];
  for (const type of ["REGULADOR", "CILINDRO", "VALVULA"]) {
    const model = await writeFixture(page, "component-models", {
      type,
      homologationCode: `${type}-${suffix}`,
      brand: "Marca de prueba",
      model: "Modelo de prueba",
      ...(type === "CILINDRO" ? { capacityLiters: "60" } : {}),
    });
    components.push(
      await writeFixture(page, "components", {
        type,
        modelId: model.id,
        serialNumber: `${type}-${suffix}`,
        ...(type === "CILINDRO" ? { manufactureMonth: "2020-02" } : {}),
      }),
    );
  }
  const offer = await writeFixture(page, "catalog-services", {
    code: `E2EC-${suffix}`,
    name: `Conversión ${suffix}`,
    description: `Conversión ${suffix}`,
    type: "CONVERSION",
    suggestedPrice: "0",
    items: [],
  });
  const created = await writeFixture(page, "service-drafts", {
    vehicleId: vehicle.id,
    catalogOfferId: offer.id,
    serviceDate: "2026-10-05",
  });
  const cylinder = components.find(
    (component) => component.type === "CILINDRO",
  );
  if (!cylinder) throw new Error("La preparación requiere un cilindro.");
  const draft: ServiceDraft = await writeFixture(
    page,
    `service-drafts/${created.id}`,
    {
      version: created.version,
      sheetOperation: "C",
      includesPh: true,
      phReason: "CONVERSION",
      people: [{ role: "TITULAR", personId: person.id }],
      totalAmount: "0",
      items: components.map((component, index) => ({
        order: index + 1,
        description: `Instalación ${component.type}`,
        type: "COMPONENTE",
        componentId: component.id,
        action: "INSTALAR",
        quantity: "1",
        unitPrice: "0",
        discount: "0",
      })),
      preparation: {
        pecId: actors.PEC,
        tdmId: actors.TDM,
        newSticker: `OB-${suffix}`,
        enabledOn: "2026-10-05",
        expiresOn: "2027-10-31",
      },
      interventions: components.map((component) => ({
        type: component.type,
        row: 1,
        componentId: component.id,
        homologationCode: component.model.homologationCode,
        serialNumber: component.serialNumber,
        condition: "USADO",
        action: "M",
        finalPosition: 1,
        performsPh: component.type === "CILINDRO",
        ...(component.type === "VALVULA" ? { cylinderId: cylinder.id } : {}),
        ...(component.type === "CILINDRO"
          ? {
              manufactureMonth: "2020-02",
              revisionMonth: "2026-10",
              testDate: "2026-10",
              crpcId: actors.CRPC,
              phResult: "APROBADO",
              revisionExpiresOn: "2031-10-31",
            }
          : {}),
      })),
    },
    "patch",
  );
  return { draft, cylinder, vehicle, person };
}

test("confirma una conversión completa con PH mensual y consulta la ficha e historia inmutables", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(administrator.email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(administrator.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
  });
  await expect(navigation).toBeVisible();
  const { draft, cylinder, vehicle, person } = await prepareConversion(page);
  await navigation
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
  await expect(
    review.getByRole("button", { name: "Confirmar servicio", exact: true }),
  ).toBeDisabled();
  await review
    .getByLabel("Revisé los datos guardados y confirmo el trabajo realizado", {
      exact: true,
    })
    .check();
  await review
    .getByRole("button", { name: "Confirmar servicio", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Servicio confirmado", exact: true }),
  ).toContainText(`Servicio confirmado ${draft.id}`);
  await page
    .getByRole("button", { name: "Ver ficha confirmada", exact: true })
    .click();
  const sheet = page.getByRole("region", { name: /^Ficha confirmada / });
  await expect(sheet).toContainText("2027-10-31");
  await expect(sheet).toContainText("2031-10-31");
  await expect(sheet).toContainText("2026-10");
  await expect(sheet).toContainText("PDF pendiente de generación.");
  await expect(sheet).toContainText(person.name);
  const original = await (
    await page.request.get(`/api/services/${draft.id}/sheet`)
  ).json();
  await writeFixture(
    page,
    `people/${person.id}`,
    { name: `Titular actualizado ${person.id}` },
    "patch",
  );
  expect(
    await (await page.request.get(`/api/services/${draft.id}/sheet`)).json(),
  ).toEqual(original);
  const history = await (
    await page.request.get(`/api/components/${cylinder.id}/history`)
  ).json();
  expect(history.revisions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        testDate: "2026-10",
        expiresOn: "2031-10-31",
        result: "APROBADO",
        certificateNumber: null,
      }),
    ]),
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: testInfo.outputPath("ficha-confirmada-tablet.png"),
    fullPage: true,
  });
});
