import type { AuditPage } from "@cilgas/contracts";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";

type AuditAction =
  | "USUARIO_INICIAL_CREADO"
  | "SESION_INICIADA"
  | "SESION_CERRADA"
  | "ACCESO_RECHAZADO"
  | "ACCESO_DENEGADO"
  | "USUARIO_CREADO"
  | "USUARIO_ACTUALIZADO"
  | "SESIONES_REVOCADAS"
  | "TALLER_ACTUALIZADO"
  | "ACTOR_REGULATORIO_CREADO"
  | "ACTOR_REGULATORIO_ACTUALIZADO"
  | "MODELO_COMPONENTE_CREADO"
  | "MODELO_COMPONENTE_ACTUALIZADO"
  | "COMPONENTE_CREADO"
  | "COMPONENTE_ACTUALIZADO"
  | "PROVEEDOR_CREADO"
  | "PROVEEDOR_ACTUALIZADO"
  | "OFERTA_CREADA"
  | "OFERTA_ACTUALIZADA"
  | "BORRADOR_SERVICIO_CREADO"
  | "BORRADOR_SERVICIO_ACTUALIZADO"
  | "PERSONA_CREADA"
  | "PERSONA_ACTUALIZADA"
  | "VEHICULO_CREADO"
  | "VEHICULO_ACTUALIZADO"
  | "VINCULO_VEHICULO_CREADO"
  | "VINCULO_VEHICULO_CERRADO";

interface AuditRecord {
  actorId?: string;
  action: AuditAction;
  entity:
    | "usuarios"
    | "configuracion_taller"
    | "actores_regulatorios"
    | "modelos_componentes"
    | "componentes"
    | "proveedores"
    | "catalogo_servicios"
    | "servicios"
    | "personas"
    | "vehiculos"
    | "vehiculo_personas";
  entityId?: string;
  result: "EXITO" | "RECHAZADO";
  detail?: string;
}

export class AuditService {
  constructor(private readonly db: PrismaClient) {}

  // Reuses the caller's transaction so the event and its operation commit together.
  async record(
    event: AuditRecord,
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    await (transaction ?? this.db).audit.create({
      data: {
        actorId:
          event.actorId === undefined ? undefined : BigInt(event.actorId),
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        result: event.result,
        detail: event.detail,
      },
    });
  }

  async list(limit: number, cursor?: bigint): Promise<AuditPage> {
    const rows = await this.db.audit.findMany({
      where: cursor ? { id: { lt: cursor } } : undefined,
      orderBy: { id: "desc" },
      take: limit + 1,
    });
    const items = rows.slice(0, limit).map((row) => ({
      id: String(row.id),
      actorId: row.actorId === null ? null : String(row.actorId),
      occurredAt: row.occurredAt.toISOString(),
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      result: row.result as "EXITO" | "RECHAZADO",
      detail: row.detail,
    }));
    return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
  }
}
