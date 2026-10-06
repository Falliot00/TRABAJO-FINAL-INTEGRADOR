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

export interface ComponentHistory {
  componentId: string;
  available: boolean;
  message: string;
  cylinderValveLinks?: {
    configurationId: string;
    serviceId: string | null;
    cylinderId: string;
    valveId: string;
    validFrom: string;
    validUntil: string | null;
  }[];
  activities: {
    /** Identificador del ítem histórico del servicio. */
    id: string;
    serviceId: string;
    action: "INSPECCIONAR" | "ENSAYAR" | "MANTENER";
    description: string;
    occurredAt: string;
    recordedBy: string;
  }[];
  movements: {
    id: string;
    serviceId: string;
    action: string;
    origin: string;
    destination: string;
    occurredAt: string;
  }[];
  revisions: {
    id: string;
    serviceId: string;
    crpcId: string;
    testDate: string;
    expiresOn: string | null;
    result: "APROBADO" | "RECHAZADO";
    certificateNumber: string | null;
  }[];
}

export interface VehicleConfigurations {
  vehicleId: string;
  available: boolean;
  message: string;
  currentConfigurationId: string | null;
  configurations: {
    id: string;
    serviceId: string | null;
    validFrom: string;
    validUntil: string | null;
    components: {
      componentId: string;
      cylinderId?: string | null;
      type: ComponentType;
      position: number;
    }[];
  }[];
}
