export interface SupplierInput {
  name: string;
  cuit?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active?: boolean;
}
export interface Supplier extends Required<SupplierInput> {
  id: string;
}
export type ServiceType =
  | "REVISION_ANUAL"
  | "REVISION_QUINQUENAL"
  | "CONVERSION"
  | "MODIFICACION"
  | "DESMONTAJE"
  | "OTRO";
export type CatalogItemType =
  | "COMPONENTE"
  | "INSPECCION"
  | "ENSAYO_PH"
  | "OBLEA"
  | "MANO_OBRA"
  | "ACCESORIO"
  | "OTRO";
export interface CatalogItemInput {
  id?: string;
  order: number;
  description: string;
  type: CatalogItemType;
  quantity: string;
  unitPrice: string;
  supplierId?: string | null;
  unitCost: string;
}
export interface CatalogItem {
  id: string;
  order: number;
  description: string;
  type: CatalogItemType;
  quantity: string;
  unitPrice: string;
  /** Campos presentes únicamente con catalogo.administrar. */
  supplierId?: string | null;
  unitCost?: string;
}
export interface CatalogOfferInput {
  code: string;
  name: string;
  description: string;
  type: ServiceType;
  suggestedPrice: string;
  active?: boolean;
  items: CatalogItemInput[];
}
export interface CatalogOffer extends Omit<
  Required<CatalogOfferInput>,
  "items"
> {
  id: string;
  items: CatalogItem[];
}
