import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { Component, ComponentModel } from "@cilgas/contracts";
import { Components } from "./Components";

const model: ComponentModel = {
  id: "3",
  type: "CILINDRO",
  homologationCode: "CYL-30",
  brand: "Cilindros Sur",
  model: "30 L",
  capacityLiters: "30.00",
  active: true,
};
const component: Component = {
  id: "7",
  modelId: "3",
  type: "CILINDRO",
  serialNumber: "000123",
  manufactureMonth: "2024-03",
  notes: "Sin instalación registrada",
  model,
};
afterEach(() => vi.unstubAllGlobals());

test("registra un cilindro con modelo seleccionado y mes de fabricación sin crear una instalación", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/component-models")
        return Response.json({ items: [model], nextCursor: null });
      if (url.pathname === "/api/components/duplicates")
        return Response.json({ items: [], nextCursor: null });
      if (url.pathname === "/api/components" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          modelId: "3",
          type: "CILINDRO",
          serialNumber: "000123",
          manufactureMonth: "2024-03",
          notes: null,
        });
        return Response.json({ ...component, notes: null });
      }
      if (url.pathname === "/api/components")
        return Response.json({ items: [], nextCursor: null });
      if (url.pathname === "/api/components/7/history")
        return Response.json({
          componentId: "7",
          available: false,
          message: "La historia estará disponible al confirmar servicios.",
        });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Components onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Nuevo componente" }),
  );
  await user.type(
    screen.getByLabelText("Buscar modelo para el componente"),
    "CYL",
  );
  await user.click(screen.getByRole("button", { name: "Buscar modelos" }));
  await user.click(
    await screen.findByRole("button", { name: "Seleccionar CYL-30" }),
  );
  await user.type(screen.getByLabelText("Número de serie"), "000123");
  fireEvent.change(screen.getByLabelText("Fabricación (mes y año)"), {
    target: { value: "2024-03" },
  });
  await user.click(screen.getByRole("button", { name: "Crear componente" }));
  expect(await screen.findByRole("row", { name: /000123/ })).toHaveTextContent(
    "03/2024",
  );
  await user.click(
    screen.getByRole("button", { name: "Ver historia de 000123" }),
  );
  expect(
    await screen.findByText(
      "La historia estará disponible al confirmar servicios.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Instalar|Retirar|Dar de baja/ }),
  ).not.toBeInTheDocument();
});

test("recupera la identidad duplicada y permite borrar mes y observaciones", async () => {
  let saved = component;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/component-models")
        return Response.json({ items: [model], nextCursor: null });
      if (url.pathname === "/api/components/duplicates")
        return Response.json({
          items: url.searchParams.has("excludeId") ? [] : [saved],
          nextCursor: null,
        });
      if (url.pathname === "/api/components/7" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        expect(body.manufactureMonth).toBeNull();
        expect(body.notes).toBeNull();
        saved = { ...saved, ...body };
        return Response.json(saved);
      }
      if (url.pathname === "/api/components" && init?.method !== "POST")
        return Response.json({ items: [], nextCursor: null });
      throw new Error(`No se debe duplicar el componente: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Components onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", { name: "Nuevo componente" }),
  );
  await user.click(screen.getByRole("button", { name: "Buscar modelos" }));
  await user.click(
    await screen.findByRole("button", { name: "Seleccionar CYL-30" }),
  );
  await user.type(screen.getByLabelText("Número de serie"), "000123");
  await user.click(screen.getByRole("button", { name: "Crear componente" }));
  await user.click(
    await screen.findByRole("button", { name: "Usar componente existente" }),
  );
  expect(screen.getByLabelText("Fabricación (mes y año)")).toHaveValue(
    "2024-03",
  );
  fireEvent.change(screen.getByLabelText("Fabricación (mes y año)"), {
    target: { value: "" },
  });
  await user.clear(screen.getByLabelText("Observaciones"));
  await user.click(screen.getByRole("button", { name: "Guardar componente" }));
  expect(await screen.findByRole("row", { name: /000123/ })).toHaveTextContent(
    "Sin informar",
  );
});
