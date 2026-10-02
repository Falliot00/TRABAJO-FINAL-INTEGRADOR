import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { Person } from "@cilgas/contracts";
import { People } from "./People";

const ana: Person = {
  id: "9007199254740993",
  type: "FISICA",
  name: "Ana Pérez",
  documentType: "DNI",
  documentNumber: "30123456",
  street: "San Martín",
  streetNumber: "100",
  floorApartment: null,
  locality: "Córdoba",
  province: "Córdoba",
  postalCode: "5000",
  phone: "+54 351 5550000",
  email: null,
  active: true,
  createdAt: "2026-10-02T12:00:00Z",
};

afterEach(() => vi.unstubAllGlobals());

test("recupera una persona por documento, edita su contacto y abre sus vehículos sin recargar datos", async () => {
  const onOpenVehicles = vi.fn();
  let stored = ana;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/people/duplicates")
        return Response.json({ items: [], nextCursor: null });
      if (
        url.pathname === `/api/people/${ana.id}` &&
        init?.method === "PATCH"
      ) {
        const update = JSON.parse(String(init.body));
        expect(update.phone).toBeNull();
        expect(update.streetNumber).toBe("S/N");
        stored = { ...stored, ...update };
        return Response.json(stored);
      }
      if (url.pathname === "/api/people")
        return Response.json({
          items: url.searchParams.get("q") === "30123456" ? [stored] : [],
          nextCursor: null,
        });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<People onSessionLost={vi.fn()} onOpenVehicles={onOpenVehicles} />);
  await user.type(await screen.findByLabelText("Buscar personas"), "30123456");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  const row = await screen.findByRole("row", { name: /Ana Pérez/ });
  await user.click(
    within(row).getByRole("button", { name: "Editar Ana Pérez" }),
  );
  expect(screen.getByLabelText("Número de documento")).toHaveValue("30123456");
  await user.clear(screen.getByLabelText("Teléfono"));
  await user.clear(screen.getByLabelText("Número del domicilio"));
  await user.type(screen.getByLabelText("Número del domicilio"), "S/N");
  await user.click(screen.getByRole("button", { name: "Guardar persona" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Los datos de la persona se guardaron",
  );
  await user.click(
    screen.getByRole("button", { name: "Vehículos de Ana Pérez" }),
  );
  expect(onOpenVehicles).toHaveBeenCalledWith(
    expect.objectContaining({ id: ana.id, phone: null, streetNumber: "S/N" }),
  );
});

test("muestra el documento duplicado antes del alta y permite recuperar la persona existente", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/people/duplicates")
        return Response.json({ items: [ana], nextCursor: null });
      if (url.pathname === "/api/people" && init?.method !== "POST")
        return Response.json({ items: [], nextCursor: null });
      throw new Error(`No se debe crear otra persona: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<People onSessionLost={vi.fn()} onOpenVehicles={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Nueva persona" }),
  );
  await user.type(screen.getByLabelText("Nombre o razón social"), "Ana Pérez");
  await user.type(screen.getByLabelText("Número de documento"), "30.123.456");
  await user.click(screen.getByRole("button", { name: "Crear persona" }));
  const matches = await screen.findByRole("region", {
    name: "Personas coincidentes",
  });
  expect(matches).toHaveTextContent("DNI 30123456");
  expect(
    screen.queryByRole("button", { name: "Crear persona diferente" }),
  ).not.toBeInTheDocument();
  await user.click(
    within(matches).getByRole("button", { name: "Usar Ana Pérez" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Editar persona" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Calle")).toHaveValue("San Martín");
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(
    screen.getByRole("button", { name: "Vehículos de Ana Pérez" }),
  ).toBeInTheDocument();
});

test("permite crear un homónimo con otro documento después de revisar las coincidencias", async () => {
  let created: Person | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/people/duplicates")
        return Response.json({ items: [ana], nextCursor: null });
      if (url.pathname === "/api/people" && init?.method === "POST") {
        created = { ...ana, ...JSON.parse(String(init.body)), id: "2" };
        return Response.json(created);
      }
      if (url.pathname === "/api/people")
        return Response.json({ items: [], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<People onSessionLost={vi.fn()} onOpenVehicles={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Nueva persona" }));
  await user.type(screen.getByLabelText("Nombre o razón social"), "Ana Pérez");
  await user.type(screen.getByLabelText("Número de documento"), "32123456");
  await user.click(screen.getByRole("button", { name: "Crear persona" }));
  expect(created).toBeNull();
  await user.click(
    await screen.findByRole("button", { name: "Crear persona diferente" }),
  );
  expect(
    await screen.findByRole("row", { name: /32123456/ }),
  ).toHaveTextContent("Ana Pérez");
});
