import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { ServiceDraft } from "@cilgas/contracts";
import { Services } from "./Services";

const draft: ServiceDraft = {
  id: "31",
  version: 1,
  status: "BORRADOR",
  vehicleId: "8",
  vehicle: { id: "8", plate: "AA123BB", brand: "Fiat", model: "Siena" },
  catalogOfferId: "10",
  serviceDate: "2026-10-02",
  description: "Revisión anual",
  type: "REVISION_ANUAL",
  sheetOperation: null,
  includesPh: false,
  totalAmount: "55000.00",
  notes: null,
  createdBy: "1",
  createdByName: "Luz del Taller",
  createdAt: "2026-10-02T12:00:00Z",
  people: [],
  preparation: null,
  interventions: [],
  items: [
    {
      id: "41",
      order: 1,
      catalogItemId: "11",
      description: "Oblea nueva",
      type: "OBLEA",
      componentId: null,
      action: null,
      quantity: "1.00",
      unitPrice: "15000.00",
      discount: "0.00",
      amount: "15000.00",
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

test("corrige el vehículo del borrador sin sustituir sus personas ni preparación", async () => {
  const prepared = {
    ...draft,
    preparation: { previousSticker: "ANT-800" },
    people: [
      {
        role: "TITULAR",
        personId: "7",
        person: {
          id: "7",
          name: "Titular acordado",
          documentType: "DNI",
          documentNumber: "20000000",
        },
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
        return Response.json({
          items: [
            {
              id: "9",
              plate: "AC456DE",
              brand: "Renault",
              model: "Logan",
              active: true,
            },
          ],
          nextCursor: null,
        });
      if (
        url.pathname === "/api/service-drafts/31" &&
        init?.method === "PATCH"
      ) {
        const body = JSON.parse(String(init.body));
        expect(body.vehicleId).toBe("9");
        expect(body.people).toEqual([{ role: "TITULAR", personId: "7" }]);
        expect(body.preparation.previousSticker).toBe("ANT-800");
        return Response.json({
          ...prepared,
          version: 2,
          vehicleId: "9",
          vehicle: {
            id: "9",
            plate: "AC456DE",
            brand: "Renault",
            model: "Logan",
          },
        });
      }
      if (url.pathname === "/api/service-drafts/31")
        return Response.json(prepared);
      if (url.pathname === "/api/service-drafts")
        return Response.json({ items: [prepared], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts={false} onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Editar borrador 31" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Buscar vehículos" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Seleccionar AC456DE" }),
  );
  expect(screen.getByText("Titular acordado")).toBeInTheDocument();
  expect(screen.getByLabelText("Oblea anterior")).toHaveValue("ANT-800");
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Borrador guardado",
  );
  expect(screen.getByRole("row", { name: /Revisión anual/ })).toHaveTextContent(
    "AC456DE",
  );
});

test("reintentar una referencia histórica no guarda el formulario", async () => {
  const existing = {
    ...draft,
    items: [{ ...draft.items[0]!, componentId: "60", action: "ENSAYAR" }],
  };
  let attempts = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/components/60") {
        attempts += 1;
        return attempts === 1
          ? Response.json(
              { message: "Referencia no disponible temporalmente" },
              { status: 503 },
            )
          : Response.json({
              id: "60",
              serialNumber: "SERIE-60",
              model: { homologationCode: "HOMO-C", active: false },
            });
      }
      if (url.pathname === "/api/service-drafts/31" && init?.method === "PATCH")
        return Response.json({ ...existing, version: 2 });
      if (url.pathname === "/api/service-drafts/31")
        return Response.json(existing);
      if (url.pathname === "/api/service-drafts")
        return Response.json({ items: [existing], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts={false} onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Editar borrador 31" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Intentar nuevamente" }),
  );
  expect(
    await screen.findByText(/SERIE-60 · HOMO-C · Modelo inactivo/),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Descripción del servicio")).toHaveValue(
    "Revisión anual",
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("el administrador ajusta costos copiados y puede mantener un proveedor histórico inactivo", async () => {
  const administrative = {
    ...draft,
    items: [
      {
        ...draft.items[0]!,
        costs: [
          {
            supplierId: "80",
            concept: "Provisión oblea",
            treatment: "PROVEEDOR",
            amount: "5000.00",
          },
        ],
      },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/suppliers/80")
        return Response.json({
          id: "80",
          name: "Proveedor histórico",
          active: false,
        });
      if (
        url.pathname === "/api/service-drafts/31" &&
        init?.method === "PATCH"
      ) {
        expect(JSON.parse(String(init.body)).items[0].costs).toEqual([
          {
            supplierId: "80",
            concept: "Provisión oblea",
            treatment: "PROVEEDOR",
            amount: "4500.25",
          },
        ]);
        return Response.json({ ...administrative, version: 2 });
      }
      if (url.pathname === "/api/service-drafts/31")
        return Response.json(administrative);
      if (url.pathname === "/api/service-drafts")
        return Response.json({ items: [administrative], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Editar borrador 31" }),
  );
  expect(await screen.findByText("Proveedor histórico")).toBeInTheDocument();
  await user.clear(screen.getByLabelText("Importe del costo (ARS)"));
  await user.type(screen.getByLabelText("Importe del costo (ARS)"), "4500,25");
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Borrador guardado",
  );
});

test("prepara un componente y datos documentales incompletos sin producir hechos técnicos", async () => {
  const component = {
    id: "60",
    type: "CILINDRO",
    serialNumber: "SERIE-60",
    manufactureMonth: "2020-05",
    model: { id: "6", homologationCode: "HOMO-C", active: true },
  };
  let stored = draft;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/components")
        return Response.json({ items: [component], nextCursor: null });
      if (url.pathname === "/api/components/60")
        return Response.json(component);
      if (
        url.pathname === "/api/service-drafts/31" &&
        init?.method === "PATCH"
      ) {
        const body = JSON.parse(String(init.body));
        expect(body.preparation).toMatchObject({
          previousSticker: "ANT-123",
          newSticker: null,
          notes: "Falta documentación",
        });
        expect(body.items[0]).toMatchObject({
          componentId: "60",
          action: "ENSAYAR",
          quantity: "1.00",
        });
        expect(body.interventions).toEqual([
          expect.objectContaining({
            type: "CILINDRO",
            row: 1,
            componentId: "60",
            serialNumber: "SERIE-60",
            homologationCode: "HOMO-C",
            performsPh: true,
            action: "M",
            phResult: null,
          }),
        ]);
        stored = { ...draft, ...body, version: 2 };
        return Response.json(stored);
      }
      if (url.pathname === "/api/service-drafts/31")
        return Response.json(stored);
      if (url.pathname === "/api/service-drafts")
        return Response.json({ items: [stored], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts={false} onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Editar borrador 31" }),
  );
  const item = await screen.findByRole("group", { name: "Ítem 1" });
  await user.click(
    within(item).getByRole("button", { name: "Buscar componentes" }),
  );
  await user.click(
    await within(item).findByRole("button", { name: "Seleccionar SERIE-60" }),
  );
  await user.selectOptions(
    within(item).getByLabelText("Acción sobre componente"),
    "ENSAYAR",
  );
  await user.type(screen.getByLabelText("Oblea anterior"), "ANT-123");
  await user.type(
    screen.getByLabelText("Observaciones de la ficha"),
    "Falta documentación",
  );
  await user.click(
    screen.getByRole("button", { name: "Agregar intervención" }),
  );
  const intervention = screen.getByRole("group", { name: "Intervención 1" });
  await user.click(
    within(intervention).getByRole("button", { name: "Buscar componentes" }),
  );
  await user.click(
    await within(intervention).findByRole("button", {
      name: "Seleccionar SERIE-60",
    }),
  );
  await user.selectOptions(
    within(intervention).getByLabelText("Marca documental"),
    "M",
  );
  await user.click(within(intervention).getByLabelText("Preparar ensayo PH"));
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Borrador guardado",
  );
  await user.click(screen.getByRole("button", { name: "Editar borrador 31" }));
  expect(await screen.findByLabelText("Oblea anterior")).toHaveValue("ANT-123");
  expect(
    within(
      screen.getByRole("group", { name: "Intervención 1" }),
    ).getByLabelText("Número de serie documental"),
  ).toHaveValue("SERIE-60");
});

test("conserva el titular histórico y permite elegir el contacto y pagador existentes", async () => {
  const historic = {
    ...draft,
    people: [
      {
        role: "TITULAR",
        personId: "7",
        person: {
          id: "7",
          name: "Titular histórico",
          documentType: "DNI",
          documentNumber: "20000000",
        },
      },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/people") {
        expect(url.searchParams.get("active")).toBe("true");
        return Response.json({
          items: [
            {
              id: "9",
              name: "María Gómez",
              documentType: "DNI",
              documentNumber: "30000000",
              active: true,
            },
          ],
          nextCursor: null,
        });
      }
      if (
        url.pathname === "/api/service-drafts/31" &&
        init?.method === "PATCH"
      ) {
        expect(JSON.parse(String(init.body)).people).toEqual([
          { role: "TITULAR", personId: "7" },
          { role: "CONTACTO", personId: "9" },
          { role: "PAGADOR", personId: "9" },
        ]);
        return Response.json({ ...historic, version: 2 });
      }
      if (url.pathname === "/api/service-drafts/31")
        return Response.json(historic);
      if (url.pathname === "/api/service-drafts")
        return Response.json({ items: [historic], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts={false} onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Editar borrador 31" }),
  );
  expect(await screen.findByText("Titular histórico")).toBeInTheDocument();
  for (const role of ["Contacto", "Pagador"]) {
    const group = screen.getByRole("group", { name: role });
    await user.click(
      within(group).getByRole("button", { name: "Buscar personas" }),
    );
    await user.click(
      await within(group).findByRole("button", {
        name: "Seleccionar María Gómez",
      }),
    );
  }
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Borrador guardado",
  );
});

test("un conflicto conserva la edición local y sólo recarga la versión compartida tras una acción explícita", async () => {
  let latest = draft;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (
        url.pathname === "/api/service-drafts/31" &&
        init?.method === "PATCH"
      ) {
        latest = {
          ...draft,
          version: 2,
          description: "Cambio de otra persona",
        };
        return Response.json(
          { message: "Otra persona actualizó este borrador." },
          { status: 409 },
        );
      }
      if (url.pathname === "/api/service-drafts/31")
        return Response.json(latest);
      if (url.pathname === "/api/service-drafts")
        return Response.json({ items: [draft], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts={false} onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Editar borrador 31" }),
  );
  await user.clear(await screen.findByLabelText("Descripción del servicio"));
  await user.type(
    screen.getByLabelText("Descripción del servicio"),
    "Mi ajuste pendiente",
  );
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Otra persona actualizó",
  );
  expect(screen.getByLabelText("Descripción del servicio")).toHaveValue(
    "Mi ajuste pendiente",
  );
  await user.click(screen.getByRole("button", { name: "Recargar borrador" }));
  expect(screen.getByLabelText("Descripción del servicio")).toHaveValue(
    "Mi ajuste pendiente",
  );
  await user.click(
    screen.getByRole("button", { name: "Descartar mis cambios y recargar" }),
  );
  expect(
    await screen.findByDisplayValue("Cambio de otra persona"),
  ).toBeInTheDocument();
});

test("crea desde vehículo y oferta, ajusta la propuesta copiada y recupera el borrador sin cambiar el catálogo", async () => {
  let stored: ServiceDraft | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/vehicles")
        return Response.json({
          items: [{ ...draft.vehicle, active: true }],
          nextCursor: null,
        });
      if (url.pathname === "/api/catalog-services")
        return Response.json({
          items: [
            {
              id: "10",
              name: "Revisión anual",
              code: "ANUAL",
              suggestedPrice: "55000.00",
              active: true,
            },
          ],
          nextCursor: null,
        });
      if (url.pathname === "/api/service-drafts" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toMatchObject({
          vehicleId: "8",
          catalogOfferId: "10",
        });
        stored = { ...draft };
        return Response.json(stored);
      }
      if (
        url.pathname === "/api/service-drafts/31" &&
        init?.method === "PATCH"
      ) {
        const body = JSON.parse(String(init.body));
        expect(body.version).toBe(1);
        expect(body.items[0]).toMatchObject({
          id: "41",
          quantity: "2",
          unitPrice: "15000.00",
          discount: "500.50",
        });
        expect(body.items[0]).not.toHaveProperty("costs");
        stored = { ...draft, ...body, version: 2 };
        return Response.json(stored);
      }
      if (url.pathname === "/api/service-drafts/31")
        return Response.json(stored);
      if (url.pathname === "/api/service-drafts")
        return Response.json({
          items: stored ? [stored] : [],
          nextCursor: null,
        });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts={false} onSessionLost={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Nuevo borrador" }));
  await user.click(screen.getByRole("button", { name: "Buscar vehículos" }));
  await user.click(
    await screen.findByRole("button", { name: "Seleccionar AA123BB" }),
  );
  await user.click(screen.getByRole("button", { name: "Buscar ofertas" }));
  await user.click(
    await screen.findByRole("button", { name: "Seleccionar Revisión anual" }),
  );
  await user.click(screen.getByRole("button", { name: "Crear borrador" }));
  const description = await screen.findByLabelText("Descripción del servicio");
  await user.clear(description);
  await user.type(description, "Revisión anual ajustada");
  const item = screen.getByRole("group", { name: "Ítem 1" });
  await user.clear(within(item).getByLabelText("Cantidad"));
  await user.type(within(item).getByLabelText("Cantidad"), "2");
  await user.clear(within(item).getByLabelText("Descuento (ARS)"));
  await user.type(within(item).getByLabelText("Descuento (ARS)"), "500,50");
  expect(screen.queryByText(/Costo|Proveedor/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Borrador guardado",
  );
  await user.click(screen.getByRole("button", { name: "Editar borrador 31" }));
  expect(await screen.findByLabelText("Descripción del servicio")).toHaveValue(
    "Revisión anual ajustada",
  );
  expect(
    within(screen.getByRole("group", { name: "Ítem 1" })).getByLabelText(
      "Descuento (ARS)",
    ),
  ).toHaveValue("500.50");
});

test("busca borradores compartidos y continúa la búsqueda paginada por dominio", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/service-drafts") {
        if (!url.searchParams.get("q"))
          return Response.json({ items: [], nextCursor: null });
        expect(url.searchParams.get("q")).toBe("AA123BB");
        return Response.json(
          url.searchParams.has("cursor")
            ? {
                items: [
                  { ...draft, id: "32", description: "Revisión quinquenal" },
                ],
                nextCursor: null,
              }
            : { items: [draft], nextCursor: "31" },
        );
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Services canViewCosts={false} onSessionLost={vi.fn()} />);
  await screen.findByText("No hay borradores para esta búsqueda.");
  await user.type(screen.getByLabelText("Buscar borradores"), "AA123BB");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  expect(
    await screen.findByRole("row", { name: /Revisión anual/ }),
  ).toHaveTextContent("55000.00");
  await user.click(
    screen.getByRole("button", { name: "Cargar más borradores" }),
  );
  expect(
    await screen.findByRole("row", { name: /Revisión quinquenal/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("row", { name: /Revisión anual/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Confirmar|Cobrar/ }),
  ).not.toBeInTheDocument();
});
