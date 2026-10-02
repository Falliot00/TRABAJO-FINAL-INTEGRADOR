import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import type { SessionUser, Vehicle, VehicleDetail } from "@cilgas/contracts";
import type {
  Prisma,
  PrismaClient,
  Vehicle as VehicleRow,
} from "../../generated/prisma/client";
import {
  identifierText,
  masterDataError,
  pageOf,
  type ListQuery,
} from "../../common/master-data";
import { AuditService } from "../audit/audit.service";
import { parseId } from "../identity/dto";
import type {
  VehicleDto,
  VehicleDuplicatesQueryDto,
  UpdateVehicleDto,
  VehicleRelationshipDto,
  CloseVehicleRelationshipDto,
} from "./dto";
import { personResponse } from "./people.service";

function vehicleResponse(row: VehicleRow): Vehicle {
  return {
    id: String(row.id),
    plate: row.plate,
    brand: row.brand,
    model: row.model,
    year: row.year,
    engineNumber: row.engineNumber,
    chassisNumber: row.chassisNumber,
    type: row.type as Vehicle["type"],
    otherTypeDetail: row.otherTypeDetail,
    usage: row.usage,
    injection: row.injection,
    active: row.active,
  };
}
function validateClassification(
  type: string | null | undefined,
  otherTypeDetail: string | null | undefined,
) {
  if ((type === "OTROS") !== (otherTypeDetail != null))
    throw new BadRequestException(
      "Indique un detalle únicamente al seleccionar tipo Otros.",
    );
}
function civilDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value ||
    value < "0001-01-01"
  )
    throw new BadRequestException("Indique una fecha de calendario válida.");
  return date;
}
async function vehicleDetail(
  db: Prisma.TransactionClient,
  id: bigint,
): Promise<VehicleDetail> {
  const row = await db.vehicle.findUnique({
    where: { id },
    include: {
      relationships: {
        include: { person: true },
        orderBy: [{ from: "desc" }, { id: "desc" }],
      },
    },
  });
  if (!row) throw new NotFoundException("Vehículo no encontrado.");
  return {
    ...vehicleResponse(row),
    relationships: row.relationships.map((link) => ({
      id: String(link.id),
      vehicleId: String(link.vehicleId),
      personId: String(link.personId),
      role: link.role as "TITULAR" | "CONTACTO",
      from: link.from.toISOString().slice(0, 10),
      until: link.until?.toISOString().slice(0, 10) ?? null,
      person: personResponse(link.person),
    })),
  };
}

export class VehiclesService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}
  async list(query: ListQuery) {
    const normalized = identifierText({ value: query.q }) as string;
    const rows = await this.db.vehicle.findMany({
      where: {
        id: query.cursor ? { gt: query.cursor } : undefined,
        active: query.active,
        relationships: query.personId
          ? { some: { personId: query.personId } }
          : undefined,
        OR: [
          { plate: { contains: normalized } },
          { brand: { contains: query.q, mode: "insensitive" } },
          { model: { contains: query.q, mode: "insensitive" } },
        ],
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
    });
    return pageOf(rows.map(vehicleResponse), query.limit);
  }
  async get(id: bigint): Promise<VehicleDetail> {
    return vehicleDetail(this.db, id);
  }
  async duplicates(input: VehicleDuplicatesQueryDto) {
    const rows = input.plate
      ? await this.db.vehicle.findMany({
          where: {
            plate: input.plate,
            id: input.excludeId ? { not: parseId(input.excludeId) } : undefined,
          },
        })
      : [];
    return { items: rows.map(vehicleResponse), nextCursor: null };
  }
  async create(input: VehicleDto, actor: SessionUser) {
    validateClassification(input.type, input.otherTypeDetail);
    return this.db
      .$transaction(async (tx) => {
        const row = await tx.vehicle.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "VEHICULO_CREADO",
            entity: "vehiculos",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return vehicleResponse(row);
      })
      .catch(masterDataError);
  }
  async update(id: bigint, input: UpdateVehicleDto, actor: SessionUser) {
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM vehiculos WHERE id = ${id} FOR UPDATE`;
        const previous = await tx.vehicle.findUnique({ where: { id } });
        if (!previous) throw new NotFoundException("Vehículo no encontrado.");
        validateClassification(
          input.type === undefined ? previous.type : input.type,
          input.otherTypeDetail === undefined
            ? previous.otherTypeDetail
            : input.otherTypeDetail,
        );
        const row = await tx.vehicle.update({ where: { id }, data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "VEHICULO_ACTUALIZADO",
            entity: "vehiculos",
            entityId: String(id),
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return vehicleResponse(row);
      })
      .catch(masterDataError);
  }

  async relate(id: bigint, input: VehicleRelationshipDto, actor: SessionUser) {
    const from = civilDate(input.from);
    const personId = parseId(input.personId);
    return this.db
      .$transaction(async (tx) => {
        // All relationship writes lock the vehicle, including closing and transfer.
        await tx.$queryRaw`SELECT id FROM vehiculos WHERE id = ${id} FOR UPDATE`;
        const vehicle = await tx.vehicle.findUnique({ where: { id } });
        if (!vehicle) throw new NotFoundException("Vehículo no encontrado.");
        if (!vehicle.active)
          throw new ConflictException(
            "Reactive el vehículo antes de agregar vínculos.",
          );
        await tx.$queryRaw`SELECT id FROM personas WHERE id = ${personId} FOR SHARE`;
        const person = await tx.person.findUnique({ where: { id: personId } });
        if (!person?.active)
          throw new BadRequestException("Seleccione una persona activa.");
        const relevant = await tx.vehicleRelationship.findMany({
          where: {
            vehicleId: id,
            role: input.role,
            ...(input.role === "CONTACTO" ? { personId } : {}),
          },
          orderBy: { from: "desc" },
        });
        const open = relevant.find((link) => link.until === null);
        if (input.role === "TITULAR" && open) {
          if (open.personId === personId)
            throw new ConflictException(
              "La persona ya tiene un vínculo de titular abierto.",
            );
          if (from <= open.from)
            throw new ConflictException(
              "La nueva titularidad debe comenzar después del inicio de la anterior; no se admiten períodos de duración cero.",
            );
        }
        if (
          relevant.some((link) =>
            link !== open || input.role !== "TITULAR"
              ? link.until === null || link.until > from
              : false,
          )
        )
          throw new ConflictException(
            "El vínculo se superpone con un período registrado.",
          );
        if (input.role === "TITULAR" && open) {
          await tx.vehicleRelationship.update({
            where: { id: open.id },
            data: { until: from },
          });
          await this.audit.record(
            {
              actorId: actor.id,
              action: "VINCULO_VEHICULO_CERRADO",
              entity: "vehiculo_personas",
              entityId: String(open.id),
              result: "EXITO",
              detail: `Cambio de titular del vehículo ${id}. Fin exclusivo: ${input.from}.`,
            },
            tx,
          );
        }
        const row = await tx.vehicleRelationship.create({
          data: { vehicleId: id, personId, role: input.role, from },
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "VINCULO_VEHICULO_CREADO",
            entity: "vehiculo_personas",
            entityId: String(row.id),
            result: "EXITO",
            detail: `Vehículo ${id}; rol ${input.role}; desde ${input.from}.`,
          },
          tx,
        );
        return vehicleDetail(tx, id);
      })
      .catch(masterDataError);
  }

  async closeRelationship(
    vehicleId: bigint,
    relationshipId: bigint,
    input: CloseVehicleRelationshipDto,
    actor: SessionUser,
  ) {
    const until = civilDate(input.until);
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM vehiculos WHERE id = ${vehicleId} FOR UPDATE`;
        const link = await tx.vehicleRelationship.findFirst({
          where: { id: relationshipId, vehicleId },
        });
        if (!link) throw new NotFoundException("Vínculo no encontrado.");
        if (link.until !== null)
          throw new ConflictException(
            "El vínculo ya tiene fecha de cierre y conserva su historia.",
          );
        if (until <= link.from)
          throw new BadRequestException(
            "El fin exclusivo debe ser posterior al inicio del vínculo.",
          );
        await tx.vehicleRelationship.update({
          where: { id: relationshipId },
          data: { until },
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "VINCULO_VEHICULO_CERRADO",
            entity: "vehiculo_personas",
            entityId: String(relationshipId),
            result: "EXITO",
            detail: `Vehículo ${vehicleId}; fin exclusivo ${input.until}.`,
          },
          tx,
        );
        return vehicleDetail(tx, vehicleId);
      })
      .catch(masterDataError);
  }
}
