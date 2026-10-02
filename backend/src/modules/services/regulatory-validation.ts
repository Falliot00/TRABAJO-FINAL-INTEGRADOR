import type { ConfirmationBlocker, ServiceDraft } from "@cilgas/contracts";

/** Boundary for evidence approved by the workshop and technical authority.
 * The production adapter remains closed until that evidence is available. */
export interface RegulatoryValidation {
  assess(draft: ServiceDraft): Promise<{
    blockers: ConfirmationBlocker[];
    evidence: { source: string; version: string };
    document?: {
      operationDescription: string;
      signers: {
        rol: string;
        nombre: string | null;
        matricula: string | null;
        requiereEspacioFirma: boolean;
      }[];
    };
  }>;
}
export class PendingRegulatoryValidation implements RegulatoryValidation {
  async assess(draft: ServiceDraft) {
    const blockers: ConfirmationBlocker[] = [
      {
        code: "RF-07",
        message:
          "Pendiente validar datos obligatorios y firmas para la operación con el propietario y responsable técnico.",
      },
      {
        code: "RF-08",
        message:
          "Pendiente validar datos legales y responsables vigentes de TdM, PEC y CRPC aplicables.",
      },
    ];
    if (draft.interventions.some((row) => row.action))
      blockers.push({
        code: "RF-01",
        message:
          "Pendiente validar la leyenda y aplicación de las marcas MSDB.",
      });
    if (
      draft.items.some(
        (item) =>
          item.action === "RETIRAR" &&
          item.componentId &&
          draft.interventions.some(
            (row) =>
              row.type === "VALVULA" && row.componentId === item.componentId,
          ),
      )
    )
      blockers.push({
        code: "RF-02",
        message:
          "Pendiente validar la asociación y representación documental del recambio de válvulas.",
      });
    if (
      draft.includesPh ||
      draft.type === "REVISION_QUINQUENAL" ||
      draft.interventions.some((row) => row.performsPh)
    )
      blockers.push({
        code: "RF-03",
        message:
          "Pendiente validar la matriz servicio, operación documental y resultados para PH y revisión quinquenal.",
      });
    if (
      draft.preparation?.enabledOn ||
      draft.preparation?.expiresOn ||
      draft.interventions.some(
        (row) =>
          row.manufactureMonth ||
          row.revisionMonth ||
          row.testDate ||
          row.revisionExpiresOn,
      )
    )
      blockers.push({
        code: "RF-04",
        message:
          "Pendiente validar significado, precisión y vencimientos de las fechas aplicables.",
      });
    if (draft.includesPh || draft.interventions.some((row) => row.performsPh))
      blockers.push({
        code: "RF-05",
        message:
          "Pendiente contrastar datos del resultado y certificado de PH con el CRPC.",
      });
    return {
      blockers,
      evidence: { source: "PENDIENTE", version: "sin-validar" },
    };
  }
}
