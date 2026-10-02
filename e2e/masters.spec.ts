import { expect, test } from "@playwright/test";
import { administrator } from "./environment";
import { randomInt, randomUUID } from "node:crypto";

test("el taller permite acceder a configuración, personas y vehículos", async ({
  page,
}) => {
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
  await navigation
    .getByRole("button", { name: "Personas", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Personas", exact: true }),
  ).toBeVisible();
  await navigation
    .getByRole("button", { name: "Vehículos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Vehículos", exact: true }),
  ).toBeVisible();
  await navigation
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Configuración", exact: true }),
  ).toBeVisible();
});

test("recupera una persona y su vehículo con edición y advertencias de duplicados", async ({
  page,
}, testInfo) => {
  const document = String(randomInt(20000000, 90000000));
  const name = `Persona sintética ${randomUUID().slice(0, 8)}`;
  const plate =
    Array.from({ length: 3 }, () =>
      String.fromCharCode(randomInt(65, 91)),
    ).join("") + String(randomInt(100, 1000));
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
  await navigation
    .getByRole("button", { name: "Personas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nueva persona", exact: true })
    .click();
  await page.getByLabel("Nombre o razón social").fill(name);
  await page.getByLabel("Tipo de documento").selectOption("DNI");
  await page.getByLabel("Número de documento").fill(document);
  await page.getByLabel("Teléfono", { exact: true }).fill("341-0000000");
  await page
    .getByRole("button", { name: "Crear persona", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: document }),
  ).toContainText(name);
  await page
    .getByRole("button", { name: "Nueva persona", exact: true })
    .click();
  await page.getByLabel("Nombre o razón social").fill("Intento duplicado");
  await page
    .getByLabel("Número de documento")
    .fill(
      `${document.slice(0, 2)}.${document.slice(2, 5)}.${document.slice(5)}`,
    );
  await page
    .getByRole("button", { name: "Crear persona", exact: true })
    .click();
  await page.getByRole("button", { name: `Usar ${name}`, exact: true }).click();
  await expect(page.getByLabel("Teléfono", { exact: true })).toHaveValue(
    "341-0000000",
  );
  await page.getByLabel("Teléfono", { exact: true }).fill("");
  await page.getByLabel("Calle", { exact: true }).fill("Calle de prueba");
  await page
    .getByRole("button", { name: "Guardar persona", exact: true })
    .click();
  await page.getByLabel("Buscar personas", { exact: true }).fill(document);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: `Vehículos de ${name}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo vehículo", exact: true })
    .click();
  await page.getByLabel("Dominio", { exact: true }).fill(plate.toLowerCase());
  await page.getByLabel("Marca", { exact: true }).fill("Marca sintética");
  await page.getByLabel("Modelo", { exact: true }).fill("Modelo de prueba");
  await page.getByLabel("Año", { exact: true }).fill("2020");
  await page
    .getByRole("combobox", { name: "Inyección", exact: true })
    .selectOption("");
  await page
    .getByRole("button", { name: "Crear vehículo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `Personas de ${plate}`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Relación con el vehículo", exact: true })
    .selectOption("TITULAR");
  await page.getByLabel("Desde", { exact: true }).fill("2026-10-01");
  await page
    .getByRole("button", { name: "Asociar persona", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar relación", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", {
        name: "Personas e historia del vehículo",
        exact: true,
      })
      .getByRole("row")
      .filter({ hasText: name }),
  ).toContainText("Titular");
  await navigation
    .getByRole("button", { name: "Personas", exact: true })
    .click();
  await page.getByLabel("Buscar personas", { exact: true }).fill(document);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: `Vehículos de ${name}`, exact: true })
    .click();
  await expect(page.getByRole("row").filter({ hasText: plate })).toContainText(
    "Modelo de prueba",
  );
  await page
    .getByRole("button", { name: `Editar ${plate}`, exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Inyección", exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Modelo", { exact: true }).fill("Modelo actualizado");
  await page
    .getByRole("button", { name: "Guardar vehículo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo vehículo", exact: true })
    .click();
  await page.getByLabel("Dominio", { exact: true }).fill(plate);
  await page.getByLabel("Marca", { exact: true }).fill("Marca duplicada");
  await page.getByLabel("Modelo", { exact: true }).fill("Intento duplicado");
  await page.getByLabel("Año", { exact: true }).fill("2021");
  await page
    .getByRole("button", { name: "Crear vehículo", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Usar ${plate}`, exact: true })
    .click();
  await expect(page.getByLabel("Modelo", { exact: true })).toHaveValue(
    "Modelo actualizado",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: testInfo.outputPath("vehiculos-tablet.png"),
    fullPage: true,
  });
});

test("configura el taller y recupera referencias regulatorias y modelos sin duplicarlos", async ({
  page,
}, testInfo) => {
  const code = `E2E-${randomUUID().slice(0, 8).toUpperCase()}`;
  const actorName = `Taller sintético ${code}`;
  await page.goto("/");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(administrator.email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(administrator.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Actores regulatorios", exact: true })
    .click();
  await page.getByRole("button", { name: "Nuevo actor", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tipo de actor", exact: true })
    .selectOption("TDM");
  await page.getByLabel("Código o matrícula", { exact: true }).fill(code);
  await page.getByLabel("Nombre", { exact: true }).fill(actorName);
  await page
    .getByLabel("Responsable técnico", { exact: true })
    .fill("Responsable sintético");
  await page.getByRole("button", { name: "Crear actor", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText(
    actorName,
  );
  await page.getByRole("button", { name: "Nuevo actor", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tipo de actor", exact: true })
    .selectOption("TDM");
  await page
    .getByLabel("Código o matrícula", { exact: true })
    .fill(code.toLowerCase());
  await page.getByLabel("Nombre", { exact: true }).fill("Nombre duplicado");
  await page.getByRole("button", { name: "Crear actor", exact: true }).click();
  await page
    .getByRole("button", { name: "Usar actor existente", exact: true })
    .click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    actorName,
  );
  await page.getByLabel("Localidad", { exact: true }).fill("Rosario");
  await page
    .getByRole("button", { name: "Guardar actor", exact: true })
    .click();
  await page.getByLabel("Buscar actores", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText(
    "Rosario",
  );
  await page.getByRole("button", { name: "Taller", exact: true }).click();
  await page
    .getByLabel("Nombre del taller", { exact: true })
    .fill("CILGAS de prueba E2E");
  await page
    .getByLabel("Taller de Montaje (TdM)")
    .selectOption({ label: `${code} · ${actorName}` });
  await page
    .getByRole("button", { name: "Guardar taller", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Datos del taller guardados",
  );
  await page
    .getByRole("button", { name: "Modelos de componentes", exact: true })
    .click();
  await page.getByRole("button", { name: "Nuevo modelo", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tipo de componente", exact: true })
    .selectOption("CILINDRO");
  await page.getByLabel("Código de homologación", { exact: true }).fill(code);
  await page.getByLabel("Marca", { exact: true }).fill("Marca sintética");
  await page.getByLabel("Modelo", { exact: true }).fill("Modelo sintético");
  await page.getByLabel("Capacidad en litros", { exact: true }).fill("60.25");
  await page.getByRole("button", { name: "Crear modelo", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText(
    "60.25",
  );
  await page.getByLabel("Buscar modelos", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText(
    "Modelo sintético",
  );
  await page.screenshot({
    path: testInfo.outputPath("modelos-desktop.png"),
    fullPage: true,
  });
});
