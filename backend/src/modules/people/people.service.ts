import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Person, SessionUser } from "@cilgas/contracts";
import type {
  Prisma,
  PrismaClient,
  Person as PersonRow,
} from "../../generated/prisma/client";
import {
  identifierText,
  masterDataError,
  pageOf,
  validateTaxId,
  type ListQuery,
} from "../../common/master-data";
import { AuditService } from "../audit/audit.service";
import { parseId } from "../identity/dto";
import type {
  PersonDto,
  PersonDuplicatesQueryDto,
  UpdatePersonDto,
} from "./dto";

export function personResponse(row: PersonRow): Person {
  return {
    id: String(row.id),
    type: row.type as Person["type"],
    name: row.name,
    documentType: row.documentType as Person["documentType"],
    documentNumber: row.documentNumber,
    street: row.street,
    streetNumber: row.streetNumber,
    floorApartment: row.floorApartment,
    locality: row.locality,
    province: row.province,
    postalCode: row.postalCode,
    phone: row.phone,
    email: row.email,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

function validateDocument(type: string, number: string) {
  if (type === "DNI" && !/^\d{6,8}$/.test(number))
    throw new BadRequestException(
      "El DNI debe contener entre seis y ocho dígitos.",
    );
  if (type === "CUIT" || type === "CUIL") validateTaxId(number);
}

export class PeopleService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListQuery) {
    const normalized = identifierText({ value: query.q }) as string;
    const rows = await this.db.person.findMany({
      where: {
        id: query.cursor ? { gt: query.cursor } : undefined,
        active: query.active,
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { documentNumber: { contains: normalized } },
        ],
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
    });
    return pageOf(rows.map(personResponse), query.limit);
  }
  async get(id: bigint) {
    const row = await this.db.person.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Persona no encontrada.");
    return personResponse(row);
  }
  async duplicates(input: PersonDuplicatesQueryDto) {
    const excludeId = input.excludeId ? parseId(input.excludeId) : undefined;
    const identity: Prisma.PersonWhereInput | undefined =
      input.documentType && input.documentNumber
        ? {
            documentType: input.documentType,
            documentNumber: input.documentNumber,
            id: excludeId ? { not: excludeId } : undefined,
          }
        : undefined;
    const exact = identity
      ? await this.db.person.findFirst({ where: identity })
      : null;
    const suggestions = input.name
      ? await this.db.person.findMany({
          where: {
            name: { contains: input.name, mode: "insensitive" },
            id: {
              notIn: [excludeId, exact?.id].filter(
                (id): id is bigint => id !== undefined,
              ),
            },
          },
          orderBy: { id: "asc" },
          take: 25,
        })
      : [];
    return {
      items: [...(exact ? [exact] : []), ...suggestions].map(personResponse),
      nextCursor: null,
    };
  }
  async create(input: PersonDto, actor: SessionUser) {
    validateDocument(input.documentType, input.documentNumber);
    return this.db
      .$transaction(async (tx) => {
        const row = await tx.person.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "PERSONA_CREADA",
            entity: "personas",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return personResponse(row);
      })
      .catch(masterDataError);
  }
  async update(id: bigint, input: UpdatePersonDto, actor: SessionUser) {
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM personas WHERE id = ${id} FOR UPDATE`;
        const previous = await tx.person.findUnique({ where: { id } });
        if (!previous) throw new NotFoundException("Persona no encontrada.");
        validateDocument(
          input.documentType ?? previous.documentType,
          input.documentNumber ?? previous.documentNumber,
        );
        const row = await tx.person.update({ where: { id }, data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "PERSONA_ACTUALIZADA",
            entity: "personas",
            entityId: String(id),
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return personResponse(row);
      })
      .catch(masterDataError);
  }
}
