import type { ConfirmationBlocker, ServiceDraft } from "@cilgas/contracts";

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

/** Reglas del circuito informado por CILGAS en Q1–Q11, no certificación externa. */
export class WorkshopRegulatoryValidation implements RegulatoryValidation {
  async assess(draft: ServiceDraft) {
    const descriptions = {
      C: "Conversión",
      M: "Modificación",
      R: "Revisión anual",
      D: "Desmontaje",
      B: "Baja técnica",
    };
    const blockers: ConfirmationBlocker[] = [];
    if (!draft.sheetOperation)
      blockers.push({
        code: "OPERACION_REQUERIDA",
        message: "Seleccione la operación documental del trabajo realizado.",
      });
    if (
      (draft.type === "CONVERSION" &&
        (draft.sheetOperation !== "C" || !draft.includesPh)) ||
      (draft.type === "REVISION_QUINQUENAL" &&
        (!draft.includesPh || draft.sheetOperation !== "R")) ||
      (draft.type === "REVISION_ANUAL" && draft.sheetOperation !== "R") ||
      (draft.type === "MODIFICACION" &&
        !["M", "R"].includes(draft.sheetOperation ?? "")) ||
      (draft.type === "DESMONTAJE" &&
        !["D", "B"].includes(draft.sheetOperation ?? ""))
    ) {
      blockers.push({
        code: "OPERACION_INCONSISTENTE",
        message:
          "La operación documental no corresponde al tipo de trabajo y la PH informados.",
      });
    }
    return {
      blockers,
      evidence: { source: "RELEVAMIENTO_FICHAS_Q1_Q11", version: "2026-10-05" },
      document: {
        operationDescription: draft.sheetOperation
          ? descriptions[draft.sheetOperation]
          : "",
        signers: [
          "TITULAR_TDM",
          "RESPONSABLE_TDM",
          "RESPONSABLE_PEC",
          "PROPIETARIO",
        ].map((rol) => ({
          rol,
          nombre: null,
          matricula: null,
          requiereEspacioFirma: true,
        })),
      },
    };
  }
}
