import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type {
  ComponentModel,
  RegulatoryActor,
  SessionUser,
  Workshop,
} from "@cilgas/contracts";
import { Settings } from "./Settings";

const administrator: SessionUser = {
  id: "1",
  name: "Ana",
  email: "ana@example.test",
  role: "ADMINISTRADOR",
  permissions: ["configuracion.administrar", "personas.gestionar"],
};
const workshop: Workshop = {
  id: "1",
  name: "Taller de prueba",
  cuit: null,
  address: null,
  locality: null,
  province: null,
  phone: null,
  email: null,
  tdmId: null,
};
afterEach(() => vi.unstubAllGlobals());

test("el administrador recupera y actualiza los datos del taller", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/workshop" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toMatchObject({
          name: "Taller actualizado",
          phone: "0341 5550000",
        });
        return Response.json({
          ...workshop,
          name: "Taller actualizado",
          phone: "0341 5550000",
        });
      }
      if (input === "/api/workshop") return Response.json(workshop);
      if (input.startsWith("/api/regulatory-actors"))
        return Response.json({ items: [], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Settings user={administrator} onSessionLost={vi.fn()} />);
  const name = await screen.findByLabelText("Nombre del taller");
  expect(name).toHaveValue("Taller de prueba");
  await user.clear(name);
  await user.type(name, "Taller actualizado");
  await user.type(screen.getByLabelText("Teléfono"), "0341 5550000");
  await user.click(screen.getByRole("button", { name: "Guardar taller" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Datos del taller guardados.",
  );
});

test("registra un actor regulatorio y recupera sus datos para editarlos", async () => {
  let actors: RegulatoryActor[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/workshop") return Response.json(workshop);
      if (input === "/api/regulatory-actors" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as RegulatoryActor;
        const created = { ...body, id: "9", active: true };
        actors.push(created);
        return Response.json(created, { status: 201 });
      }
      if (input === "/api/regulatory-actors/9" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as RegulatoryActor;
        actors = [{ ...actors[0]!, ...body }];
        return Response.json(actors[0]);
      }
      if (input.startsWith("/api/regulatory-actors?")) {
        const q =
          new URL(input, "http://localhost").searchParams.get("q") ?? "";
        return Response.json({
          items: actors.filter((actor) =>
            `${actor.code} ${actor.name}`.includes(q),
          ),
          nextCursor: null,
        });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Settings user={administrator} onSessionLost={vi.fn()} />);
  await user.click(
    screen.getByRole("button", { name: "Actores regulatorios" }),
  );
  await user.click(await screen.findByRole("button", { name: "Nuevo actor" }));
  await user.selectOptions(screen.getByLabelText("Tipo de actor"), "CRPC");
  await user.type(screen.getByLabelText("Código o matrícula"), "CR-20");
  await user.type(screen.getByLabelText("Nombre"), "Centro de prueba");
  await user.click(screen.getByRole("button", { name: "Crear actor" }));
  expect(
    await screen.findByText("Actor regulatorio creado."),
  ).toBeInTheDocument();
  await user.type(screen.getByLabelText("Buscar actores"), "CR-20");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  await user.click(
    await screen.findByRole("button", { name: "Editar Centro de prueba" }),
  );
  expect(screen.getByLabelText("Código o matrícula")).toHaveValue("CR-20");
  await user.type(
    screen.getByLabelText("Responsable técnico"),
    "Profesional de prueba",
  );
  await user.click(screen.getByRole("button", { name: "Guardar actor" }));
  expect(
    await screen.findByText("Actor regulatorio actualizado."),
  ).toBeInTheDocument();
});

test("muestra el actor duplicado antes del alta y permite reutilizarlo", async () => {
  const actor: RegulatoryActor = {
    id: "22",
    type: "PEC",
    code: "PEC-1",
    name: "Productor existente",
    cuit: null,
    address: null,
    locality: null,
    phone: null,
    technicalResponsible: null,
    responsibleLicense: null,
    active: true,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/workshop") return Response.json(workshop);
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/regulatory-actors" && init?.method === "POST")
        return Response.json({ ...actor, id: "23" }, { status: 201 });
      if (input.startsWith("/api/regulatory-actors?"))
        return Response.json({ items: [actor], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Settings user={administrator} onSessionLost={vi.fn()} />);
  await user.click(
    screen.getByRole("button", { name: "Actores regulatorios" }),
  );
  await user.click(await screen.findByRole("button", { name: "Nuevo actor" }));
  await user.selectOptions(screen.getByLabelText("Tipo de actor"), "PEC");
  await user.type(screen.getByLabelText("Código o matrícula"), "pec-1");
  await user.type(screen.getByLabelText("Nombre"), "Otra denominación");
  await user.click(screen.getByRole("button", { name: "Crear actor" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Ya existe Productor existente con ese tipo y código.",
  );
  await user.click(
    screen.getByRole("button", { name: "Usar actor existente" }),
  );
  expect(screen.getByLabelText("Nombre")).toHaveValue("Productor existente");
});

test("conserva el TdM seleccionado aunque sea inactivo y esté en otra página", async () => {
  const selected: RegulatoryActor = {
    id: "101",
    type: "TDM",
    code: "T-101",
    name: "Taller anterior",
    cuit: null,
    address: null,
    locality: null,
    phone: null,
    technicalResponsible: null,
    responsibleLicense: null,
    active: false,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/workshop" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toMatchObject({ tdmId: "101" });
        return Response.json({ ...workshop, tdmId: "101" });
      }
      if (input === "/api/workshop")
        return Response.json({ ...workshop, tdmId: "101" });
      if (input.startsWith("/api/regulatory-actors?")) {
        const lastPage = new URL(input, "http://localhost").searchParams.has(
          "cursor",
        );
        return Response.json(
          lastPage
            ? { items: [selected], nextCursor: null }
            : { items: [], nextCursor: "100" },
        );
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Settings user={administrator} onSessionLost={vi.fn()} />);
  expect(await screen.findByLabelText("Taller de Montaje (TdM)")).toHaveValue(
    "101",
  );
  await user.click(screen.getByRole("button", { name: "Guardar taller" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Datos del taller guardados.",
  );
});

test("crea y busca un modelo de cilindro con capacidad decimal y edita su referencia", async () => {
  let models: ComponentModel[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/workshop") return Response.json(workshop);
      if (input.startsWith("/api/regulatory-actors?"))
        return Response.json({ items: [], nextCursor: null });
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/component-models" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as ComponentModel;
        expect(body).toMatchObject({
          type: "CILINDRO",
          homologationCode: "C-60",
          capacityLiters: "60.50",
        });
        models = [{ ...body, id: "30" }];
        return Response.json(models[0], { status: 201 });
      }
      if (input === "/api/component-models/30" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as ComponentModel;
        models = [{ ...models[0]!, ...body }];
        return Response.json(models[0]);
      }
      if (input.startsWith("/api/component-models?"))
        return Response.json({ items: models, nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Settings user={administrator} onSessionLost={vi.fn()} />);
  await user.click(
    screen.getByRole("button", { name: "Modelos de componentes" }),
  );
  await user.click(await screen.findByRole("button", { name: "Nuevo modelo" }));
  await user.selectOptions(
    screen.getByLabelText("Tipo de componente"),
    "CILINDRO",
  );
  await user.type(screen.getByLabelText("Código de homologación"), "C-60");
  await user.type(screen.getByLabelText("Capacidad en litros"), "60.50");
  await user.click(screen.getByRole("button", { name: "Crear modelo" }));
  expect(
    await screen.findByText("Modelo de componente creado."),
  ).toBeInTheDocument();
  await user.type(screen.getByLabelText("Buscar modelos"), "C-60");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  await user.click(await screen.findByRole("button", { name: "Editar C-60" }));
  expect(screen.getByLabelText("Capacidad en litros")).toHaveValue("60.50");
  await user.type(screen.getByLabelText("Modelo"), "Versión técnica");
  await user.click(screen.getByRole("button", { name: "Guardar modelo" }));
  expect(await screen.findByText("Versión técnica")).toBeInTheDocument();
});

test("detecta un modelo existente antes de crearlo y recupera su referencia", async () => {
  const model: ComponentModel = {
    id: "4",
    type: "REGULADOR",
    homologationCode: "REG-1",
    brand: "Marca de prueba",
    model: null,
    capacityLiters: null,
    active: true,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/workshop") return Response.json(workshop);
      if (input.startsWith("/api/regulatory-actors?"))
        return Response.json({ items: [], nextCursor: null });
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/component-models" && init?.method === "POST")
        return Response.json({ ...model, id: "5" }, { status: 201 });
      if (input.startsWith("/api/component-models?"))
        return Response.json({ items: [model], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Settings user={administrator} onSessionLost={vi.fn()} />);
  await user.click(
    screen.getByRole("button", { name: "Modelos de componentes" }),
  );
  await user.click(await screen.findByRole("button", { name: "Nuevo modelo" }));
  await user.selectOptions(
    screen.getByLabelText("Tipo de componente"),
    "REGULADOR",
  );
  await user.type(screen.getByLabelText("Código de homologación"), "reg-1");
  await user.click(screen.getByRole("button", { name: "Crear modelo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Ya existe REG-1 para ese tipo de componente.",
  );
  await user.click(
    screen.getByRole("button", { name: "Usar modelo existente" }),
  );
  expect(screen.getByLabelText("Marca")).toHaveValue("Marca de prueba");
});

test("el operador consulta los datos técnicos sin acciones de administración", async () => {
  const actor: RegulatoryActor = {
    id: "2",
    type: "CRPC",
    code: "CR-1",
    name: "Centro de revisión",
    cuit: null,
    address: "Calle técnica 123",
    locality: "Rosario",
    phone: "03415550000",
    technicalResponsible: "Profesional registrado",
    responsibleLicense: "MAT-25",
    active: true,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/workshop") return Response.json(workshop);
      if (input.startsWith("/api/regulatory-actors?"))
        return Response.json({ items: [actor], nextCursor: null });
      if (input.startsWith("/api/component-models?"))
        return Response.json({ items: [], nextCursor: null });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(
    <Settings
      user={{
        ...administrator,
        role: "OPERADOR",
        permissions: ["personas.gestionar"],
      }}
      onSessionLost={vi.fn()}
    />,
  );
  expect(await screen.findByLabelText("Nombre del taller")).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Guardar taller" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Actores regulatorios" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Ver Centro de revisión" }),
  );
  expect(screen.getByText("Calle técnica 123")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Nuevo actor" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Editar Centro de revisión" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Modelos de componentes" }),
  );
  expect(
    await screen.findByText("No se encontraron modelos de componentes."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Nuevo modelo" }),
  ).not.toBeInTheDocument();
});
