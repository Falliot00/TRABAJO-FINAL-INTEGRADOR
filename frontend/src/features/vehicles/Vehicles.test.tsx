import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { Person, VehicleDetail } from "@cilgas/contracts";
import { Vehicles } from "./Vehicles";

const ana: Person = {
  id: "1",
  type: "FISICA",
  name: "Ana Pérez",
  documentType: "DNI",
  documentNumber: "30123456",
  street: null,
  streetNumber: null,
  floorApartment: null,
  locality: null,
  province: null,
  postalCode: null,
  phone: null,
  email: null,
  active: true,
  createdAt: "2026-10-02T12:00:00Z",
};
const car: VehicleDetail = {
  id: "9007199254740993",
  plate: "AB123CD",
  brand: "Fiat",
  model: "Cronos",
  year: 2020,
  engineNumber: "000123",
  chassisNumber: "CH001",
  type: "OTROS",
  otherTypeDetail: "Furgón",
  usage: "Transporte",
  injection: true,
  active: true,
  relationships: [],
};
afterEach(() => vi.unstubAllGlobals());

test("recupera un vehículo duplicado todavía no vinculado a la persona y permite asociarlo", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/vehicles/duplicates")
        return Response.json({ items: [car], nextCursor: null });
      if (url.pathname === "/api/vehicles")
        return Response.json({ items: [], nextCursor: null });
      if (url.pathname === `/api/vehicles/${car.id}`) return Response.json(car);
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} person={ana} />);
  await user.click(screen.getByRole("button", { name: "Nuevo vehículo" }));
  await user.type(screen.getByLabelText("Dominio"), "AB123CD");
  await user.type(screen.getByLabelText("Marca"), "Fiat");
  await user.type(screen.getByLabelText("Modelo"), "Cronos");
  await user.type(screen.getByLabelText("Año"), "2020");
  await user.click(screen.getByRole("button", { name: "Crear vehículo" }));
  await user.click(await screen.findByRole("button", { name: "Usar AB123CD" }));
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(
    await screen.findByRole("heading", { name: "Personas de AB123CD" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Persona seleccionada:/)).toHaveTextContent(
    "Ana Pérez",
  );
});

test("recupera el vehículo de una persona y permite corregir datos sin convertir ausencias en valores", async () => {
  let stored = car;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/vehicles/duplicates")
        return Response.json({ items: [], nextCursor: null });
      if (
        url.pathname === `/api/vehicles/${car.id}` &&
        init?.method === "PATCH"
      ) {
        const update = JSON.parse(String(init.body));
        expect(update).toMatchObject({
          type: "PARTICULAR",
          otherTypeDetail: null,
          injection: null,
          engineNumber: null,
          year: 2020,
        });
        stored = { ...stored, ...update };
        return Response.json(stored);
      }
      if (url.pathname === "/api/vehicles") {
        expect(url.searchParams.get("personId")).toBe(ana.id);
        return Response.json({ items: [stored], nextCursor: null });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} person={ana} />);
  const row = await screen.findByRole("row", { name: /AB123CD/ });
  await user.click(within(row).getByRole("button", { name: "Editar AB123CD" }));
  expect(screen.getByLabelText("Número de motor")).toHaveValue("000123");
  await user.clear(screen.getByLabelText("Número de motor"));
  await user.selectOptions(
    screen.getByLabelText("Tipo de vehículo"),
    "PARTICULAR",
  );
  await user.selectOptions(screen.getByLabelText("Inyección"), "");
  await user.click(screen.getByRole("button", { name: "Guardar vehículo" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Los datos del vehículo se guardaron",
  );
});

test("crea un vehículo tras buscar coincidencias y recupera un dominio ya registrado antes de duplicarlo", async () => {
  let stored: VehicleDetail | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/vehicles/duplicates")
        return Response.json({
          items: stored ? [stored] : [],
          nextCursor: null,
        });
      if (url.pathname === "/api/vehicles" && init?.method === "POST") {
        expect(stored).toBeNull();
        stored = { ...car, ...JSON.parse(String(init.body)), plate: "AB123CD" };
        return Response.json(stored);
      }
      if (url.pathname === "/api/vehicles")
        return Response.json({ items: [], nextCursor: null });
      if (url.pathname === `/api/vehicles/${car.id}`)
        return Response.json(stored);
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Nuevo vehículo" }));
  await user.type(screen.getByLabelText("Dominio"), "ab 123 cd");
  await user.type(screen.getByLabelText("Marca"), "Fiat");
  await user.type(screen.getByLabelText("Modelo"), "Cronos");
  await user.type(screen.getByLabelText("Año"), "2020");
  await user.click(screen.getByRole("button", { name: "Crear vehículo" }));
  expect(await screen.findByRole("row", { name: /AB123CD/ })).toHaveTextContent(
    "Fiat Cronos",
  );
  await user.click(screen.getByRole("button", { name: "Nuevo vehículo" }));
  await user.type(screen.getByLabelText("Dominio"), "AB123CD");
  await user.type(screen.getByLabelText("Marca"), "Fiat");
  await user.type(screen.getByLabelText("Modelo"), "Cronos");
  await user.type(screen.getByLabelText("Año"), "2020");
  await user.click(screen.getByRole("button", { name: "Crear vehículo" }));
  await user.click(await screen.findByRole("button", { name: "Usar AB123CD" }));
  expect(
    await screen.findByRole("heading", { name: "Editar vehículo" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Dominio")).toHaveValue("AB123CD");
});

test("confirma una transferencia con fecha y conserva al titular anterior y la titularidad programada", async () => {
  const previous = {
    ...ana,
    id: "2",
    name: "Bruno Díaz",
    documentNumber: "29123456",
  };
  let detail: VehicleDetail = {
    ...car,
    relationships: [
      {
        id: "10",
        vehicleId: car.id,
        personId: previous.id,
        person: previous,
        role: "TITULAR",
        from: "2020-01-01",
        until: null,
      },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/vehicles")
        return Response.json({ items: [detail], nextCursor: null });
      if (url.pathname === `/api/vehicles/${car.id}`)
        return Response.json(detail);
      if (
        url.pathname === `/api/vehicles/${car.id}/relationships` &&
        init?.method === "POST"
      ) {
        expect(JSON.parse(String(init.body))).toEqual({
          personId: ana.id,
          role: "TITULAR",
          from: "2200-01-01",
        });
        detail = {
          ...detail,
          relationships: [
            { ...detail.relationships[0]!, until: "2200-01-01" },
            {
              id: "11",
              vehicleId: car.id,
              personId: ana.id,
              person: ana,
              role: "TITULAR",
              from: "2200-01-01",
              until: null,
            },
          ],
        };
        return Response.json(detail);
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} person={ana} />);
  await user.click(
    await screen.findByRole("button", {
      name: "Personas e historia de AB123CD",
    }),
  );
  await screen.findByRole("heading", { name: "Personas de AB123CD" });
  await user.selectOptions(
    screen.getByLabelText("Relación con el vehículo"),
    "TITULAR",
  );
  await user.clear(screen.getByLabelText("Desde"));
  await user.type(screen.getByLabelText("Desde"), "2200-01-01");
  await user.click(screen.getByRole("button", { name: "Asociar persona" }));
  expect(
    await screen.findByRole("region", { name: "Confirmar relación" }),
  ).toHaveTextContent("Bruno Díaz");
  expect(detail.relationships).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Confirmar relación" }));
  expect(
    await screen.findByRole("row", { name: /Ana Pérez.*Programada/ }),
  ).toHaveTextContent("2200-01-01");
  expect(
    screen.getByRole("row", { name: /Bruno Díaz.*Vigente/ }),
  ).toHaveTextContent("2200-01-01");
});

test("busca una persona existente y la asocia como contacto sin crear otra identidad", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/vehicles")
        return Response.json({ items: [car], nextCursor: null });
      if (url.pathname === `/api/vehicles/${car.id}`) return Response.json(car);
      if (url.pathname === "/api/people") {
        expect(url.searchParams.get("q")).toBe("30123456");
        return Response.json({ items: [ana], nextCursor: null });
      }
      if (
        url.pathname === `/api/vehicles/${car.id}/relationships` &&
        init?.method === "POST"
      ) {
        expect(JSON.parse(String(init.body))).toEqual({
          personId: ana.id,
          role: "CONTACTO",
          from: "2026-01-01",
        });
        return Response.json({
          ...car,
          relationships: [
            {
              id: "11",
              vehicleId: car.id,
              personId: ana.id,
              person: ana,
              role: "CONTACTO",
              from: "2026-01-01",
              until: null,
            },
          ],
        });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", {
      name: "Personas e historia de AB123CD",
    }),
  );
  await user.type(
    await screen.findByLabelText("Buscar persona para asociar"),
    "30123456",
  );
  await user.click(screen.getByRole("button", { name: "Buscar persona" }));
  await user.click(
    await screen.findByRole("button", { name: "Seleccionar Ana Pérez" }),
  );
  await user.type(screen.getByLabelText("Desde"), "2026-01-01");
  await user.click(screen.getByRole("button", { name: "Asociar persona" }));
  await user.click(screen.getByRole("button", { name: "Confirmar relación" }));
  expect(
    await screen.findByRole("row", { name: /Ana Pérez.*Contacto/ }),
  ).toBeInTheDocument();
});

test("cierra un contacto con fecha exclusiva y mantiene su antecedente visible", async () => {
  const relation = {
    id: "11",
    vehicleId: car.id,
    personId: ana.id,
    person: ana,
    role: "CONTACTO" as const,
    from: "2020-01-01",
    until: null,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/vehicles")
        return Response.json({ items: [car], nextCursor: null });
      if (url.pathname === `/api/vehicles/${car.id}`)
        return Response.json({ ...car, relationships: [relation] });
      if (
        url.pathname === `/api/vehicles/${car.id}/relationships/11` &&
        init?.method === "PATCH"
      ) {
        expect(JSON.parse(String(init.body))).toEqual({ until: "2021-01-01" });
        return Response.json({
          ...car,
          relationships: [{ ...relation, until: "2021-01-01" }],
        });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", {
      name: "Personas e historia de AB123CD",
    }),
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Cerrar relación con Ana Pérez",
    }),
  );
  await user.type(screen.getByLabelText("Hasta (exclusivo)"), "2021-01-01");
  await user.click(screen.getByRole("button", { name: "Confirmar cierre" }));
  expect(
    await screen.findByRole("row", { name: /Ana Pérez.*Finalizada/ }),
  ).toHaveTextContent("2021-01-01");
  expect(
    screen.queryByRole("button", { name: "Cerrar relación con Ana Pérez" }),
  ).not.toBeInTheDocument();
});

test("al crear desde una persona abre la asociación y sólo lo incluye entre sus vehículos después de vincularlo", async () => {
  let related = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/vehicles/duplicates")
        return Response.json({ items: [], nextCursor: null });
      if (url.pathname === "/api/vehicles" && init?.method === "POST")
        return Response.json(car);
      if (url.pathname === "/api/vehicles")
        return Response.json({ items: related ? [car] : [], nextCursor: null });
      if (url.pathname === `/api/vehicles/${car.id}`) return Response.json(car);
      if (url.pathname === `/api/vehicles/${car.id}/relationships`) {
        related = true;
        return Response.json({
          ...car,
          relationships: [
            {
              id: "11",
              vehicleId: car.id,
              personId: ana.id,
              person: ana,
              role: "CONTACTO",
              from: "2026-01-01",
              until: null,
            },
          ],
        });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} person={ana} />);
  await user.click(screen.getByRole("button", { name: "Nuevo vehículo" }));
  await user.type(screen.getByLabelText("Dominio"), "AB123CD");
  await user.type(screen.getByLabelText("Marca"), "Fiat");
  await user.type(screen.getByLabelText("Modelo"), "Cronos");
  await user.type(screen.getByLabelText("Año"), "2020");
  await user.click(screen.getByRole("button", { name: "Crear vehículo" }));
  await screen.findByRole("heading", { name: "Personas de AB123CD" });
  expect(
    within(
      screen.getByRole("region", { name: "Vehículos registrados" }),
    ).queryByRole("row", { name: /AB123CD/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Persona seleccionada:/)).toHaveTextContent(
    "Ana Pérez",
  );
  await user.type(screen.getByLabelText("Desde"), "2026-01-01");
  await user.click(screen.getByRole("button", { name: "Asociar persona" }));
  await user.click(screen.getByRole("button", { name: "Confirmar relación" }));
  expect(
    await within(
      screen.getByRole("region", { name: "Vehículos registrados" }),
    ).findByRole("row", { name: /AB123CD/ }),
  ).toBeInTheDocument();
});
