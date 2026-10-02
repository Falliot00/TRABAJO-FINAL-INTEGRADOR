import { NotFoundException } from "@nestjs/common";
import type { Supplier, SessionUser } from "@cilgas/contracts";
import type {
  PrismaClient,
  Supplier as SupplierRow,
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
  SupplierDto,
  SupplierDuplicatesQueryDto,
  UpdateSupplierDto,
} from "./dto";

function supplierResponse(row: SupplierRow): Supplier {
  return {
    id: String(row.id),
    name: row.name,
    cuit: row.cuit,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    active: row.active,
  };
}
export class SuppliersService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}
  async list(query: ListQuery) {
    const normalized = identifierText({ value: query.q }) as string;
    const rows = await this.db.supplier.findMany({
      where: {
        id: query.cursor ? { gt: query.cursor } : undefined,
        active: query.active,
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { cuit: { contains: normalized } },
        ],
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
    });
    return pageOf(rows.map(supplierResponse), query.limit);
  }
  async get(id: bigint) {
    const row = await this.db.supplier.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Proveedor no encontrado.");
    return supplierResponse(row);
  }
  async duplicates(input: SupplierDuplicatesQueryDto) {
    const rows = await this.db.supplier.findMany({
      where: {
        cuit: input.cuit,
        id: input.excludeId ? { not: parseId(input.excludeId) } : undefined,
      },
    });
    return { items: rows.map(supplierResponse), nextCursor: null };
  }
  async create(input: SupplierDto, actor: SessionUser) {
    validateTaxId(input.cuit);
    return this.db
      .$transaction(async (tx) => {
        const row = await tx.supplier.create({ data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "PROVEEDOR_CREADO",
            entity: "proveedores",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return supplierResponse(row);
      })
      .catch(masterDataError);
  }
  async update(id: bigint, input: UpdateSupplierDto, actor: SessionUser) {
    validateTaxId(input.cuit);
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM proveedores WHERE id = ${id} FOR UPDATE`;
        const row = await tx.supplier.update({ where: { id }, data: input });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "PROVEEDOR_ACTUALIZADO",
            entity: "proveedores",
            entityId: String(id),
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return supplierResponse(row);
      })
      .catch(masterDataError);
  }
}
