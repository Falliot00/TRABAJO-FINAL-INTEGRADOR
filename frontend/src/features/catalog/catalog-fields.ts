import type {
  CatalogItemInput,
  CatalogItemType,
  ServiceType,
} from "@cilgas/contracts";

export const serviceTypes: Record<ServiceType, string> = {
  REVISION_ANUAL: "Revisión anual",
  REVISION_QUINQUENAL: "Revisión quinquenal",
  CONVERSION: "Conversión",
  MODIFICACION: "Modificación",
  DESMONTAJE: "Desmontaje",
  OTRO: "Otro",
};
export const itemTypes: Record<CatalogItemType, string> = {
  COMPONENTE: "Componente",
  INSPECCION: "Inspección",
  ENSAYO_PH: "Ensayo PH",
  OBLEA: "Oblea",
  MANO_OBRA: "Mano de obra",
  ACCESORIO: "Accesorio",
  OTRO: "Otro",
};
export interface DraftItem extends CatalogItemInput {
  key: string;
}
export function newItem(
  description = "",
  type: CatalogItemType = "OTRO",
): DraftItem {
  return {
    key: crypto.randomUUID(),
    order: 1,
    description,
    type,
    quantity: "1",
    unitPrice: "0",
    unitCost: "0",
    supplierId: null,
  };
}
export function usualComposition(type: ServiceType): DraftItem[] {
  const annual = [
    newItem("Revisión anual", "INSPECCION"),
    newItem("Oblea nueva", "OBLEA"),
  ];
  return type === "REVISION_QUINQUENAL"
    ? [
        ...annual,
        newItem("Ensayo PH por cilindro", "ENSAYO_PH"),
        newItem("Reemplazo de válvula por cilindro", "COMPONENTE"),
      ]
    : type === "REVISION_ANUAL"
      ? annual
      : [];
}
export function decimal(value: string) {
  return value.trim().replace(",", ".");
}
