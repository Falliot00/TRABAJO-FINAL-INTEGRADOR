/** Contratos de transporte: IDs bigint y fechas se conservan como texto. */
export type RoleCode = "ADMINISTRADOR" | "OPERADOR";

export type PermissionCode =
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
