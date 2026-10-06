import type { INestApplication } from "@nestjs/common";
import type { ServiceDraft } from "@cilgas/contracts";
import { prepareConfirmation } from "./service-confirmation-fixture";

export async function prepareComplete(app: INestApplication, number: number) {
  const fixture = await prepareConfirmation(app, number);
  const { admin, component: cylinder, draft } = fixture;
  const complete = (
    await admin.agent
      .patch(`/api/service-drafts/${draft.id}`)
      .set(admin.headers)
      .send({
        version: draft.version,
        interventions: draft.interventions.map((item) =>
          item.type === "CILINDRO"
            ? { ...item, testDate: "2026-10", certificateNumber: null }
            : item,
        ),
      })
      .expect(200)
  ).body as ServiceDraft;
  return { ...fixture, draft: complete, cylinder };
}
