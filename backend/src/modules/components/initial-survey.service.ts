import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  InitialEquipmentSurvey,
  InitialEquipmentSurveyInput,
  SessionUser,
} from "@cilgas/contracts";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { parseId } from "../identity/dto";
import { digest, sessionUser, userInclude } from "../identity/identity.service";
import { AuditService } from "../audit/audit.service";
import { jsonText } from "../documents/service-sheets.service";
import { masterDataError } from "../../common/master-data";
import { dateValue, preciseDate } from "../services/dto";

export class InitialSurveyService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  async register(
    vehicleId: bigint,
    input: InitialEquipmentSurveyInput,
    actor: SessionUser,
    token: string | undefined,
  ) {
    const normalized = {
      regulatorId: input.regulatorId,
      pairs: input.pairs
        .map((pair) => ({
          position: pair.position,
          cylinderId: pair.cylinderId,
          valveId: pair.valveId,
          ph: pair.ph
            ? {
                testDate: pair.ph.testDate ?? null,
                expiresOn: pair.ph.expiresOn ?? null,
                crpcId: pair.ph.crpcId ?? null,
                result: pair.ph.result ?? null,
                certificateNumber: pair.ph.certificateNumber ?? null,
              }
            : null,
        }))
        .sort((a, b) => a.position - b.position),
      sticker: input.sticker
        ? {
            number: input.sticker.number ?? null,
            enabledOn: input.sticker.enabledOn ?? null,
            expiresOn: input.sticker.expiresOn ?? null,
          }
        : null,
      notes: input.notes ?? null,
    };
    try {
      return await this.db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${parseId(actor.id)} FOR SHARE`;
          if (!token)
            throw new UnauthorizedException("Inicie sesión para continuar.");
          await tx.$queryRaw`SELECT id FROM sesiones WHERE token_hash = ${digest(token)} FOR SHARE`;
          const session = await tx.session.findUnique({
            where: { tokenHash: digest(token) },
          });
          const user = await tx.user.findUnique({
            where: { id: parseId(actor.id) },
            include: userInclude,
          });
          if (
            !session ||
            session.userId !== parseId(actor.id) ||
            session.revokedAt ||
            session.expiresAt <= new Date() ||
            !user?.active
          )
            throw new UnauthorizedException("Inicie sesión para continuar.");
          if (!sessionUser(user).permissions.includes("servicios.gestionar"))
            throw new ForbiddenException(
              "No tiene permiso para registrar equipos.",
            );
          await tx.$queryRaw`SELECT id FROM vehiculos WHERE id = ${vehicleId} FOR UPDATE`;
          const vehicle = await tx.vehicle.findUnique({
            where: { id: vehicleId },
          });
          if (!vehicle) throw new NotFoundException("Vehículo no encontrado.");
          const [prior] = await tx.$queryRaw<
            { same: boolean; response: InitialEquipmentSurvey }[]
          >`SELECT solicitud = ${jsonText(normalized)}::jsonb AND clave_idempotencia = ${input.idempotencyKey}::uuid AS same, respuesta AS response FROM relevamientos_iniciales WHERE vehiculo_id = ${vehicleId}`;
          if (prior) {
            if (!prior.same)
              throw new ConflictException(
                "El equipo ya fue relevado con otra solicitud.",
              );
            return prior.response;
          }
          if (!vehicle.active)
            throw new ConflictException(
              "El vehículo debe estar activo para relevar su equipo.",
            );
          const configs = await tx.$queryRaw<
            { id: bigint }[]
          >`SELECT id FROM configuraciones WHERE vehiculo_id = ${vehicleId}`;
          if (configs.length)
            throw new ConflictException(
              "El relevamiento inicial requiere un vehículo sin configuraciones registradas.",
            );
          const members = [
            {
              componentId: parseId(input.regulatorId),
              type: "REGULADOR",
              position: 1,
              cylinderId: null,
            },
            ...normalized.pairs.flatMap((pair) => [
              {
                componentId: parseId(pair.cylinderId),
                type: "CILINDRO",
                position: pair.position,
                cylinderId: null,
              },
              {
                componentId: parseId(pair.valveId),
                type: "VALVULA",
                position: pair.position,
                cylinderId: parseId(pair.cylinderId),
              },
            ]),
          ];
          const ids = members.map((member) => member.componentId);
          if (
            new Set(ids).size !== ids.length ||
            new Set(normalized.pairs.map((pair) => pair.position)).size !==
              normalized.pairs.length
          )
            throw new BadRequestException(
              "Cada componente y posición debe ser único en el equipo relevado.",
            );
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM componentes WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
          );
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM modelos_componentes WHERE id IN (SELECT modelo_id FROM componentes WHERE id IN (${Prisma.join(ids)})) ORDER BY id FOR SHARE`,
          );
          const components = await tx.component.findMany({
            where: { id: { in: ids } },
            include: { model: true },
          });
          if (
            members.some(
              (member) =>
                !components.some(
                  (component) =>
                    component.id === member.componentId &&
                    component.type === member.type &&
                    component.model.active,
                ),
            )
          )
            throw new BadRequestException(
              "Seleccione componentes existentes del tipo indicado y con modelo activo.",
            );
          const today = new Date().toISOString().slice(0, 10);
          for (const pair of normalized.pairs) {
            const ph = pair.ph;
            if (!ph) continue;
            preciseDate(ph.testDate);
            dateValue(ph.expiresOn);
            const manufactured = components
              .find((component) => String(component.id) === pair.cylinderId)
              ?.manufactureMonth?.toISOString()
              .slice(0, 7);
            if (
              (ph.testDate &&
                (ph.testDate > today.slice(0, ph.testDate.length) ||
                  (manufactured && ph.testDate.slice(0, 7) < manufactured))) ||
              (ph.testDate &&
                ph.expiresOn &&
                ph.expiresOn.slice(0, ph.testDate.length) <= ph.testDate) ||
              (ph.result === "RECHAZADO" && ph.expiresOn)
            )
              throw new BadRequestException(
                "Las fechas o el resultado conocido de PH son contradictorios.",
              );
          }
          const sticker = normalized.sticker;
          if (sticker) {
            dateValue(sticker.enabledOn);
            dateValue(sticker.expiresOn);
            if (
              (sticker.enabledOn && sticker.enabledOn > today) ||
              (sticker.enabledOn &&
                sticker.expiresOn &&
                sticker.expiresOn <= sticker.enabledOn)
            )
              throw new BadRequestException(
                "Las fechas conocidas de la oblea son contradictorias.",
              );
          }
          const occupied = await tx.$queryRaw<{ id: bigint }[]>(
            Prisma.sql`SELECT componente_id AS id FROM componentes_instalados WHERE componente_id IN (${Prisma.join(ids)}) UNION SELECT componente_id AS id FROM bajas_componentes WHERE componente_id IN (${Prisma.join(ids)})`,
          );
          if (occupied.length)
            throw new ConflictException(
              "Un componente sigue instalado en otro vehículo o tiene una baja técnica.",
            );
          const actors = normalized.pairs.flatMap((pair) =>
            pair.ph?.crpcId ? [parseId(pair.ph.crpcId)] : [],
          );
          if (actors.length) {
            await tx.$queryRaw(
              Prisma.sql`SELECT id FROM actores_regulatorios WHERE id IN (${Prisma.join(actors)}) ORDER BY id FOR SHARE`,
            );
            if (
              (await tx.regulatoryActor.count({
                where: { id: { in: actors }, type: "CRPC" },
              })) !== new Set(actors).size
            )
              throw new BadRequestException(
                "El antecedente de PH debe identificar un CRPC existente.",
              );
          }
          const now = new Date();
          const [created] = await tx.$queryRaw<
            { id: bigint }[]
          >`INSERT INTO configuraciones (vehiculo_id, vigente_desde, observaciones) VALUES (${vehicleId}, ${now}, ${normalized.notes}) RETURNING id`;
          for (const member of members)
            await tx.$executeRaw`INSERT INTO configuracion_componentes (configuracion_id, componente_id, tipo, posicion, cilindro_id) VALUES (${created.id}, ${member.componentId}, ${member.type}, ${member.position}, ${member.cylinderId})`;
          const result: InitialEquipmentSurvey = {
            ...normalized,
            configurationId: String(created.id),
            vehicleId: String(vehicleId),
            recordedAt: now.toISOString(),
            recordedBy: actor.id,
          };
          await tx.$executeRaw`INSERT INTO relevamientos_iniciales (configuracion_id, vehiculo_id, clave_idempotencia, solicitud, respuesta, registrado_por, registrado_en) VALUES (${created.id}, ${vehicleId}, ${input.idempotencyKey}::uuid, ${jsonText(normalized)}::jsonb, ${jsonText(result)}::jsonb, ${parseId(actor.id)}, ${now})`;
          for (const pair of normalized.pairs) {
            if (!pair.ph) continue;
            const ph = pair.ph;
            await tx.$executeRaw`INSERT INTO antecedentes_ph_relevados (configuracion_id, componente_id, fecha_ensayo, vence_el, crpc_id, resultado, numero_certificado) VALUES (${created.id}, ${parseId(pair.cylinderId)}, ${ph.testDate}, ${ph.expiresOn ? new Date(ph.expiresOn) : null}, ${ph.crpcId ? parseId(ph.crpcId) : null}, ${ph.result}, ${ph.certificateNumber})`;
          }
          if (normalized.sticker) {
            const sticker = normalized.sticker;
            await tx.$executeRaw`INSERT INTO antecedentes_oblea_relevados (configuracion_id, numero, habilitada_el, vence_el) VALUES (${created.id}, ${sticker.number}, ${sticker.enabledOn ? new Date(sticker.enabledOn) : null}, ${sticker.expiresOn ? new Date(sticker.expiresOn) : null})`;
          }
          await this.audit.record(
            {
              actorId: actor.id,
              action: "EQUIPO_RELEVADO",
              entity: "configuraciones",
              entityId: String(created.id),
              result: "EXITO",
              correlationId: input.idempotencyKey,
              detail:
                "Configuración inicial observada; no acredita instalación ni servicios históricos.",
            },
            tx,
          );
          return result;
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
          "El relevamiento entró en conflicto con la configuración o sus antecedentes. Recupere la historia antes de continuar.",
        );
      return masterDataError(error);
    }
  }
}
