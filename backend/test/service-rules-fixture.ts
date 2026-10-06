import type { INestApplication } from "@nestjs/common";
import type { Component, ServiceDraft } from "@cilgas/contracts";
import { prepareConfirmation } from "./service-confirmation-fixture";

export async function prepareComplete(app: INestApplication, number: number) {
  const fixture = await prepareConfirmation(app, number);
  const { admin, component: cylinder, draft } = fixture;
  const components: Component[] = [];
  for (const type of ["REGULADOR", "VALVULA"] as const) {
    const model = (
      await admin.agent
        .post("/api/component-models")
        .set(admin.headers)
        .send({ type, homologationCode: `${type}-${number}` })
        .expect(201)
    ).body;
    components.push(
      (
        await admin.agent
          .post("/api/components")
          .set(admin.headers)
          .send({ type, modelId: model.id, serialNumber: `${type}-${number}` })
          .expect(201)
      ).body,
    );
  }
  const items = draft.items.map((item) =>
    Object.fromEntries(
      Object.entries(item).filter(
        ([key]) => !["amount", "catalogItemId"].includes(key),
      ),
    ),
  );
  const complete = (
    await admin.agent
      .patch(`/api/service-drafts/${draft.id}`)
      .set(admin.headers)
      .send({
        version: draft.version,
        phReason: "CONVERSION",
        items: [
          ...items,
          ...components.map((component, index) => ({
            order: index + 2,
            type: "COMPONENTE",
            description: "Montaje",
            componentId: component.id,
            action: "INSTALAR",
            quantity: "1",
            unitPrice: "0",
            discount: "0",
            costs: [],
          })),
        ],
        preparation: { ...draft.preparation, expiresOn: "2027-10-31" },
        interventions: [
          {
            ...draft.interventions[0],
            testDate: "2026-10",
            certificateNumber: null,
            revisionExpiresOn: "2031-10-31",
          },
          ...components.map((component) => ({
            type: component.type,
            cylinderId: component.type === "VALVULA" ? cylinder.id : null,
            row: 1,
            componentId: component.id,
            homologationCode: component.model.homologationCode,
            serialNumber: component.serialNumber,
            condition: "NUEVO",
            action: "M",
            finalPosition: 1,
            performsPh: false,
          })),
        ],
      })
      .expect(200)
  ).body as ServiceDraft;
  return {
    ...fixture,
    draft: complete,
    regulator: components[0]!,
    valve: components[1]!,
    cylinder,
  };
}
