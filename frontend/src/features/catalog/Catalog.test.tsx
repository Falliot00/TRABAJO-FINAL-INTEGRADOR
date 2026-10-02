import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { CatalogOffer } from "@cilgas/contracts";
import { Catalog } from "./Catalog";

const annual: CatalogOffer = {
  id: "10",
  code: "ANUAL",
  name: "Revisión anual",
  description: "Revisión y oblea",
  type: "REVISION_ANUAL",
  suggestedPrice: "55000.00",
  active: true,
  items: [
    {
      id: "11",
      order: 1,
      description: "Oblea nueva",
      type: "OBLEA",
      quantity: "1.00",
      unitPrice: "15000.00",
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());

test("el operador consulta oferta y composición sin controles administrativos ni costos", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (
        new URL(input, "http://localhost").pathname === "/api/catalog-services"
      )
        return Response.json({ items: [annual], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Catalog editable={false} onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", {
      name: "Ver composición de Revisión anual",
    }),
  );
  const detail = screen.getByRole("region", {
    name: "Composición de Revisión anual",
  });
  expect(detail).toHaveTextContent("Oblea nueva");
  expect(within(detail).getByText("15000.00")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Nueva oferta" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Editar/ }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/Costo|Proveedor/)).not.toBeInTheDocument();
});

test("prepara la revisión quinquenal y ajusta cantidades y recambio de válvulas antes de guardar", async () => {
  let stored: CatalogOffer | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/catalog-services/duplicates")
        return Response.json({ items: [], nextCursor: null });
      if (url.pathname === "/api/catalog-services" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.suggestedPrice).toBe("120000.50");
        expect(body.items.map((item: { type: string }) => item.type)).toEqual([
          "INSPECCION",
          "OBLEA",
          "ENSAYO_PH",
        ]);
        expect(body.items[2].quantity).toBe("4");
        stored = {
          ...body,
          id: "20",
          items: body.items.map((item: object, index: number) => ({
            ...item,
            id: String(index + 21),
          })),
        };
        return Response.json(stored);
      }
      if (url.pathname === "/api/catalog-services")
        return Response.json({
          items: stored ? [stored] : [],
          nextCursor: null,
        });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Catalog editable onSessionLost={vi.fn()} />);
  await user.click(await screen.findByRole("button", { name: "Nueva oferta" }));
  await user.type(screen.getByLabelText("Código"), "QUINQUENAL");
  await user.type(screen.getByLabelText("Nombre"), "Revisión quinquenal");
  await user.type(
    screen.getByLabelText("Descripción"),
    "Revisión de cilindros",
  );
  await user.selectOptions(
    screen.getByLabelText("Tipo de oferta"),
    "REVISION_QUINQUENAL",
  );
  await user.type(screen.getByLabelText("Precio sugerido (ARS)"), "120000,50");
  await user.click(
    screen.getByRole("button", { name: "Usar propuesta habitual" }),
  );
  const ph = screen.getByRole("group", { name: "Ítem 3" });
  await user.clear(within(ph).getByLabelText("Cantidad"));
  await user.type(within(ph).getByLabelText("Cantidad"), "4");
  await user.click(
    within(screen.getByRole("group", { name: "Ítem 4" })).getByRole("button", {
      name: "Quitar ítem",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Crear oferta" }));
  expect(
    await screen.findByRole("row", { name: /Revisión quinquenal/ }),
  ).toHaveTextContent("120000.50");
});

test("el administrador cambia y limpia el proveedor propuesto conservando la identidad del ítem", async () => {
  let stored: CatalogOffer = {
    ...annual,
    items: [{ ...annual.items[0]!, supplierId: "1", unitCost: "5000.00" }],
  };
  let saves = 0;
  const supplier = {
    id: "1",
    name: "Ensayos del Sur",
    cuit: null,
    phone: null,
    email: null,
    notes: null,
    active: true,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/catalog-services/duplicates")
        return Response.json({ items: [], nextCursor: null });
      if (url.pathname === "/api/suppliers/1") return Response.json(supplier);
      if (url.pathname === "/api/suppliers")
        return Response.json({ items: [supplier], nextCursor: null });
      if (
        url.pathname === "/api/catalog-services/10" &&
        init?.method === "PATCH"
      ) {
        const body = JSON.parse(String(init.body));
        expect(body.items[0].id).toBe("11");
        expect(body.items[0].supplierId).toBe(saves === 0 ? null : "1");
        expect(body.items[0].unitCost).toBe("2500.25");
        saves += 1;
        stored = { ...stored, ...body };
        return Response.json(stored);
      }
      if (url.pathname === "/api/catalog-services")
        return Response.json({ items: [stored], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Catalog editable onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", {
      name: "Ver composición de Revisión anual",
    }),
  );
  expect(
    await within(
      screen.getByRole("region", { name: "Composición de Revisión anual" }),
    ).findByText("Ensayos del Sur"),
  ).toBeInTheDocument();
  await user.click(
    await screen.findByRole("button", { name: "Editar Revisión anual" }),
  );
  expect(await screen.findByText("Ensayos del Sur")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Quitar proveedor" }));
  await user.clear(screen.getByLabelText("Costo unitario (ARS)"));
  await user.type(screen.getByLabelText("Costo unitario (ARS)"), "2500,25");
  await user.click(screen.getByRole("button", { name: "Guardar oferta" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Oferta guardada",
  );
  await user.click(
    screen.getByRole("button", { name: "Editar Revisión anual" }),
  );
  await user.type(
    screen.getByLabelText("Buscar proveedor del ítem"),
    "Ensayos",
  );
  await user.click(screen.getByRole("button", { name: "Buscar proveedores" }));
  await user.click(
    await screen.findByRole("button", { name: "Seleccionar Ensayos del Sur" }),
  );
  await user.click(screen.getByRole("button", { name: "Guardar oferta" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Oferta guardada",
  );
});
