import { fireEvent, render, screen, within } from "@testing-library/react";
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
  serviceDate: "2026-09-14",
  description: "Revisión con PH",
  type: "REVISION_QUINQUENAL",
  sheetOperation: "R",
  includesPh: true,
  totalAmount: "55000.00",
  notes: null,
  createdBy: "1",
  createdByName: "Luz",
  createdAt: "2026-09-14T12:00:00Z",
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
      unitPrice: "55000.00",
      discount: "0.00",
      amount: "55000.00",
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

test.each(["D", "B"] as const)(
  "guarda la operación %s con la fecha del trabajo y sin oblea nueva ni vencimiento",
  async (sheetOperation) => {
    const stored = {
      ...draft,
      type: "DESMONTAJE",
      sheetOperation,
      includesPh: false,
      phReason: null,
    };
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
          const body = JSON.parse(String(init.body));
          expect(body).toMatchObject({
            sheetOperation,
            includesPh: false,
            preparation: {
              enabledOn: "2026-09-14",
              newSticker: null,
              expiresOn: null,
            },
          });
          return Response.json({ ...stored, ...body, version: 2 });
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
    expect(
      await screen.findByLabelText("Fecha de habilitación preparada"),
    ).toHaveValue("2026-09-14");
    expect(screen.getByLabelText("Vencimiento de oblea preparado")).toHaveValue(
      "",
    );
    expect(
      screen.getByText(/Desmontaje y baja pueden prepararse sin oblea nueva/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Borrador guardado",
    );
  },
);

test("guarda una PH rechazada con su fecha real sin vencimiento habilitante ni certificado inventado", async () => {
  let stored: ServiceDraft = {
    ...draft,
    interventions: [
      {
        type: "CILINDRO",
        row: 1,
        performsPh: true,
        phResult: "APROBADO",
        testDate: "2026-09",
        revisionExpiresOn: "2031-09-30",
        certificateNumber: null,
      },
    ],
  };
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
        const body = JSON.parse(String(init.body));
        expect(body.interventions).toEqual([
          expect.objectContaining({
            testDate: "2026-09",
            phResult: "RECHAZADO",
            revisionExpiresOn: null,
            certificateNumber: null,
          }),
        ]);
        stored = { ...stored, ...body, version: 2 };
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
  await user.selectOptions(
    await screen.findByLabelText("Resultado PH preparado"),
    "RECHAZADO",
  );
  expect(
    screen.getByLabelText("Vencimiento de revisión preparado"),
  ).toHaveValue("");
  expect(
    screen.getByText(
      "Una PH rechazada no genera un nuevo vencimiento de revisión.",
    ),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Borrador guardado",
  );
  await user.click(screen.getByRole("button", { name: "Editar borrador 31" }));
  expect(
    await screen.findByLabelText("Fecha del ensayo preparada"),
  ).toHaveValue("2026-09");
  expect(screen.getByLabelText("Resultado PH preparado")).toHaveValue(
    "RECHAZADO",
  );
  expect(
    screen.getByLabelText("Vencimiento de revisión preparado"),
  ).toHaveValue("");
});

test("conserva cuatro recambios y permite elegir explícitamente el cilindro de la válvula saliente", async () => {
  let stored = {
    ...draft,
    interventions: Array.from({ length: 8 }, (_, index) => ({
      type: "VALVULA" as const,
      row: index + 1,
      componentId: String(index + 100),
      cylinderId: index === 7 ? null : String(60 + Math.floor(index / 2)),
      serialNumber: `VAL-${index + 1}`,
      action: index % 2 === 0 ? ("M" as const) : ("D" as const),
      performsPh: false,
      phResult: null,
    })),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/auth/csrf")
        return Response.json({ csrfToken: "csrf" });
      if (url.pathname === "/api/components") {
        expect(url.searchParams.get("type")).toBe("CILINDRO");
        return Response.json({
          items: [
            {
              id: "63",
              type: "CILINDRO",
              serialNumber: "CIL-4",
              model: { homologationCode: "HC", active: true },
            },
          ],
          nextCursor: null,
        });
      }
      if (url.pathname.startsWith("/api/components/"))
        return Response.json({
          id: url.pathname.split("/").at(-1),
          serialNumber: "Referencia",
          model: { homologationCode: "H", active: true },
        });
      if (
        url.pathname === "/api/service-drafts/31" &&
        init?.method === "PATCH"
      ) {
        const body = JSON.parse(String(init.body));
        expect(body.interventions).toHaveLength(8);
        expect(body.interventions[7]).toMatchObject({
          row: 8,
          componentId: "107",
          cylinderId: "63",
          serialNumber: "VAL-8",
          action: "D",
        });
        expect(body.interventions[6]).toMatchObject({
          row: 7,
          componentId: "106",
          cylinderId: "63",
          action: "M",
        });
        stored = { ...stored, ...body, version: 2 };
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
  const outgoing = await screen.findByRole("group", { name: "Intervención 8" });
  const cylinder = within(outgoing).getByRole("group", {
    name: "Cilindro de la válvula",
  });
  await user.click(
    within(cylinder).getByRole("button", { name: "Buscar componentes" }),
  );
  await user.click(
    await within(cylinder).findByRole("button", { name: "Seleccionar CIL-4" }),
  );
  await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Borrador guardado",
  );
  await user.click(screen.getByRole("button", { name: "Editar borrador 31" }));
  expect(
    await screen.findByRole("group", { name: "Intervención 8" }),
  ).toHaveTextContent("Cilindro de la válvula");
  expect(screen.getAllByLabelText("Número de serie documental")).toHaveLength(
    8,
  );
});

test.each(["2026-09", "2026-09-03"])(
  "guarda PH por vencimiento con precisión %s y calcula las vigencias al cierre del mes",
  async (testDate) => {
    let stored = {
      ...draft,
      interventions: [
        { type: "CILINDRO" as const, row: 1, performsPh: true, phResult: null },
      ],
    };
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
          const body = JSON.parse(String(init.body));
          expect(body).toMatchObject({
            sheetOperation: "R",
            includesPh: true,
            phReason: "VENCIMIENTO",
            serviceDate: "2026-09-16",
            preparation: {
              enabledOn: "2026-09-16",
              expiresOn: "2027-09-30",
              previousStickerExpiresOn: "2027-02",
              newSticker: "NUEVA-456",
            },
            interventions: [
              expect.objectContaining({
                testDate,
                revisionExpiresOn: "2031-09-30",
                phResult: null,
              }),
            ],
          });
          stored = { ...stored, ...body, version: 2 };
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
    await user.selectOptions(
      await screen.findByLabelText("Motivo de PH"),
      "VENCIMIENTO",
    );
    await user.type(
      screen.getByLabelText("Oblea nueva preparada"),
      "NUEVA-456",
    );
    fireEvent.change(screen.getByLabelText("Fecha del servicio"), {
      target: { value: "2026-09-16" },
    });
    fireEvent.change(screen.getByLabelText("Vencimiento de oblea anterior"), {
      target: { value: "2027-02" },
    });
    if (testDate.length === 10) {
      await user.selectOptions(
        screen.getByLabelText("Precisión de fecha del ensayo"),
        "date",
      );
      expect(screen.getByLabelText("Fecha del ensayo preparada")).toHaveValue(
        "",
      );
    }
    fireEvent.change(screen.getByLabelText("Fecha del ensayo preparada"), {
      target: { value: testDate },
    });
    expect(
      screen.getByLabelText("Fecha de habilitación preparada"),
    ).toHaveValue("2026-09-16");
    expect(screen.getByLabelText("Vencimiento de oblea preparado")).toHaveValue(
      "2027-09-30",
    );
    expect(
      screen.getByLabelText("Vencimiento de revisión preparado"),
    ).toHaveValue("2031-09-30");
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Borrador guardado",
    );
    await user.click(
      screen.getByRole("button", { name: "Editar borrador 31" }),
    );
    expect(
      await screen.findByLabelText("Fecha del ensayo preparada"),
    ).toHaveValue(testDate);
  },
);
