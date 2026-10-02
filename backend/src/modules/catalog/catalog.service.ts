import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { CatalogOffer, SessionUser } from "@cilgas/contracts";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import {
  masterDataError,
  pageOf,
  upperText,
  type ListQuery,
} from "../../common/master-data";
import { AuditService } from "../audit/audit.service";
import { parseId } from "../identity/dto";
import type {
  CatalogDuplicatesQueryDto,
  CatalogItemDto,
  CatalogOfferDto,
  UpdateCatalogOfferDto,
} from "./dto";

const withItems = { items: { orderBy: { order: "asc" as const } } };
type OfferRow = Prisma.CatalogOfferGetPayload<{ include: typeof withItems }>;
function offerResponse(row: OfferRow, sensitive: boolean): CatalogOffer {
  return {
    id: String(row.id),
    code: row.code,
    name: row.name,
    description: row.description,
    type: row.type as CatalogOffer["type"],
    suggestedPrice: row.suggestedPrice.toFixed(2),
    active: row.active,
    items: row.items.map((item) => ({
      id: String(item.id),
      order: item.order,
      description: item.description,
      type: item.type as CatalogOffer["items"][number]["type"],
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      ...(sensitive
        ? {
            supplierId:
              item.supplierId === null ? null : String(item.supplierId),
            unitCost: item.unitCost.toFixed(2),
          }
        : {}),
    })),
  };
}
function itemData(input: CatalogItemDto) {
  return {
    order: input.order,
    description: input.description,
    type: input.type,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    unitCost: input.unitCost,
    supplierId: input.supplierId ? parseId(input.supplierId) : null,
  };
}

async function validateItems(
  tx: Prisma.TransactionClient,
  items: CatalogItemDto[],
  previous: OfferRow["items"] = [],
) {
  const orders = items.map((item) => item.order);
  const ids = items.flatMap((item) => (item.id ? [item.id] : []));
  if (
    new Set(orders).size !== orders.length ||
    new Set(ids).size !== ids.length
  )
    throw new BadRequestException(
      "La composición no admite órdenes ni identidades de ítem repetidos.",
    );
  const selected = [
    ...new Set(
      items.flatMap((item) => {
        if (!item.supplierId) return [];
        const prior = previous.find(
          (candidate) => String(candidate.id) === item.id,
        );
        return String(prior?.supplierId) === item.supplierId
          ? []
          : [parseId(item.supplierId)];
      }),
    ),
  ];
  if (!selected.length) return;
  const suppliers = await tx.$queryRaw<
    { id: bigint; active: boolean }[]
  >(Prisma.sql`
    SELECT id, activo AS active FROM proveedores WHERE id IN (${Prisma.join(selected)}) ORDER BY id FOR SHARE
  `);
  if (
    suppliers.length !== selected.length ||
    suppliers.some((supplier) => !supplier.active)
  )
    throw new BadRequestException(
      "Seleccione un proveedor existente y activo para cada nueva referencia.",
    );
}
export class CatalogService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}
  async list(query: ListQuery, sensitive: boolean) {
    const code = upperText({ value: query.q }) as string;
    const rows = await this.db.catalogOffer.findMany({
      where: {
        id: query.cursor ? { gt: query.cursor } : undefined,
        active: query.active,
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { code: { contains: code } },
        ],
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
      include: withItems,
    });
    return pageOf(
      rows.map((row) => offerResponse(row, sensitive)),
      query.limit,
    );
  }
  async get(id: bigint, sensitive: boolean) {
    const row = await this.db.catalogOffer.findUnique({
      where: { id },
      include: withItems,
    });
    if (!row) throw new NotFoundException("Oferta no encontrada.");
    return offerResponse(row, sensitive);
  }
  async duplicates(input: CatalogDuplicatesQueryDto, sensitive: boolean) {
    const rows = await this.db.catalogOffer.findMany({
      where: {
        code: input.code,
        id: input.excludeId ? { not: parseId(input.excludeId) } : undefined,
      },
      include: withItems,
    });
    return {
      items: rows.map((row) => offerResponse(row, sensitive)),
      nextCursor: null,
    };
  }
  async create(input: CatalogOfferDto, actor: SessionUser) {
    if (input.items.some((item) => item.id !== undefined))
      throw new BadRequestException(
        "Una oferta nueva no admite ítems existentes.",
      );
    const { items, ...offer } = input;
    return this.db
      .$transaction(async (tx) => {
        await validateItems(tx, items);
        const row = await tx.catalogOffer.create({
          data: { ...offer, items: { create: items.map(itemData) } },
          include: withItems,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "OFERTA_CREADA",
            entity: "catalogo_servicios",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return offerResponse(row, true);
      })
      .catch(masterDataError);
  }
  async update(id: bigint, input: UpdateCatalogOfferDto, actor: SessionUser) {
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM catalogo_servicios WHERE id = ${id} FOR UPDATE`;
        const previous = await tx.catalogOffer.findUnique({
          where: { id },
          include: withItems,
        });
        if (!previous) throw new NotFoundException("Oferta no encontrada.");
        const { items, ...offer } = input;
        if (items) {
          await validateItems(tx, items, previous.items);
          const retained = items.flatMap((item) =>
            item.id ? [parseId(item.id)] : [],
          );
          if (
            retained.some(
              (itemId) => !previous.items.some((item) => item.id === itemId),
            )
          )
            throw new BadRequestException(
              "Los ítems deben pertenecer a la oferta editada.",
            );
          // Deferring uniqueness allows swapping display order without changing item identity.
          await tx.$executeRaw`SET CONSTRAINTS catalogo_items_catalogo_servicio_id_orden_key DEFERRED`;
          await tx.catalogItem.deleteMany({
            where: { offerId: id, id: { notIn: retained } },
          });
          for (const item of items) {
            if (item.id)
              await tx.catalogItem.update({
                where: { id: parseId(item.id) },
                data: itemData(item),
              });
            else
              await tx.catalogItem.create({
                data: { ...itemData(item), offerId: id },
              });
          }
        }
        const row = await tx.catalogOffer.update({
          where: { id },
          data: offer,
          include: withItems,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "OFERTA_ACTUALIZADA",
            entity: "catalogo_servicios",
            entityId: String(id),
            result: "EXITO",
            detail: `Campos actualizados: ${Object.keys(input).join(", ")}.`,
          },
          tx,
        );
        return offerResponse(row, true);
      })
      .catch(masterDataError);
  }
}
