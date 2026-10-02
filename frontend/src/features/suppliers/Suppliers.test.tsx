import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Suppliers } from "./Suppliers";

const supplier = {
  id: "1",
  name: "Ensayos del Sur",
  cuit: "30712345671",
  phone: "3515000000",
  email: null,
  notes: "Retiro semanal",
  active: true,
};
afterEach(() => vi.unstubAllGlobals());

test("edita el proveedor y permite borrar un contacto opcional", async () => {
  let saved = supplier;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/suppliers/1" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        expect(body.phone).toBeNull();
        saved = { ...saved, ...body };
        return Response.json(saved);
      }
      if (url.pathname === "/api/suppliers")
        return Response.json({ items: [saved], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Suppliers onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Editar Ensayos del Sur" }),
  );
  await user.clear(screen.getByLabelText("Teléfono"));
  await user.click(screen.getByRole("button", { name: "Guardar proveedor" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Proveedor guardado",
  );
  await user.click(
    screen.getByRole("button", { name: "Editar Ensayos del Sur" }),
  );
  expect(screen.getByLabelText("Teléfono")).toHaveValue("");
});

test("recupera un proveedor por CUIT duplicado antes de crear otro", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/suppliers/duplicates")
        return Response.json({ items: [supplier], nextCursor: null });
      if (url.pathname === "/api/suppliers" && init?.method !== "POST")
        return Response.json({ items: [], nextCursor: null });
      throw new Error(`No se debe crear otro proveedor: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Suppliers onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Nuevo proveedor" }),
  );
  await user.type(
    screen.getByLabelText("Nombre o razón social"),
    "Ensayos Sur",
  );
  await user.type(screen.getByLabelText("CUIT"), "30-71234567-1");
  await user.click(screen.getByRole("button", { name: "Crear proveedor" }));
  await user.click(
    await screen.findByRole("button", { name: "Usar proveedor existente" }),
  );
  expect(screen.getByLabelText("Nombre o razón social")).toHaveValue(
    "Ensayos del Sur",
  );
  expect(screen.getByLabelText("Teléfono")).toHaveValue("3515000000");
});

test("al paginar después de recuperar un proveedor conserva una sola fila y sus datos más recientes", async () => {
  const recovered = { ...supplier, id: "30" };
  let failedPage = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/suppliers/duplicates")
        return Response.json({ items: [recovered], nextCursor: null });
      if (url.pathname === "/api/suppliers") {
        if (!url.searchParams.has("cursor"))
          return Response.json({
            items: [{ ...supplier, name: "Laboratorio Norte" }],
            nextCursor: "1",
          });
        if (!failedPage) {
          failedPage = true;
          return Response.json(
            { message: "No se pudo cargar la página." },
            { status: 500 },
          );
        }
        return Response.json({
          items: [
            { ...recovered, phone: "3515999999" },
            { ...supplier, id: "31", name: "Proveedor siguiente" },
          ],
          nextCursor: null,
        });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Suppliers onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Nuevo proveedor" }),
  );
  await user.type(
    screen.getByLabelText("Nombre o razón social"),
    "Ensayos Sur",
  );
  await user.type(screen.getByLabelText("CUIT"), "30-71234567-1");
  await user.click(screen.getByRole("button", { name: "Crear proveedor" }));
  await user.click(
    await screen.findByRole("button", { name: "Usar proveedor existente" }),
  );
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  await user.click(
    screen.getByRole("button", { name: "Cargar más proveedores" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo cargar la página.",
  );
  await user.click(screen.getByRole("button", { name: "Intentar nuevamente" }));
  await screen.findByRole("row", { name: /Proveedor siguiente/ });
  expect(screen.getAllByRole("row", { name: /Ensayos del Sur/ })).toHaveLength(
    1,
  );
  expect(
    screen.getByRole("row", { name: /Ensayos del Sur/ }),
  ).toHaveTextContent("3515999999");
  const rows = screen.getAllByRole("row");
  expect(rows).toHaveLength(4);
  expect(rows[1]).toHaveTextContent("Ensayos del Sur");
  expect(rows[2]).toHaveTextContent("Laboratorio Norte");
  expect(rows[3]).toHaveTextContent("Proveedor siguiente");
});

test("una búsqueda nueva fallida descarta el cursor anterior y se reintenta desde su primera página", async () => {
  let failedSearch = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname !== "/api/suppliers")
        throw new Error(`Petición inesperada: ${input}`);
      if (!url.searchParams.get("q"))
        return Response.json({ items: [supplier], nextCursor: "1" });
      expect(url.searchParams.get("q")).toBe("Córdoba");
      expect(url.searchParams.has("cursor")).toBe(false);
      if (!failedSearch) {
        failedSearch = true;
        return Response.json(
          { message: "No se pudo buscar proveedores." },
          { status: 500 },
        );
      }
      return Response.json({
        items: [{ ...supplier, id: "99", name: "Proveedor Córdoba" }],
        nextCursor: null,
      });
    }),
  );
  const user = userEvent.setup();
  render(<Suppliers onSessionLost={vi.fn()} />);
  await screen.findByRole("row", { name: /Ensayos del Sur/ });
  expect(
    screen.getByRole("button", { name: "Cargar más proveedores" }),
  ).toBeInTheDocument();
  await user.type(screen.getByLabelText("Buscar proveedores"), "Córdoba");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo buscar proveedores.",
  );
  expect(
    screen.queryByRole("button", { name: "Cargar más proveedores" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("row", { name: /Ensayos del Sur/ }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Intentar nuevamente" }));
  expect(
    await screen.findByRole("row", { name: /Proveedor Córdoba/ }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(2);
});
