import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  ComponentModel,
  RegulatoryActor,
  SessionUser,
  Workshop,
} from "@cilgas/contracts";
import {
  Prisma,
  type PrismaClient,
  type ComponentModel as ModelRow,
  type RegulatoryActor as ActorRow,
  type Workshop as WorkshopRow,
} from "../../generated/prisma/client";
import { AuditService } from "../audit/audit.service";
import type {
  ComponentModelDto,
  UpdateComponentModelDto,
  RegulatoryActorDto,
  UpdateRegulatoryActorDto,
  UpdateWorkshopDto,
} from "./dto";
import { parseId } from "../identity/dto";
import {
  masterDataError,
  pageOf,
  validateTaxId,
  type ListQuery,
} from "../../common/master-data";

function workshopResponse(row: WorkshopRow): Workshop {
  return {
    id: String(row.id),
    name: row.name,
    cuit: row.cuit,
    address: row.address,
    locality: row.locality,
    province: row.province,
    phone: row.phone,
    email: row.email,
    tdmId: row.tdmId === null ? null : String(row.tdmId),
  };
}
function actorResponse(row: ActorRow): RegulatoryActor {
  return {
    id: String(row.id),
    type: row.type as RegulatoryActor["type"],
    code: row.code,
    name: row.name,
    cuit: row.cuit,
    address: row.address,
    locality: row.locality,
    phone: row.phone,
    technicalResponsible: row.technicalResponsible,
    responsibleLicense: row.responsibleLicense,
    active: row.active,
  };
}
function modelResponse(row: ModelRow): ComponentModel {
  return {
    id: String(row.id),
    type: row.type as ComponentModel["type"],
    homologationCode: row.homologationCode,
    brand: row.brand,
    model: row.model,
    capacityLiters: row.capacityLiters?.toFixed(2) ?? null,
    active: row.active,
  };
}
function validateCapacity(
  type: string,
  capacity: string | Prisma.Decimal | null | undefined,
) {
  if (
    capacity != null &&
    (type !== "CILINDRO" || new Prisma.Decimal(capacity).lte(0))
  )
    throw new BadRequestException(
      "La capacidad debe ser positiva y sólo corresponde a cilindros.",
    );
}

export class ReferencesService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  async workshop(): Promise<Workshop | null> {
    const row = await this.db.workshop.findUnique({ where: { id: 1n } });
    return row ? workshopResponse(row) : null;
  }

  async updateWorkshop(
    input: UpdateWorkshopDto,
    actor: SessionUser,
  ): Promise<Workshop> {
    validateTaxId(input.cuit);
    return this.db
      .$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7348292)`;
        const existing = await tx.workshop.findUnique({ where: { id: 1n } });
        const name = input.name ?? existing?.name;
        if (!name)
          throw new BadRequestException("Indique el nombre del taller.");
        const data = {
          ...input,
          name,
          tdmId:
            input.tdmId === undefined
              ? undefined
              : input.tdmId === null
                ? null
                : parseId(input.tdmId),
        };
        if (
          data.tdmId !== undefined &&
          data.tdmId !== null &&
          data.tdmId !== existing?.tdmId
        ) {
          await tx.$queryRaw`SELECT id FROM actores_regulatorios WHERE id = ${data.tdmId} FOR SHARE`;
          const tdm = await tx.regulatoryActor.findFirst({
            where: { id: data.tdmId, type: "TDM", active: true },
          });
          if (!tdm)
            throw new BadRequestException(
              "Seleccione un Taller de Montaje activo.",
            );
        }
        const row = await tx.workshop.upsert({
          where: { id: 1n },
          create: data,
          update: data,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "TALLER_ACTUALIZADO",
            entity: "configuracion_taller",
            entityId: "1",
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return workshopResponse(row);
      })
      .catch(masterDataError);
  }

  async actors(query: ListQuery) {
    if (query.type && !["PEC", "TDM", "CRPC"].includes(query.type))
      throw new BadRequestException("Tipo de actor no válido.");
    const rows = await this.db.regulatoryActor.findMany({
      where: {
        id: query.cursor ? { gt: query.cursor } : undefined,
        type: query.type,
        active: query.active,
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { code: { contains: query.q, mode: "insensitive" } },
        ],
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
    });
    return pageOf(rows.map(actorResponse), query.limit);
  }

  async actor(id: bigint) {
    const row = await this.db.regulatoryActor.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Actor no encontrado.");
    return actorResponse(row);
  }

  async createActor(input: RegulatoryActorDto, actor: SessionUser) {
    validateTaxId(input.cuit);
    return this.db
      .$transaction(async (tx) => {
        const row = await tx.regulatoryActor.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "ACTOR_REGULATORIO_CREADO",
            entity: "actores_regulatorios",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return actorResponse(row);
      })
      .catch(masterDataError);
  }

  async updateActor(
    id: bigint,
    input: UpdateRegulatoryActorDto,
    actor: SessionUser,
  ) {
    validateTaxId(input.cuit);
    return this.db
      .$transaction(async (tx) => {
        const row = await tx.regulatoryActor.update({
          where: { id },
          data: input,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "ACTOR_REGULATORIO_ACTUALIZADO",
            entity: "actores_regulatorios",
            entityId: String(id),
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return actorResponse(row);
      })
      .catch(masterDataError);
  }

  async models(query: ListQuery) {
    if (
      query.type &&
      !["CILINDRO", "VALVULA", "REGULADOR"].includes(query.type)
    )
      throw new BadRequestException("Tipo de componente no válido.");
    const rows = await this.db.componentModel.findMany({
      where: {
        id: query.cursor ? { gt: query.cursor } : undefined,
        type: query.type,
        active: query.active,
        OR: [
          { homologationCode: { contains: query.q, mode: "insensitive" } },
          { brand: { contains: query.q, mode: "insensitive" } },
          { model: { contains: query.q, mode: "insensitive" } },
        ],
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
    });
    return pageOf(rows.map(modelResponse), query.limit);
  }
  async model(id: bigint) {
    const row = await this.db.componentModel.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Modelo no encontrado.");
    return modelResponse(row);
  }
  async createModel(input: ComponentModelDto, actor: SessionUser) {
    validateCapacity(input.type, input.capacityLiters);
    return this.db
      .$transaction(async (tx) => {
        const row = await tx.componentModel.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "MODELO_COMPONENTE_CREADO",
            entity: "modelos_componentes",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return modelResponse(row);
      })
      .catch(masterDataError);
  }
  async updateModel(
    id: bigint,
    input: UpdateComponentModelDto,
    actor: SessionUser,
  ) {
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM modelos_componentes WHERE id = ${id} FOR UPDATE`;
        const previous = await tx.componentModel.findUnique({ where: { id } });
        if (!previous) throw new NotFoundException("Modelo no encontrado.");
        validateCapacity(
          input.type ?? previous.type,
          input.capacityLiters === undefined
            ? previous.capacityLiters
            : input.capacityLiters,
        );
        const row = await tx.componentModel.update({
          where: { id },
          data: input,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "MODELO_COMPONENTE_ACTUALIZADO",
            entity: "modelos_componentes",
            entityId: String(id),
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return modelResponse(row);
      })
      .catch(masterDataError);
  }
}
