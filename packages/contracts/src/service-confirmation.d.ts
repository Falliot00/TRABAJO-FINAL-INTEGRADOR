import type { ServiceDraft } from "./service-drafts";

export interface ConfirmationBlocker {
  code: string;
  message: string;
}
export interface ServiceConfirmationCheck {
  serviceId: string;
  version: number;
  currentConfigurationId: string | null;
  canConfirm: boolean;
  blockers: ConfirmationBlocker[];
}
export interface ConfirmServiceRequest {
  version: number;
  idempotencyKey: string;
  expectedConfigurationId: string | null;
}
export interface ConfirmedService extends Omit<ServiceDraft, "status"> {
  status: "CONFIRMADO";
  confirmedBy: string;
  confirmedAt: string;
  configurationId: string | null;
  sheetId: string;
  pdfStatus: "PENDIENTE";
}
export type SnapshotValue =
  | string
  | number
  | boolean
  | null
  | SnapshotValue[]
  | { [key: string]: SnapshotValue };
export interface ServiceSheet {
  id: string;
  serviceId: string;
  version: number;
  templateVersion: string;
  snapshotVersion: number;
  pdfStatus: "PENDIENTE";
  issuedAt: string;
  content: { [key: string]: SnapshotValue };
}
export interface SupplierObligation {
  id: string;
  serviceId: string;
  costId: string;
  supplierId: string;
  concept: string;
  amount: string;
  bornAt: string;
}
