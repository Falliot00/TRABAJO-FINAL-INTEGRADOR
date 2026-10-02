import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { ServiceDraft, SessionUser } from "@cilgas/contracts";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import {
  identifierText,
  masterDataError,
  pageOf,
  type ListQuery,
} from "../../common/master-data";
import { AuditService } from "../audit/audit.service";
import { parseId } from "../identity/dto";
import {
  dateValue,
  type CreateServiceDraftDto,
  type UpdateServiceDraftDto,
  type DraftItemDto,
  type InterventionDto,
} from "./dto";

export const includeDraft = {
  vehicle: true,
  creator: true,
  people: { include: { person: true }, orderBy: { role: "asc" as const } },
  items: {
    include: { costs: { orderBy: { id: "asc" as const } } },
    orderBy: { order: "asc" as const },
  },
  preparation: true,
  interventions: {
    orderBy: [{ type: "asc" as const }, { row: "asc" as const }],
  },
};
export type DraftRow = Prisma.ServiceDraftGetPayload<{
  include: typeof includeDraft;
}>;
const stringId = (value: bigint | null) =>
  value === null ? null : String(value);
const dateText = (value: Date | null) =>
  value?.toISOString().slice(0, 10) ?? null;
const nullableId = (value: string | null | undefined) =>
  value ? parseId(value) : null;

function money(value: Prisma.Decimal) {
  const rounded = value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (rounded.lt(0) || rounded.gt("999999999999.99"))
    throw new BadRequestException(
      "El importe calculado debe estar entre cero y 999999999999.99.",
    );
  return rounded;
}
function itemData(item: DraftItemDto) {
  const quantity = new Prisma.Decimal(item.quantity);
  if (item.componentId && (!quantity.eq(1) || !item.action))
    throw new BadRequestException(
      "Un componente individual requiere cantidad uno y una acción.",
    );
  return {
    order: item.order,
    description: item.description,
    type: item.type,
    componentId: nullableId(item.componentId),
    action: item.action ?? null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount,
    amount: money(quantity.mul(item.unitPrice).sub(item.discount)),
  };
}
function interventionData(item: InterventionDto) {
  if (
    (item.type === "REGULADOR" &&
      (item.row > 3 ||
        item.action === "S" ||
        (item.finalPosition != null && item.finalPosition !== 1))) ||
    (["CILINDRO", "VALVULA"].includes(item.type) && item.row > 4) ||
    (item.type === "ACCESORIO" &&
      (item.componentId || item.finalPosition != null)) ||
    (item.performsPh && item.type !== "CILINDRO")
  )
    throw new BadRequestException(
      "Revise el tipo, renglón, posición y ensayo de la intervención.",
    );
  const testDate = dateValue(item.testDate);
  const revisionExpiresOn = dateValue(item.revisionExpiresOn);
  if (testDate && revisionExpiresOn && revisionExpiresOn <= testDate)
    throw new BadRequestException(
      "El vencimiento de revisión debe ser posterior al ensayo.",
    );
  return {
    ...item,
    componentId: nullableId(item.componentId),
    crpcId: nullableId(item.crpcId),
    manufactureMonth: dateValue(
      item.manufactureMonth ? `${item.manufactureMonth}-01` : null,
    ),
    revisionMonth: dateValue(
      item.revisionMonth ? `${item.revisionMonth}-01` : null,
    ),
    testDate,
    revisionExpiresOn,
  };
}

async function activeReference(
  tx: Prisma.TransactionClient,
  table: "vehiculos" | "personas" | "proveedores" | "actores_regulatorios",
  id: bigint,
  type?: string,
) {
  const rows = await tx.$queryRaw<{ active: boolean; type?: string }[]>(
    Prisma.sql`SELECT activo AS active ${type ? Prisma.sql`, tipo AS type` : Prisma.empty} FROM ${Prisma.raw(table)} WHERE id = ${id} FOR SHARE`,
  );
  if (!rows[0]?.active || (type && rows[0].type !== type))
    throw new BadRequestException(
      "Seleccione referencias existentes, activas y del tipo indicado.",
    );
}

async function componentReference(
  tx: Prisma.TransactionClient,
  id: string,
  type?: string,
) {
  const rows = await tx.$queryRaw<
    { type: string }[]
  >`SELECT tipo AS type FROM componentes WHERE id = ${parseId(id)} FOR SHARE`;
  if (!rows[0] || (type && rows[0].type !== type))
    throw new BadRequestException(
      "Seleccione un componente existente del tipo indicado.",
    );
}

export function draftResponse(row: DraftRow, actor: SessionUser): ServiceDraft {
  return {
    id: String(row.id),
    version: row.version,
    status: "BORRADOR",
    vehicleId: String(row.vehicleId),
    vehicle: {
      id: String(row.vehicle.id),
      plate: row.vehicle.plate,
      brand: row.vehicle.brand,
      model: row.vehicle.model,
    },
    catalogOfferId: String(row.catalogOfferId),
    serviceDate: dateText(row.serviceDate)!,
    description: row.description,
    type: row.type as ServiceDraft["type"],
    sheetOperation: row.sheetOperation as ServiceDraft["sheetOperation"],
    includesPh: row.includesPh,
    totalAmount: row.totalAmount.toFixed(2),
    notes: row.notes,
    createdBy: String(row.createdBy),
    createdByName: row.creator.name,
    createdAt: row.createdAt.toISOString(),
    people: row.people.map(({ role, person }) => ({
      role: role as ServiceDraft["people"][number]["role"],
      personId: String(person.id),
      person: {
        id: String(person.id),
        name: person.name,
        documentType: person.documentType,
        documentNumber: person.documentNumber,
      },
    })),
    items: row.items.map((item) => ({
      id: String(item.id),
      catalogItemId: stringId(item.catalogItemId),
      order: item.order,
      description: item.description,
      type: item.type as ServiceDraft["items"][number]["type"],
      componentId: stringId(item.componentId),
      action: item.action as ServiceDraft["items"][number]["action"],
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      discount: item.discount.toFixed(2),
      amount: item.amount.toFixed(2),
      ...(actor.permissions.includes("finanzas.consultar")
        ? {
            costs: item.costs.map((cost) => ({
              supplierId: stringId(cost.supplierId),
              concept: cost.concept,
              treatment: cost.treatment as "PROVEEDOR" | "ABSORBIDO",
              amount: cost.amount.toFixed(2),
            })),
          }
        : {}),
    })),
    preparation: row.preparation
      ? {
          pecId: stringId(row.preparation.pecId),
          tdmId: stringId(row.preparation.tdmId),
          previousSticker: row.preparation.previousSticker,
          newSticker: row.preparation.newSticker,
          enabledOn: dateText(row.preparation.enabledOn),
          expiresOn: dateText(row.preparation.expiresOn),
          notes: row.preparation.notes,
        }
      : null,
    interventions: row.interventions.map((item) => ({
      type: item.type as ServiceDraft["interventions"][number]["type"],
      row: item.row,
      componentId: stringId(item.componentId),
      homologationCode: item.homologationCode,
      serialNumber: item.serialNumber,
      condition: item.condition,
      action: item.action as "M" | "S" | "D" | "B" | null,
      finalPosition: item.finalPosition,
      manufactureMonth: dateText(item.manufactureMonth)?.slice(0, 7) ?? null,
      revisionMonth: dateText(item.revisionMonth)?.slice(0, 7) ?? null,
      crpcId: stringId(item.crpcId),
      performsPh: item.performsPh,
      testDate: dateText(item.testDate),
      revisionExpiresOn: dateText(item.revisionExpiresOn),
      phResult: item.phResult as "APROBADO" | "RECHAZADO" | null,
      certificateNumber: item.certificateNumber,
      description: item.description,
    })),
  };
}

export class ServiceDraftsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}
  async list(query: ListQuery, actor: SessionUser) {
    if (query.active !== undefined)
      throw new BadRequestException("Filtros de borradores no válidos.");
    const rows = await this.db.serviceDraft.findMany({
      where: {
        status: "BORRADOR",
        id: query.cursor ? { gt: query.cursor } : undefined,
        OR: [
          { description: { contains: query.q, mode: "insensitive" } },
          {
            vehicle: {
              plate: {
                contains: identifierText({ value: query.q }) as string,
                mode: "insensitive",
              },
            },
          },
          {
            people: {
              some: {
                person: {
                  OR: [
                    { name: { contains: query.q, mode: "insensitive" } },
                    {
                      documentNumber: {
                        contains: identifierText({ value: query.q }) as string,
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
      include: includeDraft,
    });
    return pageOf(
      rows.map((row) => draftResponse(row, actor)),
      query.limit,
    );
  }
  async get(id: bigint, actor: SessionUser) {
    const row = await this.db.serviceDraft.findFirst({
      where: { id, status: "BORRADOR" },
      include: includeDraft,
    });
    if (!row) throw new NotFoundException("Borrador no encontrado.");
    return draftResponse(row, actor);
  }
  async create(input: CreateServiceDraftDto, actor: SessionUser) {
    const vehicleId = parseId(input.vehicleId);
    const catalogOfferId = parseId(input.catalogOfferId);
    const serviceDate = dateValue(input.serviceDate)!;
    return this.db
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM vehiculos WHERE id = ${vehicleId} FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM catalogo_servicios WHERE id = ${catalogOfferId} FOR SHARE`;
        const vehicle = await tx.vehicle.findFirst({
          where: { id: vehicleId, active: true },
          include: {
            relationships: {
              where: {
                from: { lte: serviceDate },
                OR: [{ until: null }, { until: { gt: serviceDate } }],
                person: { active: true },
              },
            },
          },
        });
        const offer = await tx.catalogOffer.findFirst({
          where: { id: catalogOfferId, active: true },
          include: { items: { orderBy: { order: "asc" } } },
        });
        if (!vehicle || !offer)
          throw new BadRequestException(
            "Seleccione un vehículo y una oferta existentes y activos.",
          );
        const row = await tx.serviceDraft.create({
          data: {
            vehicleId,
            catalogOfferId,
            serviceDate,
            status: "BORRADOR",
            description: offer.name,
            type: offer.type,
            includesPh: offer.items.some((item) => item.type === "ENSAYO_PH"),
            totalAmount: offer.suggestedPrice,
            createdBy: parseId(actor.id),
            people: {
              create: vehicle.relationships
                .filter(
                  (link) =>
                    vehicle.relationships.filter(
                      (candidate) => candidate.role === link.role,
                    ).length === 1,
                )
                .map((link) => ({ role: link.role, personId: link.personId })),
            },
          },
        });
        for (const item of offer.items) {
          const saved = await tx.serviceDraftItem.create({
            data: {
              serviceId: row.id,
              order: item.order,
              catalogItemId: item.id,
              description: item.description,
              type: item.type,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: money(item.quantity.mul(item.unitPrice)),
            },
          });
          const amount = money(item.quantity.mul(item.unitCost));
          if (amount.gt(0))
            await tx.serviceDraftCost.create({
              data: {
                serviceId: row.id,
                itemId: saved.id,
                supplierId: item.supplierId,
                concept: item.description,
                treatment: item.supplierId ? "PROVEEDOR" : "ABSORBIDO",
                amount,
              },
            });
        }
        await this.audit.record(
          {
            actorId: actor.id,
            action: "BORRADOR_SERVICIO_CREADO",
            entity: "servicios",
            entityId: String(row.id),
            result: "EXITO",
          },
          tx,
        );
        return draftResponse(
          await tx.serviceDraft.findUniqueOrThrow({
            where: { id: row.id },
            include: includeDraft,
          }),
          actor,
        );
      })
      .catch(masterDataError);
  }
  async update(id: bigint, input: UpdateServiceDraftDto, actor: SessionUser) {
    if (
      !actor.permissions.includes("finanzas.consultar") &&
      input.items?.some((item) => item.costs !== undefined)
    )
      throw new ForbiddenException(
        "No tiene permiso para modificar costos del servicio.",
      );
    return this.db
      .$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM servicios WHERE id = ${id} FOR UPDATE`;
          const previous = await tx.serviceDraft.findUnique({
            where: { id },
            include: includeDraft,
          });
          if (!previous) throw new NotFoundException("Borrador no encontrado.");
          if (
            previous.status !== "BORRADOR" ||
            previous.version !== input.version
          )
            throw new ConflictException(
              "El borrador cambió. Recupere su versión actual antes de guardar.",
            );
          if (
            input.vehicleId &&
            parseId(input.vehicleId) !== previous.vehicleId
          )
            await activeReference(tx, "vehiculos", parseId(input.vehicleId));
          if (input.people) {
            if (
              new Set(input.people.map((person) => person.role)).size !==
              input.people.length
            )
              throw new BadRequestException(
                "Cada rol admite una sola persona.",
              );
            for (const person of input.people) {
              if (
                !previous.people.some(
                  (prior) =>
                    prior.role === person.role &&
                    String(prior.personId) === person.personId,
                )
              )
                await activeReference(tx, "personas", parseId(person.personId));
            }
            await tx.serviceDraftPerson.deleteMany({
              where: { serviceId: id },
            });
            await tx.serviceDraftPerson.createMany({
              data: input.people.map((person) => ({
                serviceId: id,
                role: person.role,
                personId: parseId(person.personId),
              })),
            });
          }
          if (input.items) {
            const retained = input.items.flatMap((item) =>
              item.id ? [parseId(item.id)] : [],
            );
            if (
              new Set(retained).size !== retained.length ||
              new Set(input.items.map((item) => item.order)).size !==
                input.items.length ||
              retained.some(
                (itemId) => !previous.items.some((item) => item.id === itemId),
              )
            )
              throw new BadRequestException(
                "Los ítems deben pertenecer al borrador y tener identidad y orden únicos.",
              );
            await tx.$executeRaw`SET CONSTRAINTS servicio_items_servicio_id_orden_key DEFERRED`;
            await tx.serviceDraftCost.deleteMany({
              where: { serviceId: id, itemId: { notIn: retained } },
            });
            await tx.serviceDraftItem.deleteMany({
              where: { serviceId: id, id: { notIn: retained } },
            });
            for (const item of input.items) {
              const prior = previous.items.find(
                (candidate) => String(candidate.id) === item.id,
              );
              if (item.componentId)
                await componentReference(tx, item.componentId);
              const data = itemData(item);
              const saved = item.id
                ? await tx.serviceDraftItem.update({
                    where: { id: parseId(item.id) },
                    data,
                  })
                : await tx.serviceDraftItem.create({
                    data: { ...data, serviceId: id },
                  });
              if (item.costs !== undefined) {
                for (const cost of item.costs) {
                  if (
                    !new Prisma.Decimal(cost.amount).gt(0) ||
                    (cost.treatment === "PROVEEDOR"
                      ? !cost.supplierId
                      : Boolean(cost.supplierId))
                  )
                    throw new BadRequestException(
                      "Indique un costo positivo y un proveedor sólo para costos externos.",
                    );
                  if (
                    cost.supplierId &&
                    !prior?.costs.some(
                      (previousCost) =>
                        String(previousCost.supplierId) === cost.supplierId,
                    )
                  )
                    await activeReference(
                      tx,
                      "proveedores",
                      parseId(cost.supplierId),
                    );
                }
                await tx.serviceDraftCost.deleteMany({
                  where: { serviceId: id, itemId: saved.id },
                });
                await tx.serviceDraftCost.createMany({
                  data: item.costs.map((cost) => ({
                    serviceId: id,
                    itemId: saved.id,
                    supplierId: nullableId(cost.supplierId),
                    concept: cost.concept,
                    treatment: cost.treatment,
                    amount: cost.amount,
                  })),
                });
              }
            }
          }
          if (input.preparation !== undefined) {
            if (input.preparation === null)
              await tx.servicePreparation.deleteMany({
                where: { serviceId: id },
              });
            else {
              const prep = input.preparation;
              if (
                prep.pecId &&
                prep.pecId !== stringId(previous.preparation?.pecId ?? null)
              )
                await activeReference(
                  tx,
                  "actores_regulatorios",
                  parseId(prep.pecId),
                  "PEC",
                );
              if (
                prep.tdmId &&
                prep.tdmId !== stringId(previous.preparation?.tdmId ?? null)
              )
                await activeReference(
                  tx,
                  "actores_regulatorios",
                  parseId(prep.tdmId),
                  "TDM",
                );
              const data = {
                ...prep,
                pecId:
                  prep.pecId === undefined ? undefined : nullableId(prep.pecId),
                tdmId:
                  prep.tdmId === undefined ? undefined : nullableId(prep.tdmId),
                enabledOn:
                  prep.enabledOn === undefined
                    ? previous.preparation?.enabledOn
                    : dateValue(prep.enabledOn),
                expiresOn:
                  prep.expiresOn === undefined
                    ? previous.preparation?.expiresOn
                    : dateValue(prep.expiresOn),
              };
              if (
                data.enabledOn &&
                data.expiresOn &&
                data.expiresOn <= data.enabledOn
              )
                throw new BadRequestException(
                  "El vencimiento debe ser posterior a la habilitación.",
                );
              await tx.servicePreparation.upsert({
                where: { serviceId: id },
                create: { ...data, serviceId: id },
                update: data,
              });
            }
          }
          if (input.interventions) {
            const positions = input.interventions
              .filter((item) => item.finalPosition != null)
              .map((item) => `${item.type}/${item.finalPosition}`);
            if (
              new Set(
                input.interventions.map((item) => `${item.type}/${item.row}`),
              ).size !== input.interventions.length ||
              new Set(positions).size !== positions.length
            )
              throw new BadRequestException(
                "Las intervenciones requieren renglones y posiciones únicas por tipo.",
              );
            for (const item of input.interventions) {
              if (item.componentId)
                await componentReference(tx, item.componentId, item.type);
              if (
                item.crpcId &&
                !previous.interventions.some(
                  (prior) => String(prior.crpcId) === item.crpcId,
                )
              )
                await activeReference(
                  tx,
                  "actores_regulatorios",
                  parseId(item.crpcId),
                  "CRPC",
                );
            }
            await tx.serviceIntervention.deleteMany({
              where: { serviceId: id },
            });
            await tx.serviceIntervention.createMany({
              data: input.interventions.map((item) => ({
                ...interventionData(item),
                serviceId: id,
              })),
            });
          }
          const row = await tx.serviceDraft.update({
            where: { id },
            data: {
              version: { increment: 1 },
              vehicleId: input.vehicleId ? parseId(input.vehicleId) : undefined,
              serviceDate: input.serviceDate
                ? dateValue(input.serviceDate)!
                : undefined,
              description: input.description,
              type: input.type,
              sheetOperation: input.sheetOperation,
              includesPh: input.includesPh,
              totalAmount: input.totalAmount,
              notes: input.notes,
            },
            include: includeDraft,
          });
          await this.audit.record(
            {
              actorId: actor.id,
              action: "BORRADOR_SERVICIO_ACTUALIZADO",
              entity: "servicios",
              entityId: String(id),
              result: "EXITO",
              detail: `Versión ${previous.version} → ${row.version}. Campos actualizados: ${Object.entries(
                input,
              )
                .filter(
                  ([key, value]) => key !== "version" && value !== undefined,
                )
                .map(([key]) => key)
                .join(", ")}.`,
            },
            tx,
          );
          return draftResponse(row, actor);
        },
        { timeout: 15000 },
      )
      .catch(masterDataError);
  }
}
