import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  Component,
  ComponentHistory,
  SessionUser,
  VehicleConfigurations,
} from "@cilgas/contracts";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
  identifierText,
  masterDataError,
  pageOf,
  type ListQuery,
} from "../../common/master-data";
import { parseId } from "../identity/dto";
import { AuditService } from "../audit/audit.service";
import { ComponentServiceEffects } from "./service-effects";
import type {
  ComponentDto,
  ComponentDuplicatesQueryDto,
  UpdateComponentDto,
} from "./dto";

type ComponentRow = Prisma.ComponentGetPayload<{ include: { model: true } }>;

function componentResponse(row: ComponentRow): Component {
  return {
    id: String(row.id),
    modelId: String(row.modelId),
    type: row.type as Component["type"],
    serialNumber: row.serialNumber,
    manufactureMonth: row.manufactureMonth?.toISOString().slice(0, 7) ?? null,
    notes: row.notes,
    model: {
      id: String(row.model.id),
      type: row.model.type as Component["type"],
      homologationCode: row.model.homologationCode,
      brand: row.model.brand,
      model: row.model.model,
      capacityLiters: row.model.capacityLiters?.toFixed(2) ?? null,
      active: row.model.active,
    },
  };
}

export class ComponentsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListQuery) {
    if (
      query.active !== undefined ||
      (query.type && !["CILINDRO", "VALVULA", "REGULADOR"].includes(query.type))
    ) {
      throw new BadRequestException("Filtros de componentes no válidos.");
    }
    const rows = await this.db.component.findMany({
      where: {
        id: query.cursor ? { gt: query.cursor } : undefined,
        type: query.type,
        OR: [
          {
            serialNumber: {
              contains: identifierText({ value: query.q }) as string,
              mode: "insensitive",
            },
          },
          {
            model: {
              homologationCode: { contains: query.q, mode: "insensitive" },
            },
          },
          { model: { brand: { contains: query.q, mode: "insensitive" } } },
          { model: { model: { contains: query.q, mode: "insensitive" } } },
        ],
      },
      include: { model: true },
      orderBy: { id: "asc" },
      take: query.limit + 1,
    });
    return pageOf(rows.map(componentResponse), query.limit);
  }

  async duplicates(query: ComponentDuplicatesQueryDto) {
    const rows = await this.db.component.findMany({
      where: {
        modelId: parseId(query.modelId),
        serialNumber: query.serialNumber,
        id: query.excludeId ? { not: parseId(query.excludeId) } : undefined,
      },
      include: { model: true },
    });
    return { items: rows.map(componentResponse), nextCursor: null };
  }

  async get(id: bigint): Promise<Component> {
    const row = await this.db.component.findUnique({
      where: { id },
      include: { model: true },
    });
    if (!row) throw new NotFoundException("Componente no encontrado.");
    return componentResponse(row);
  }

  async history(id: bigint): Promise<ComponentHistory> {
    await this.get(id);
    const activities = await this.db.$queryRaw<
      (Omit<ComponentHistory["activities"][number], "occurredAt"> & {
        occurredAt: Date;
      })[]
    >`SELECT i.id::text, i.servicio_id::text AS "serviceId", i.accion AS action, i.descripcion AS description, s.confirmado_en AS "occurredAt", s.confirmado_por::text AS "recordedBy" FROM servicio_items i JOIN servicios s ON s.id = i.servicio_id WHERE i.componente_id = ${id} AND i.accion IN ('INSPECCIONAR', 'ENSAYAR', 'MANTENER') AND s.estado = 'CONFIRMADO' ORDER BY s.confirmado_en, i.id`;
    const movements = await this.db.$queryRaw<
      (Omit<ComponentHistory["movements"][number], "occurredAt"> & {
        occurredAt: Date;
      })[]
    >`SELECT id::text, servicio_id::text AS "serviceId", accion AS action, origen AS origin, destino AS destination, ocurrido_en AS "occurredAt" FROM movimientos_componentes WHERE componente_id = ${id} ORDER BY ocurrido_en, id`;
    const revisions = await this.db.$queryRaw<
      (Omit<ComponentHistory["revisions"][number], "testDate" | "expiresOn"> & {
        testDate: string;
        expiresOn: Date | null;
      })[]
    >`SELECT r.id::text, r.servicio_id::text AS "serviceId", r.crpc_id::text AS "crpcId", r.fecha_ensayo AS "testDate", r.vence_el AS "expiresOn", r.resultado AS result, r.numero_certificado AS "certificateNumber" FROM revisiones_cilindros r JOIN servicios s ON s.id = r.servicio_id WHERE r.componente_id = ${id} ORDER BY left(r.fecha_ensayo, 7), s.fecha_servicio, s.confirmado_en, r.id`;
    const links = await this.db.$queryRaw<
      (NonNullable<ComponentHistory["cylinderValveLinks"]>[number] & {
        validFrom: Date;
        validUntil: Date | null;
      })[]
    >`SELECT c.id::text AS "configurationId", c.servicio_origen_id::text AS "serviceId", cc.cilindro_id::text AS "cylinderId", cc.componente_id::text AS "valveId", c.vigente_desde AS "validFrom", c.vigente_hasta AS "validUntil" FROM configuracion_componentes cc JOIN configuraciones c ON c.id = cc.configuracion_id WHERE cc.cilindro_id IS NOT NULL AND (cc.componente_id = ${id} OR cc.cilindro_id = ${id}) ORDER BY c.vigente_desde, c.id`;
    return {
      componentId: String(id),
      cylinderValveLinks: links.map((link) => ({
        ...link,
        validFrom: link.validFrom.toISOString(),
        validUntil: link.validUntil?.toISOString() ?? null,
      })),
      available: true,
      activities: activities.map((row) => ({
        ...row,
        occurredAt: row.occurredAt.toISOString(),
      })),
      movements: movements.map((row) => ({
        ...row,
        occurredAt: row.occurredAt.toISOString(),
      })),
      revisions: revisions.map((row) => ({
        ...row,
        testDate: row.testDate,
        expiresOn: row.expiresOn?.toISOString().slice(0, 10) ?? null,
      })),
      message: "Historia técnica de servicios confirmados.",
    };
  }

  async configurations(vehicleId: bigint): Promise<VehicleConfigurations> {
    const vehicle = await this.db.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException("Vehículo no encontrado.");
    return new ComponentServiceEffects().configurations(this.db, vehicleId);
  }

  async create(input: ComponentDto, actor: SessionUser): Promise<Component> {
    return this.db
      .$transaction(async (tx) => {
        const modelId = parseId(input.modelId);
        await tx.$queryRaw`SELECT id FROM modelos_componentes WHERE id = ${modelId} FOR SHARE`;
        const model = await tx.componentModel.findFirst({
          where: { id: modelId, type: input.type, active: true },
        });
        if (!model)
          throw new BadRequestException(
            "Seleccione un modelo activo del tipo indicado.",
          );
        const row = await tx.component.create({
          data: {
            ...input,
            modelId,
            manufactureMonth: input.manufactureMonth
              ? new Date(`${input.manufactureMonth}-01T00:00:00.000Z`)
              : null,
          },
          include: { model: true },
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "COMPONENTE_CREADO",
            entity: "componentes",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return componentResponse(row);
      })
      .catch(masterDataError);
  }

  async update(
    id: bigint,
    input: UpdateComponentDto,
    actor: SessionUser,
  ): Promise<Component> {
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM componentes WHERE id = ${id} FOR UPDATE`;
        const previous = await tx.component.findUnique({ where: { id } });
        if (!previous) throw new NotFoundException("Componente no encontrado.");
        const modelId =
          input.modelId === undefined
            ? previous.modelId
            : parseId(input.modelId);
        const type = input.type ?? previous.type;
        if (modelId !== previous.modelId || type !== previous.type) {
          await tx.$queryRaw`SELECT id FROM modelos_componentes WHERE id = ${modelId} FOR SHARE`;
          const model = await tx.componentModel.findFirst({
            where: { id: modelId, type, active: true },
          });
          if (!model)
            throw new BadRequestException(
              "Seleccione un modelo activo del tipo indicado.",
            );
        }
        const row = await tx.component.update({
          where: { id },
          data: {
            ...input,
            modelId,
            manufactureMonth:
              input.manufactureMonth === undefined
                ? undefined
                : input.manufactureMonth === null
                  ? null
                  : new Date(`${input.manufactureMonth}-01T00:00:00.000Z`),
          },
          include: { model: true },
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "COMPONENTE_ACTUALIZADO",
            entity: "componentes",
            entityId: String(id),
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return componentResponse(row);
      })
      .catch(masterDataError);
  }
}
