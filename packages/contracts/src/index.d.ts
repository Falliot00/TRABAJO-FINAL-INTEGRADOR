/** Contratos de transporte: IDs bigint y fechas se conservan como texto. */
export type RoleCode = "ADMINISTRADOR" | "OPERADOR";

export type PermissionCode =
  | "configuracion.administrar"
  | "personas.gestionar"
  | "catalogo.consultar"
  | "catalogo.administrar"
  | "servicios.gestionar"
  | "fichas.consultar"
  | "fichas.rectificar"
  | "cobros.registrar"
  | "movimientos.consultar_propios"
  | "cobros.anular"
  | "finanzas.consultar"
  | "egresos.gestionar"
  | "convenios.administrar"
  | "cupones.gestionar"
  | "liquidaciones.gestionar"
  | "alertas.consultar"
  | "alertas.configurar"
  | "usuarios.administrar"
  | "auditoria.consultar";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
  permissions: PermissionCode[];
}

export interface UserSummary extends SessionUser {
  active: boolean;
  createdAt: string;
}

export interface SessionResponse {
  user: SessionUser;
}
export interface CsrfResponse {
  csrfToken: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: RoleCode;
}
export interface UpdateUserRequest {
  name?: string;
  role?: RoleCode;
  active?: boolean;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  occurredAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  result: "EXITO" | "RECHAZADO";
  detail: string | null;
}

export interface AuditPage {
  items: AuditEvent[];
  nextCursor: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type RegulatoryActorType = "PEC" | "TDM" | "CRPC";
export interface RegulatoryActorInput {
  type: RegulatoryActorType;
  code: string;
  name: string;
  cuit?: string | null;
  address?: string | null;
  locality?: string | null;
  phone?: string | null;
  technicalResponsible?: string | null;
  responsibleLicense?: string | null;
  active?: boolean;
}
export interface RegulatoryActor extends Required<RegulatoryActorInput> {
  id: string;
}
export type ComponentType = "CILINDRO" | "VALVULA" | "REGULADOR";
export interface ComponentModelInput {
  type: ComponentType;
  homologationCode: string;
  brand?: string | null;
  model?: string | null;
  capacityLiters?: string | null;
  active?: boolean;
}
export interface ComponentModel extends Required<ComponentModelInput> {
  id: string;
}
export interface WorkshopInput {
  name: string;
  cuit?: string | null;
  address?: string | null;
  locality?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  tdmId?: string | null;
}
export interface Workshop extends Required<WorkshopInput> {
  id: string;
}

export type PersonType = "FISICA" | "JURIDICA";
export type DocumentType = "DNI" | "CUIT" | "CUIL" | "PASAPORTE" | "OTRO";
export interface PersonInput {
  type: PersonType;
  name: string;
  documentType: DocumentType;
  documentNumber: string;
  street?: string | null;
  streetNumber?: string | null;
  floorApartment?: string | null;
  locality?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  active?: boolean;
}
export interface Person extends Required<PersonInput> {
  id: string;
  createdAt: string;
}
export type VehicleType =
  "TAXI" | "PICKUP" | "PARTICULAR" | "BUS" | "OFICIAL" | "OTROS";
export interface VehicleInput {
  plate: string;
  brand: string;
  model: string;
  year: number;
  engineNumber?: string | null;
  chassisNumber?: string | null;
  type?: VehicleType | null;
  otherTypeDetail?: string | null;
  usage?: string | null;
  injection?: boolean | null;
  active?: boolean;
}
export interface Vehicle extends Required<VehicleInput> {
  id: string;
}
export type VehiclePersonRole = "TITULAR" | "CONTACTO";
export interface VehicleRelationshipInput {
  personId: string;
  role: VehiclePersonRole;
  from: string;
}
export interface VehicleRelationship extends VehicleRelationshipInput {
  id: string;
  vehicleId: string;
  until: string | null;
  person: Person;
}
export interface VehicleDetail extends Vehicle {
  relationships: VehicleRelationship[];
}
