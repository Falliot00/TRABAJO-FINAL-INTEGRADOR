import type { CatalogItemType, ServiceType, ComponentType } from "./index";

export type ServicePersonRole = "TITULAR" | "CONTACTO" | "PAGADOR";
export type ServiceItemAction =
  "INSTALAR" | "RETIRAR" | "INSPECCIONAR" | "ENSAYAR" | "MANTENER";
export interface ServiceDraftPersonInput {
  role: ServicePersonRole;
  personId: string;
}
export interface ServiceDraftPerson extends ServiceDraftPersonInput {
  person: {
    id: string;
    name: string;
    documentType: string;
    documentNumber: string;
  };
}
export interface ServiceDraftCostInput {
  supplierId?: string | null;
  concept: string;
  treatment: "PROVEEDOR" | "ABSORBIDO";
  amount: string;
}
export interface ServiceDraftItemInput {
  id?: string;
  order: number;
  description: string;
  type: CatalogItemType;
  componentId?: string | null;
  action?: ServiceItemAction | null;
  quantity: string;
  unitPrice: string;
  discount: string;
  /** Sólo finanzas.consultar; su omisión preserva los costos históricos. */
  costs?: ServiceDraftCostInput[];
}
export interface ServiceDraftItem extends ServiceDraftItemInput {
  id: string;
  catalogItemId: string | null;
  componentId: string | null;
  action: ServiceItemAction | null;
  amount: string;
}
export interface ServicePreparationInput {
  pecId?: string | null;
  tdmId?: string | null;
  previousSticker?: string | null;
  /** Vencimiento del antecedente; YYYY-MM o YYYY-MM-DD, hasta fin de mes. */
  previousStickerExpiresOn?: string | null;
  newSticker?: string | null;
  enabledOn?: string | null;
  expiresOn?: string | null;
  notes?: string | null;
}
export interface ServiceInterventionInput {
  type: ComponentType | "ACCESORIO";
  row: number;
  componentId?: string | null;
  /** Identidad del cilindro asociado a esta válvula; nunca se infiere del renglón. */
  cylinderId?: string | null;
  homologationCode?: string | null;
  serialNumber?: string | null;
  condition?: string | null;
  action?: "M" | "S" | "D" | "B" | null;
  finalPosition?: number | null;
  manufactureMonth?: string | null;
  revisionMonth?: string | null;
  crpcId?: string | null;
  performsPh: boolean;
  /** Fecha conocida del ensayo: YYYY-MM o YYYY-MM-DD. */
  testDate?: string | null;
  revisionExpiresOn?: string | null;
  phResult?: "APROBADO" | "RECHAZADO" | null;
  certificateNumber?: string | null;
  description?: string | null;
}
export interface CreateServiceDraftRequest {
  vehicleId: string;
  catalogOfferId: string;
  serviceDate: string;
}
export interface UpdateServiceDraftRequest {
  version: number;
  vehicleId?: string;
  serviceDate?: string;
  description?: string;
  type?: ServiceType;
  sheetOperation?: "C" | "M" | "R" | "D" | "B" | null;
  includesPh?: boolean;
  phReason?:
    "VENCIMIENTO" | "MODIFICACION" | "CONVERSION" | "SERVICIO_PH" | null;
  totalAmount?: string;
  notes?: string | null;
  people?: ServiceDraftPersonInput[];
  items?: ServiceDraftItemInput[];
  preparation?: ServicePreparationInput | null;
  interventions?: ServiceInterventionInput[];
}
export interface ServiceDraft {
  id: string;
  version: number;
  status: "BORRADOR";
  vehicleId: string;
  vehicle: { id: string; plate: string; brand: string; model: string };
  catalogOfferId: string;
  serviceDate: string;
  description: string;
  type: ServiceType;
  sheetOperation: "C" | "M" | "R" | "D" | "B" | null;
  includesPh: boolean;
  phReason?:
    "VENCIMIENTO" | "MODIFICACION" | "CONVERSION" | "SERVICIO_PH" | null;
  totalAmount: string;
  notes: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  people: ServiceDraftPerson[];
  items: ServiceDraftItem[];
  preparation: ServicePreparationInput | null;
  interventions: ServiceInterventionInput[];
}
