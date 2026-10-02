import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { SessionUser, UserSummary } from "@cilgas/contracts";
import { App } from "./App";

const operator: SessionUser = {
  id: "9007199254740993",
  name: "Ana del Taller",
  email: "ana@example.test",
  role: "OPERADOR",
  permissions: [],
};
const administrator: UserSummary = {
  id: "1",
  name: "Luz del Taller",
  email: "luz@example.test",
  role: "ADMINISTRADOR",
  permissions: ["usuarios.administrar", "auditoria.consultar"],
  active: true,
  createdAt: "2026-10-02T12:00:00Z",
};

afterEach(() => vi.unstubAllGlobals());

test("una cuenta autorizada inicia sesión y el operador accede sólo a su espacio", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/session")
        return Response.json({}, { status: 401 });
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/auth/login" && init?.method === "POST") {
        expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("test-csrf");
        return Response.json({ user: operator });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.type(
    await screen.findByLabelText("Correo electrónico"),
    "ana@example.test",
  );
  await user.type(screen.getByLabelText("Contraseña"), "una-clave-de-prueba");
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
  expect(
    await screen.findByRole("heading", { name: "Hola, Ana" }),
  ).toBeInTheDocument();
  expect(screen.getByText("ana@example.test")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Usuarios" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Auditoría" }),
  ).not.toBeInTheDocument();
});

test("un acceso rechazado muestra un mensaje genérico sin confundirlo con una sesión revocada", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      return Response.json(
        { message: "Detalle de cuenta que no debe mostrarse" },
        { status: 401 },
      );
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.type(
    await screen.findByLabelText("Correo electrónico"),
    "ana@example.test",
  );
  await user.type(screen.getByLabelText("Contraseña"), "clave-equivocada");
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Revisá tu correo y contraseña",
  );
  expect(screen.queryByText(/Detalle de cuenta/)).not.toBeInTheDocument();
  expect(screen.queryByText(/sesión finalizó/)).not.toBeInTheDocument();
});

test("cerrar sesión vuelve al acceso después de revocar la sesión del servidor", async () => {
  let signedIn = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/session")
        return Response.json({ user: operator });
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/auth/logout" && init?.method === "POST") {
        signedIn = false;
        return new Response(null, { status: 204 });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole("button", { name: "Cerrar sesión" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Ingresá a CILGAS" }),
  ).toBeInTheDocument();
  expect(signedIn).toBe(false);
});

test("un administrador crea una cuenta individual con el rol elegido", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/session")
        return Response.json({ user: administrator });
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/users" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          name: "Mateo del Taller",
          email: "mateo@example.test",
          password: "clave-provisional",
          role: "OPERADOR",
        });
        return Response.json({
          ...operator,
          id: "2",
          name: "Mateo del Taller",
          email: "mateo@example.test",
          active: true,
          createdAt: "2026-10-02T12:10:00Z",
        });
      }
      if (input === "/api/users") return Response.json([administrator]);
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Usuarios" }));
  await user.click(
    await screen.findByRole("button", { name: "Nuevo usuario" }),
  );
  await user.type(screen.getByLabelText("Nombre"), "Mateo del Taller");
  await user.type(
    screen.getByLabelText("Correo electrónico"),
    "mateo@example.test",
  );
  await user.type(
    screen.getByLabelText("Contraseña inicial"),
    "clave-provisional",
  );
  await user.selectOptions(screen.getByLabelText("Rol"), "OPERADOR");
  await user.click(screen.getByRole("button", { name: "Crear usuario" }));
  const createdRow = await screen.findByRole("row", {
    name: /Mateo del Taller/,
  });
  expect(within(createdRow).getByText("Operador")).toBeInTheDocument();
  expect(within(createdRow).getByText("Activa")).toBeInTheDocument();
});

test("el administrador confirma un cambio de rol y puede revocar sesiones sin eliminar la cuenta", async () => {
  const teammate: UserSummary = {
    ...operator,
    active: true,
    createdAt: "2026-10-02T12:10:00Z",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/session")
        return Response.json({ user: administrator });
      if (input === "/api/auth/csrf")
        return Response.json({ csrfToken: "test-csrf" });
      if (input === "/api/users")
        return Response.json([administrator, teammate]);
      if (input === `/api/users/${teammate.id}` && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({
          name: "Ana del Taller",
          role: "ADMINISTRADOR",
          active: true,
        });
        return Response.json({ ...teammate, role: "ADMINISTRADOR" });
      }
      if (input === `/api/users/${teammate.id}/revoke-sessions`)
        return new Response(null, { status: 204 });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Usuarios" }));
  await user.click(
    await screen.findByRole("button", { name: "Editar Ana del Taller" }),
  );
  await user.selectOptions(screen.getByLabelText("Rol"), "ADMINISTRADOR");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(
    screen.getByText(/El cambio de rol o la desactivación cerrará/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Confirmar cambios" }));
  const changedRow = await screen.findByRole("row", {
    name: /Ana del Taller.*Administrador/,
  });
  expect(changedRow).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Editar Ana del Taller" }),
  );
  await user.click(screen.getByRole("button", { name: "Revocar sesiones" }));
  await user.click(screen.getByRole("button", { name: "Revocar ahora" }));
  expect(
    await screen.findByText(
      "Se cerraron todas las sesiones de Ana del Taller.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("row", { name: /Ana del Taller/ }),
  ).toBeInTheDocument();
});

test("la auditoría permite consultar páginas anteriores y una sesión revocada vuelve al acceso", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/auth/session")
        return Response.json({ user: administrator });
      if (input === "/api/audit?limit=25")
        return Response.json({
          items: [
            {
              id: "9007199254740995",
              actorId: "1",
              occurredAt: "2026-10-02T13:30:00Z",
              action: "USUARIO_CREADO",
              entity: "usuarios",
              entityId: "2",
              result: "EXITO",
              detail: "Se creó la cuenta del taller.",
            },
          ],
          nextCursor: "9007199254740995",
        });
      if (input === "/api/audit?limit=25&cursor=9007199254740995")
        return Response.json({
          items: [
            {
              id: "9007199254740994",
              actorId: "1",
              occurredAt: "2026-10-02T13:00:00Z",
              action: "SESION_INICIADA",
              entity: "usuarios",
              entityId: "1",
              result: "EXITO",
              detail: null,
            },
          ],
          nextCursor: null,
        });
      if (input === "/api/users") return Response.json({}, { status: 401 });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Auditoría" }));
  expect(await screen.findByText("Cuenta creada")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Más antiguos" }));
  expect(await screen.findByText("Inicio de sesión")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Más antiguos" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Más recientes" }));
  expect(await screen.findByText("Cuenta creada")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Usuarios" }));
  expect(
    await screen.findByText(
      "Tu sesión finalizó o fue revocada. Ingresá nuevamente.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});
