import type { ComponentModel, ComponentType } from "./index";

export interface ComponentInput {
  modelId: string;
  type: ComponentType;
  serialNumber: string;
  manufactureMonth?: string | null;
  notes?: string | null;
}

export interface Component extends Required<ComponentInput> {
  id: string;
  model: ComponentModel;
}

/** La historia técnica requiere la confirmación de servicios de M06. */
export interface ComponentHistory {
  componentId: string;
  available: false;
  message: string;
}

export interface VehicleConfigurations {
  vehicleId: string;
  available: false;
  message: string;
}
