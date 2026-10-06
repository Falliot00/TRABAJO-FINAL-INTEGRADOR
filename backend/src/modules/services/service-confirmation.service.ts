import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  ConfirmationBlocker,
  ConfirmedService,
  ConfirmServiceRequest,
  ServiceConfirmationCheck,
  SessionUser,
} from "@cilgas/contracts";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import {
  identifierText,
  masterDataError,
  pageOf,
  type ListQuery,
} from "../../common/master-data";
import { AuditService } from "../audit/audit.service";
import { ComponentServiceEffects } from "../components/service-effects";
import {
  ServiceSheetsService,
  jsonText,
} from "../documents/service-sheets.service";
import { sheetSnapshot } from "../documents/sheet-snapshot";
import { SupplierObligationsService } from "../suppliers/obligations.service";
import { digest, sessionUser, userInclude } from "../identity/identity.service";
import { parseId } from "../identity/dto";
import {
  draftResponse,
  includeDraft,
  type DraftRow,
} from "./service-drafts.service";
import {
  WorkshopRegulatoryValidation,
  type RegulatoryValidation,
} from "./regulatory-validation";

import { technicalRules } from "./confirmation-technical-rules";

type Confirmation = {
  key: string;
  version: number;
  expectedId: bigint | null;
  response: ConfirmedService;
};
export class ServiceConfirmationService {
  private readonly technical = new ComponentServiceEffects();
  private readonly sheets = new ServiceSheetsService();
  private readonly obligations = new SupplierObligationsService();
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
    private readonly regulatory: RegulatoryValidation = new WorkshopRegulatoryValidation(),
  ) {}

  private async lockContext(tx: Prisma.TransactionClient, row: DraftRow) {
    await tx.$queryRaw`SELECT id FROM vehiculos WHERE id = ${row.vehicleId} FOR UPDATE`;
    const people = row.people.map((person) => person.personId);
    if (people.length)
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM personas WHERE id IN (${Prisma.join(people)}) ORDER BY id FOR SHARE`,
      );
    const ids = [
      ...new Set([
        ...row.items.flatMap((item) =>
          item.componentId ? [item.componentId] : [],
        ),
        ...row.interventions.flatMap((item) =>
          [item.componentId, item.cylinderId].filter(
            (id): id is bigint => id !== null,
          ),
        ),
        ...(
          await this.technical.members(
            tx,
            (await this.technical.current(tx, row.vehicleId))?.id ?? null,
          )
        ).map((member) => member.componentId),
      ]),
    ];
    if (ids.length) {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM componentes WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM modelos_componentes WHERE id IN (SELECT modelo_id FROM componentes WHERE id IN (${Prisma.join(ids)})) ORDER BY id FOR SHARE`,
      );
    }
    const actors = [
      ...new Set(
        [
          row.preparation?.pecId,
          row.preparation?.tdmId,
          ...row.interventions.map((item) => item.crpcId),
        ].filter((id): id is bigint => id != null),
      ),
    ];
    if (actors.length)
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM actores_regulatorios WHERE id IN (${Prisma.join(actors)}) ORDER BY id FOR SHARE`,
      );
    await tx.$queryRaw`SELECT id FROM configuracion_taller WHERE id = 1 FOR SHARE`;
    const suppliers = row.items.flatMap((item) =>
      item.costs.flatMap((cost) => (cost.supplierId ? [cost.supplierId] : [])),
    );
    if (suppliers.length)
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM proveedores WHERE id IN (${Prisma.join(suppliers)}) ORDER BY id FOR SHARE`,
      );
    return { ids, actors };
  }

  private async assess(
    tx: Prisma.TransactionClient,
    row: DraftRow,
    actor: SessionUser,
  ) {
    const blockers: ConfirmationBlocker[] = await technicalRules(tx, row);
    const block = (code: string, message: string) =>
      blockers.push({ code, message });
    const total = row.items.reduce(
      (value, item) => value.add(item.amount),
      new Prisma.Decimal(0),
    );
    const currentConfiguration = await this.technical.current(
      tx,
      row.vehicleId,
    );
    if (
      !currentConfiguration &&
      (row.type !== "CONVERSION" ||
        !row.items.some(
          (item) => item.componentId && item.action === "INSTALAR",
        ))
    )
      block(
        "BASE_CONFIGURACION_DESCONOCIDA",
        "Falta registrar la configuración inicial del equipo. Su ausencia no significa que el vehículo no tenga equipo.",
      );
    if (
      row.items.some(
        (item) =>
          item.type === "ACCESORIO" &&
          ["INSTALAR", "RETIRAR"].includes(item.action ?? ""),
      )
    )
      block(
        "CONFIGURACION_ACCESORIOS_PENDIENTE",
        "La modificación de accesorios requiere una composición explícita de accesorios antes de confirmar.",
      );
    if (!total.eq(row.totalAmount))
      block(
        "IMPORTE_ITEMS",
        "El importe total debe coincidir con la suma de los ítems.",
      );
    if (!row.vehicle.active || row.people.some((link) => !link.person.active))
      block(
        "REFERENCIAS_INACTIVAS",
        "Revise el vehículo y las personas seleccionadas: deben estar activos al confirmar.",
      );
    if (
      !row.sheetOperation ||
      !row.preparation?.pecId ||
      !row.preparation?.tdmId
    )
      block(
        "PREPARACION_INCOMPLETA",
        "Complete la operación documental, PEC y TdM.",
      );
    const prep = row.preparation;
    const phRows = row.interventions.filter((item) => item.performsPh);
    if (row.includesPh !== phRows.length > 0)
      block(
        "PH_INCONSISTENTE",
        "La indicación de PH y sus ensayos individuales deben coincidir.",
      );
    if (
      new Set(phRows.map((item) => String(item.componentId))).size !==
        phRows.length ||
      phRows.some(
        (item) =>
          !item.componentId ||
          !item.crpcId ||
          !item.testDate ||
          !item.phResult ||
          (item.phResult === "APROBADO" && !item.revisionExpiresOn) ||
          (item.phResult === "RECHAZADO" && item.finalPosition !== null),
      )
    )
      block(
        "PH_INCOMPLETA",
        "Revise identidad, CRPC, fechas y resultado de cada ensayo; un cilindro rechazado no puede quedar instalado.",
      );
    for (const item of row.interventions) {
      if (item.componentId) {
        const component = await tx.component.findUnique({
          where: { id: item.componentId },
          include: { model: true },
        });
        if (
          !component ||
          component.type !== item.type ||
          (item.serialNumber && item.serialNumber !== component.serialNumber) ||
          (item.homologationCode &&
            item.homologationCode !== component.model.homologationCode)
        )
          block(
            "IDENTIDAD_COMPONENTE",
            "La identidad documental del componente no coincide con su referencia individual.",
          );
      }
    }
    const actorIds = [
      prep?.pecId,
      prep?.tdmId,
      ...phRows.map((item) => item.crpcId),
    ].filter((id): id is bigint => id != null);
    if (
      (await tx.regulatoryActor.count({
        where: { id: { in: actorIds }, active: false },
      })) > 0
    )
      block(
        "ACTORES_INACTIVOS",
        "Los actores regulatorios seleccionados deben estar activos.",
      );
    const supplierIds = row.items.flatMap((item) =>
      item.costs.flatMap((cost) => (cost.supplierId ? [cost.supplierId] : [])),
    );
    if (
      (await tx.supplier.count({
        where: { id: { in: supplierIds }, active: false },
      })) > 0
    )
      block(
        "COSTOS_REFERENCIAS",
        "Una referencia de costos requiere revisión por un administrador.",
      );
    const assessment = await this.regulatory.assess(draftResponse(row, actor));
    try {
      await this.technical.plan(tx, row);
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      block("CONFIGURACION_INCONSISTENTE", error.message);
    }
    blockers.push(...assessment.blockers);
    if (!assessment.blockers.length && !assessment.document)
      block(
        "RF-07",
        "Falta evidencia de la operación documental y sus firmantes.",
      );
    return {
      blockers,
      evidence: assessment.evidence,
      document: assessment.document,
    };
  }

  async check(
    id: bigint,
    actor: SessionUser,
  ): Promise<ServiceConfirmationCheck> {
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM servicios WHERE id = ${id} FOR SHARE`;
        let row = await tx.serviceDraft.findFirst({
          where: { id, status: "BORRADOR" },
          include: includeDraft,
        });
        if (!row) throw new NotFoundException("Borrador no encontrado.");
        await this.lockContext(tx, row);
        row = await tx.serviceDraft.findUniqueOrThrow({
          where: { id },
          include: includeDraft,
        });
        const assessment = await this.assess(tx, row, actor);
        const current = await this.technical.current(tx, row.vehicleId);
        return {
          serviceId: String(id),
          version: row.version,
          currentConfigurationId: current ? String(current.id) : null,
          canConfirm: assessment.blockers.length === 0,
          blockers: assessment.blockers,
        };
      },
      { timeout: 15000 },
    );
  }

  private async liveActor(
    tx: Prisma.TransactionClient,
    actor: SessionUser,
    token?: string,
  ) {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${parseId(actor.id)} FOR SHARE`;
    if (!token)
      throw new UnauthorizedException("Inicie sesión para continuar.");
    await tx.$queryRaw`SELECT id FROM sesiones WHERE token_hash = ${digest(token)} FOR SHARE`;
    const session = await tx.session.findUnique({
      where: { tokenHash: digest(token) },
    });
    if (
      !session ||
      session.userId !== parseId(actor.id) ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw new UnauthorizedException("Inicie sesión para continuar.");
    const user = await tx.user.findUnique({
      where: { id: parseId(actor.id) },
      include: userInclude,
    });
    if (!user?.active)
      throw new UnauthorizedException("Inicie sesión para continuar.");
    const current = sessionUser(user);
    if (!current.permissions.includes("servicios.gestionar"))
      throw new ForbiddenException(
        "No tiene permiso para confirmar servicios.",
      );
    return current;
  }

  async confirm(
    id: bigint,
    input: ConfirmServiceRequest,
    actor: SessionUser,
    token?: string,
  ) {
    try {
      return await this.db.$transaction(
        async (tx) => {
          const currentActor = await this.liveActor(tx, actor, token);
          await tx.$queryRaw`SELECT id FROM servicios WHERE id = ${id} FOR UPDATE`;
          const [prior] = await tx.$queryRaw<
            Confirmation[]
          >`SELECT clave_idempotencia::text AS key, version_borrador AS version, configuracion_esperada_id AS "expectedId", respuesta AS response FROM confirmaciones_servicio WHERE servicio_id = ${id}`;
          if (prior) {
            if (
              prior.key !== input.idempotencyKey.toLowerCase() ||
              prior.version !== input.version ||
              (prior.expectedId === null ? null : String(prior.expectedId)) !==
                input.expectedConfigurationId
            )
              throw new ConflictException(
                "El servicio ya fue confirmado con otra solicitud.",
              );
            return this.withCosts(tx, prior.response, currentActor);
          }
          let row = await tx.serviceDraft.findUnique({
            where: { id },
            include: includeDraft,
          });
          if (!row) throw new NotFoundException("Borrador no encontrado.");
          if (row.status !== "BORRADOR" || row.version !== input.version)
            throw new ConflictException(
              "El borrador cambió. Recupere su versión antes de confirmar.",
            );
          const references = await this.lockContext(tx, row);
          row = await tx.serviceDraft.findUniqueOrThrow({
            where: { id },
            include: includeDraft,
          });
          const current = await this.technical.current(tx, row.vehicleId);
          if (
            (current ? String(current.id) : null) !==
            input.expectedConfigurationId
          )
            throw new ConflictException(
              "La configuración del vehículo cambió. Revise el trabajo antes de confirmar.",
            );
          const assessment = await this.assess(tx, row, currentActor);
          if (assessment.blockers.length)
            throw new ConflictException({
              message: "La confirmación está bloqueada.",
              blockers: assessment.blockers,
            });
          const now = new Date();
          const configuration = await this.technical.apply(
            tx,
            row,
            parseId(actor.id),
            now,
          );
          const publicDraft = draftResponse(row, {
            ...currentActor,
            permissions: [],
          });
          const actors = await tx.regulatoryActor.findMany({
            where: { id: { in: references.actors } },
            orderBy: { id: "asc" },
          });
          const sheetId = await this.sheets.issue(
            tx,
            row,
            sheetSnapshot(row, actors, assessment.document!, now),
            parseId(actor.id),
            now,
          );
          await this.obligations.originate(tx, id, now);
          await tx.serviceDraft.update({
            where: { id },
            data: {
              status: "CONFIRMADO",
              version: { increment: 1 },
              confirmedAt: now,
              confirmedBy: parseId(actor.id),
              configurationBaseId: current?.id ?? null,
            },
          });
          const result: ConfirmedService = {
            ...publicDraft,
            version: row.version + 1,
            status: "CONFIRMADO",
            confirmedAt: now.toISOString(),
            confirmedBy: actor.id,
            configurationId:
              configuration.id === null ? null : String(configuration.id),
            sheetId: String(sheetId),
            pdfStatus: "PENDIENTE",
          };
          await tx.$executeRaw`INSERT INTO confirmaciones_servicio (servicio_id, clave_idempotencia, version_borrador, configuracion_esperada_id, configuracion_resultado_id, evidencia_regulatoria, respuesta) VALUES (${id}, ${input.idempotencyKey}::uuid, ${input.version}, ${current?.id ?? null}, ${configuration.id}, ${jsonText(assessment.evidence)}::jsonb, ${jsonText(result)}::jsonb)`;
          await this.audit.record(
            {
              actorId: actor.id,
              action: "SERVICIO_CONFIRMADO",
              entity: "servicios",
              entityId: String(id),
              result: "EXITO",
              correlationId: input.idempotencyKey,
              detail: `Ficha ${sheetId}; snapshot 1; PDF pendiente.`,
            },
            tx,
          );
          return this.withCosts(tx, result, currentActor);
        },
        { timeout: 20000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ((error.code === "P2010" &&
          ["23505", "23503", "23514"].includes(String(error.meta?.code))) ||
          error.code === "P2034")
      )
        throw new ConflictException(
          "La confirmación entró en conflicto con datos existentes. Revise el borrador y la configuración.",
        );
      return masterDataError(error);
    }
  }
  private async withCosts(
    tx: Prisma.TransactionClient,
    result: ConfirmedService,
    actor: SessionUser,
  ): Promise<ConfirmedService> {
    if (!actor.permissions.includes("finanzas.consultar")) return result;
    const costs = await tx.serviceDraftCost.findMany({
      where: { serviceId: parseId(result.id) },
      orderBy: { id: "asc" },
    });
    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        costs: costs
          .filter((cost) => String(cost.itemId) === item.id)
          .map((cost) => ({
            supplierId:
              cost.supplierId === null ? null : String(cost.supplierId),
            concept: cost.concept,
            treatment: cost.treatment as "PROVEEDOR" | "ABSORBIDO",
            amount: cost.amount.toFixed(2),
          })),
      })),
    };
  }
  async get(id: bigint, actor: SessionUser) {
    const rows = await this.db.$queryRaw<
      { response: ConfirmedService }[]
    >`SELECT respuesta AS response FROM confirmaciones_servicio WHERE servicio_id = ${id}`;
    if (!rows[0])
      throw new NotFoundException("Servicio confirmado no encontrado.");
    return this.withCosts(this.db, rows[0].response, actor);
  }
  async list(query: ListQuery, actor: SessionUser) {
    if (query.active !== undefined)
      throw new BadRequestException("Filtros de servicios no válidos.");
    const rows = await this.db.$queryRaw<{ response: ConfirmedService }[]>(
      Prisma.sql`SELECT respuesta AS response FROM confirmaciones_servicio WHERE servicio_id > ${query.cursor ?? 0n} AND (respuesta->>'description' ILIKE ${`%${query.q}%`} OR respuesta->'vehicle'->>'plate' ILIKE ${`%${identifierText({ value: query.q })}%`} OR EXISTS (SELECT 1 FROM jsonb_array_elements(respuesta->'people') person WHERE person->'person'->>'name' ILIKE ${`%${query.q}%`} OR person->'person'->>'documentNumber' ILIKE ${`%${identifierText({ value: query.q })}%`})) ORDER BY servicio_id LIMIT ${query.limit + 1}`,
    );
    return pageOf(
      await Promise.all(
        rows.map((row) => this.withCosts(this.db, row.response, actor)),
      ),
      query.limit,
    );
  }
  async sheet(id: bigint) {
    return this.sheets.get(this.db, id);
  }
  async supplierObligations(id: bigint) {
    const exists = await this.db.serviceDraft.count({ where: { id } });
    if (!exists) throw new NotFoundException("Servicio no encontrado.");
    return this.obligations.list(this.db, id);
  }
}
