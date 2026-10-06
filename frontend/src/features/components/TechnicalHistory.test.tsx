import { render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TechnicalHistory } from "./TechnicalHistory";

afterEach(() => vi.unstubAllGlobals());

test("reconstruye las válvulas anterior y vigente del cilindro desde vínculos explícitos", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        componentId: "63",
        available: true,
        message: "Historia registrada",
        movements: [],
        activities: [],
        revisions: [],
        cylinderValveLinks: [
          {
            configurationId: "20",
            serviceId: "31",
            cylinderId: "63",
            valveId: "106",
            validFrom: "2026-09-14T15:00:00Z",
            validUntil: null,
          },
          {
            configurationId: "19",
            serviceId: "30",
            cylinderId: "63",
            valveId: "107",
            validFrom: "2025-09-14T15:00:00Z",
            validUntil: "2026-09-14T15:00:00Z",
          },
        ],
      }),
    ),
  );
  render(
    <TechnicalHistory
      id="63"
      kind="component"
      onSessionLost={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  const links = await screen.findByRole("table", {
    name: "Vínculos entre cilindros y válvulas",
  });
  expect(
    within(links).getByRole("row", { name: /63 106 31/ }),
  ).toHaveTextContent("Vigente");
  expect(
    within(links).getByRole("row", { name: /63 107 30/ }),
  ).toHaveTextContent("14/09/2026, 12:00");
});

test("consulta movimientos y resultados de PH confirmados del componente", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      expect(input).toBe("/api/components/60/history");
      return Response.json({
        componentId: "60",
        available: true,
        message: "Historia registrada",
        activities: [],
        movements: [
          {
            id: "1",
            serviceId: "31",
            action: "INSTALAR",
            origin: "EXTERNO",
            destination: "VEHICULO",
            occurredAt: "2026-10-02T01:30:00Z",
          },
        ],
        revisions: [
          {
            id: "2",
            serviceId: "31",
            crpcId: "4",
            testDate: "2026-10-01",
            expiresOn: "2031-10-01",
            result: "APROBADO",
            certificateNumber: "CERT-90",
          },
        ],
      });
    }),
  );
  render(
    <TechnicalHistory
      id="60"
      kind="component"
      onSessionLost={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  const history = screen.getByRole("region", { name: "Historia técnica" });
  expect(await within(history).findByText("Instalación")).toBeInTheDocument();
  expect(within(history).getByText("CERT-90")).toBeInTheDocument();
  expect(within(history).getByText("Aprobado")).toBeInTheDocument();
  expect(within(history).getByText("2031-10-01")).toBeInTheDocument();
  expect(within(history).getByText("01/10/2026, 22:30")).toBeInTheDocument();
  expect(
    within(history).queryByRole("button", { name: /Instalar|Retirar/ }),
  ).not.toBeInTheDocument();
});

test("muestra inspecciones sin movimientos físicos vinculadas al servicio confirmado", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        componentId: "60",
        available: true,
        message: "Historia registrada",
        movements: [],
        revisions: [],
        activities: [
          {
            id: "7",
            serviceId: "32",
            action: "INSPECCIONAR",
            description: "Inspección visual del cilindro",
            occurredAt: "2026-10-02T01:30:00Z",
            recordedBy: "11",
          },
        ],
      }),
    ),
  );
  render(
    <TechnicalHistory
      id="60"
      kind="component"
      onSessionLost={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(
    await screen.findByText("Inspección visual del cilindro"),
  ).toBeInTheDocument();
  const activity = screen.getByRole("row", {
    name: /32 Inspección Inspección visual del cilindro/,
  });
  expect(activity).toHaveTextContent("01/10/2026, 22:30");
  expect(activity).toHaveTextContent("11");
  expect(screen.getByText("Sin movimientos registrados.")).toBeInTheDocument();
});

test("distingue la configuración vigente de las históricas y sus posiciones explícitas", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      expect(input).toBe("/api/vehicles/8/configurations");
      return Response.json({
        vehicleId: "8",
        available: true,
        message: "Configuraciones registradas",
        currentConfigurationId: "20",
        configurations: [
          {
            id: "20",
            serviceId: "31",
            validFrom: "2026-10-02T15:00:00Z",
            validUntil: null,
            components: [{ componentId: "60", type: "CILINDRO", position: 2 }],
          },
          {
            id: "19",
            serviceId: "30",
            validFrom: "2025-10-02T15:00:00Z",
            validUntil: "2026-10-02T15:00:00Z",
            components: [{ componentId: "59", type: "CILINDRO", position: 1 }],
          },
        ],
      });
    }),
  );
  render(
    <TechnicalHistory
      id="8"
      kind="vehicle"
      onSessionLost={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  const current = await screen.findByRole("region", {
    name: "Configuración 20 vigente",
  });
  expect(current).toHaveTextContent("Componente 60");
  expect(current).toHaveTextContent("Posición 2");
  const historic = screen.getByRole("region", {
    name: "Configuración 19 histórica",
  });
  expect(historic).toHaveTextContent("Componente 59");
  expect(historic).toHaveTextContent("02/10/2026, 12:00");
});
