import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Vehicles } from "./Vehicles";
import { InitialEquipmentSurvey } from "./InitialEquipmentSurvey";

const car = {
  id: "8",
  plate: "AA123BB",
  brand: "Fiat",
  model: "Siena",
  year: 2020,
  active: true,
};
const identities = [
  { id: "50", type: "REGULADOR", serialNumber: "REG-1" },
  { id: "60", type: "CILINDRO", serialNumber: "CIL-1" },
  { id: "70", type: "VALVULA", serialNumber: "VAL-1" },
].map((component) => ({
  ...component,
  model: { homologationCode: "HC", active: true },
}));

afterEach(() => vi.unstubAllGlobals());

async function selectComponent(
  user: ReturnType<typeof userEvent.setup>,
  groupName: string,
  serial: string,
) {
  const group = within(screen.getByRole("group", { name: groupName }));
  await user.click(group.getByRole("button", { name: "Buscar componentes" }));
  await user.click(
    await group.findByRole("button", { name: `Seleccionar ${serial}` }),
  );
}

test("registra desde el vehículo el equipo existente con parejas explícitas y antecedentes desconocidos", async () => {
  let survey: Record<string, unknown> | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/vehicles")
        return Response.json({ items: [car], nextCursor: null });
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/components")
        return Response.json({
          items: identities.filter(
            (component) => component.type === url.searchParams.get("type"),
          ),
          nextCursor: null,
        });
      if (url.pathname.startsWith("/api/components/"))
        return Response.json(
          identities.find((component) => input.endsWith(`/${component.id}`)),
        );
      if (url.pathname === "/api/vehicles/8/configurations/initial-survey") {
        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({
          idempotencyKey: expect.any(String),
          regulatorId: "50",
          pairs: [{ position: 1, cylinderId: "60", valveId: "70" }],
          notes: null,
        });
        survey = {
          configurationId: "20",
          vehicleId: "8",
          recordedAt: "2026-10-05T15:00:00Z",
          recordedBy: "1",
          regulatorId: "50",
          pairs: [{ position: 1, cylinderId: "60", valveId: "70", ph: null }],
          sticker: null,
          notes: null,
        };
        return Response.json(survey, { status: 201 });
      }
      if (url.pathname === "/api/vehicles/8/configurations")
        return Response.json({
          vehicleId: "8",
          available: Boolean(survey),
          canRegisterInitialSurvey: !survey,
          message: survey ? "Configuraciones registradas" : "Sin relevamiento",
          currentConfigurationId: survey ? "20" : null,
          configurations: survey
            ? [
                {
                  id: "20",
                  serviceId: null,
                  validFrom: "2026-10-05T15:00:00Z",
                  validUntil: null,
                  components: identities.map((component) => ({
                    componentId: component.id,
                    type: component.type,
                    position: 1,
                    cylinderId: component.type === "VALVULA" ? "60" : null,
                  })),
                  initialSurvey: survey,
                },
              ]
            : [],
        });
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(<Vehicles onSessionLost={vi.fn()} />);
  await user.click(
    await screen.findByRole("button", {
      name: "Ver configuraciones de AA123BB",
    }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Relevar equipo existente" }),
  );
  await selectComponent(user, "Regulador del equipo", "REG-1");
  await selectComponent(user, "Cilindro de pareja 1", "CIL-1");
  await selectComponent(user, "Válvula de pareja 1", "VAL-1");
  await user.click(
    screen.getByRole("button", { name: "Guardar relevamiento inicial" }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Relevamiento inicial guardado",
  );
  const current = await screen.findByRole("region", {
    name: "Configuración 20 vigente",
  });
  expect(current).toHaveTextContent("Relevamiento inicial");
  expect(current).toHaveTextContent("Antecedente de PH desconocido");
  expect(current).toHaveTextContent("Antecedente de oblea desconocido");
  expect(current).not.toHaveTextContent("Servicio Sin informar");
  expect(
    screen.queryByRole("button", { name: "Relevar equipo existente" }),
  ).not.toBeInTheDocument();
});

test("conserva cuatro parejas y los antecedentes parciales conocidos sin agregar precisión ni certificados", async () => {
  const onSaved = vi.fn();
  const equipment = [
    ...identities,
    ...[2, 3, 4].flatMap((position) => [
      {
        id: String(59 + position),
        type: "CILINDRO",
        serialNumber: `CIL-${position}`,
        model: { homologationCode: "HC", active: true },
      },
      {
        id: String(69 + position),
        type: "VALVULA",
        serialNumber: `VAL-${position}`,
        model: { homologationCode: "HV", active: true },
      },
    ]),
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/components")
        return Response.json({
          items: equipment.filter(
            (component) => component.type === url.searchParams.get("type"),
          ),
          nextCursor: null,
        });
      if (url.pathname.startsWith("/api/components/"))
        return Response.json(
          equipment.find((component) => input.endsWith(`/${component.id}`)),
        );
      if (url.pathname.endsWith("/initial-survey")) {
        expect(JSON.parse(String(init?.body))).toEqual({
          idempotencyKey: expect.any(String),
          regulatorId: "50",
          pairs: [
            {
              position: 1,
              cylinderId: "60",
              valveId: "70",
              ph: {
                testDate: "2025-09",
                expiresOn: "2030-09-30",
                result: "APROBADO",
                certificateNumber: null,
                crpcId: null,
              },
            },
            { position: 2, cylinderId: "61", valveId: "71" },
            { position: 3, cylinderId: "62", valveId: "72" },
            { position: 4, cylinderId: "63", valveId: "73" },
          ],
          sticker: {
            number: "OB-ANTERIOR",
            enabledOn: null,
            expiresOn: "2027-09-30",
          },
          notes: null,
        });
        return Response.json({ configurationId: "20" });
      }
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const user = userEvent.setup();
  render(
    <InitialEquipmentSurvey
      vehicleId="8"
      onSaved={onSaved}
      onCancel={vi.fn()}
      onReload={vi.fn()}
      onSessionLost={vi.fn()}
    />,
  );
  await selectComponent(user, "Regulador del equipo", "REG-1");
  for (const position of [1, 2, 3, 4]) {
    if (position > 1)
      await user.click(screen.getByRole("button", { name: "Agregar pareja" }));
    await selectComponent(
      user,
      `Cilindro de pareja ${position}`,
      `CIL-${position}`,
    );
    await selectComponent(
      user,
      `Válvula de pareja ${position}`,
      `VAL-${position}`,
    );
  }
  expect(screen.getByRole("button", { name: "Agregar pareja" })).toBeDisabled();
  const firstPair = within(screen.getByRole("group", { name: "Pareja 1" }));
  await user.click(
    firstPair.getByLabelText("Registrar antecedente conocido de PH"),
  );
  await user.type(
    firstPair.getByLabelText("Fecha conocida de PH (mes o día)"),
    "2025-09",
  );
  fireEvent.change(firstPair.getByLabelText("Vencimiento conocido de PH"), {
    target: { value: "2030-09-30" },
  });
  await user.selectOptions(
    firstPair.getByLabelText("Resultado conocido de PH"),
    "APROBADO",
  );
  await user.click(
    screen.getByLabelText("Registrar antecedente conocido de oblea"),
  );
  await user.type(
    screen.getByLabelText("Número conocido de oblea"),
    "OB-ANTERIOR",
  );
  fireEvent.change(screen.getByLabelText("Vencimiento conocido de oblea"), {
    target: { value: "2027-09-30" },
  });
  await user.click(
    screen.getByRole("button", { name: "Guardar relevamiento inicial" }),
  );
  expect(onSaved).toHaveBeenCalledOnce();
});

async function prepareSurvey(
  save: (init: RequestInit | undefined) => Response | Promise<Response>,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/components")
        return Response.json({
          items: identities.filter(
            (component) => component.type === url.searchParams.get("type"),
          ),
          nextCursor: null,
        });
      if (url.pathname.startsWith("/api/components/"))
        return Response.json(
          identities.find((component) => input.endsWith(`/${component.id}`)),
        );
      if (url.pathname.endsWith("/initial-survey")) return save(init);
      throw new Error(`Petición inesperada: ${input}`);
    }),
  );
  const onSaved = vi.fn();
  const onReload = vi.fn();
  const user = userEvent.setup();
  render(
    <InitialEquipmentSurvey
      vehicleId="8"
      onSaved={onSaved}
      onReload={onReload}
      onCancel={vi.fn()}
      onSessionLost={vi.fn()}
    />,
  );
  await selectComponent(user, "Regulador del equipo", "REG-1");
  await selectComponent(user, "Cilindro de pareja 1", "CIL-1");
  await selectComponent(user, "Válvula de pareja 1", "VAL-1");
  return { user, onSaved, onReload };
}

test("reintenta el mismo relevamiento tras perder la respuesta sin cambiar su clave ni sus datos", async () => {
  const attempts: string[] = [];
  const { user, onSaved } = await prepareSurvey((init) => {
    attempts.push(String(init?.body));
    if (attempts.length === 1) throw new TypeError("Conexión interrumpida");
    return Response.json({ configurationId: "20" });
  });
  await user.type(
    screen.getByLabelText("Observaciones del relevamiento"),
    "Verificado en taller",
  );
  await user.click(
    screen.getByRole("button", { name: "Guardar relevamiento inicial" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No pudimos conectarnos",
  );
  expect(onSaved).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Reintentar relevamiento" }),
  );
  expect(onSaved).toHaveBeenCalledOnce();
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toBe(attempts[0]);
});

test.each([409, 403])(
  "conserva el formulario ante una respuesta %i y exige recargar antes de volver a guardar",
  async (status) => {
    const { user, onSaved, onReload } = await prepareSurvey(() =>
      Response.json(
        { message: "El componente ya está instalado en otro vehículo." },
        { status },
      ),
    );
    await user.type(
      screen.getByLabelText("Observaciones del relevamiento"),
      "Equipo observado",
    );
    await user.click(
      screen.getByRole("button", { name: "Guardar relevamiento inicial" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El componente ya está instalado",
    );
    expect(screen.getByLabelText("Observaciones del relevamiento")).toHaveValue(
      "Equipo observado",
    );
    expect(
      screen.getByRole("button", { name: "Reintentar relevamiento" }),
    ).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Recargar configuraciones" }),
    );
    expect(onReload).toHaveBeenCalledOnce();
  },
);
