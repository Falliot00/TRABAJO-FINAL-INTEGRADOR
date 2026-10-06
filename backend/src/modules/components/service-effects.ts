import { ConflictException } from "@nestjs/common";
import type { ComponentType, VehicleConfigurations } from "@cilgas/contracts";
import { Prisma } from "../../generated/prisma/client";
import type { DraftRow } from "../services/service-drafts.service";

type Configuration = {
  id: bigint;
  serviceId: bigint | null;
  validFrom: Date;
  validUntil: Date | null;
};
type Member = {
  componentId: bigint;
  cylinderId: bigint | null;
  type: ComponentType;
  position: number;
};
export class ComponentServiceEffects {
  async current(tx: Prisma.TransactionClient, vehicleId: bigint) {
    const rows = await tx.$queryRaw<
      Configuration[]
    >`SELECT id, servicio_origen_id AS "serviceId", vigente_desde AS "validFrom", vigente_hasta AS "validUntil" FROM configuraciones WHERE vehiculo_id = ${vehicleId} AND vigente_hasta IS NULL`;
    return rows[0] ?? null;
  }
  async members(
    tx: Prisma.TransactionClient,
    id: bigint | null,
  ): Promise<Member[]> {
    if (id === null) return [];
    return tx.$queryRaw<
      Member[]
    >`SELECT componente_id AS "componentId", tipo AS type, posicion AS position, cilindro_id AS "cylinderId" FROM configuracion_componentes WHERE configuracion_id = ${id} ORDER BY tipo, posicion`;
  }
  async plan(tx: Prisma.TransactionClient, draft: DraftRow) {
    const current = await this.current(tx, draft.vehicleId);
    const referenced = [
      ...new Set(
        [...draft.items, ...draft.interventions].flatMap((item) =>
          item.componentId ? [item.componentId] : [],
        ),
      ),
    ];
    if (referenced.length) {
      const retired = await tx.$queryRaw<{ id: bigint }[]>(
        Prisma.sql`SELECT componente_id AS id FROM bajas_componentes WHERE componente_id IN (${Prisma.join(referenced)})`,
      );
      if (retired.length)
        throw new ConflictException(
          "Un componente dado de baja técnica no puede volver a intervenir ni montarse.",
        );
      const elsewhere = await tx.$queryRaw<{ id: bigint }[]>(
        Prisma.sql`SELECT i.componente_id AS id FROM componentes_instalados i JOIN configuraciones c ON c.id = i.configuracion_id WHERE i.componente_id IN (${Prisma.join(referenced)}) AND c.vehiculo_id <> ${draft.vehicleId}`,
      );
      if (elsewhere.length)
        throw new ConflictException(
          "Un componente del servicio sigue instalado en otro vehículo.",
        );
    }
    const members = await this.members(tx, current?.id ?? null);
    const documentary = draft.interventions.filter(
      (row) => row.type !== "ACCESORIO",
    );
    if (
      documentary.some(
        (row) => !row.componentId || !row.homologationCode || !row.serialNumber,
      ) ||
      new Set(documentary.map((row) => String(row.componentId))).size !==
        documentary.length
    )
      throw new ConflictException(
        "Cada componente documentado requiere identidad única, código y serie.",
      );
    if (
      documentary.some(
        (row) =>
          (row.type === "CILINDRO" &&
            (!row.manufactureMonth || !row.condition)) ||
          (row.type === "REGULADOR" && !row.condition),
      )
    )
      throw new ConflictException(
        "Complete condición de regulador y cilindros, y fabricación mes/año de cada cilindro.",
      );
    const desired = new Map(
      members.map((member) => [String(member.componentId), member]),
    );
    const effects = draft.items.filter(
      (item) =>
        item.componentId && ["INSTALAR", "RETIRAR"].includes(item.action ?? ""),
    );
    for (const row of documentary) {
      const effect = effects.find(
        (item) => item.componentId === row.componentId,
      );
      const previous = members.find(
        (member) => member.componentId === row.componentId,
      );
      if (
        (effect?.action === "INSTALAR" && row.action !== "M") ||
        (effect?.action === "RETIRAR" &&
          !["D", "B"].includes(row.action ?? "")) ||
        (!effect &&
          (!previous ||
            (row.action !== "S" &&
              !(row.type === "REGULADOR" && row.action === null))))
      )
        throw new ConflictException(
          "Las marcas MSDB deben coincidir con montaje, permanencia, desmontaje o baja del componente.",
        );
      if (
        row.type === "VALVULA" &&
        (!row.cylinderId ||
          (previous && previous.cylinderId !== row.cylinderId))
      )
        throw new ConflictException(
          "Indique el cilindro de cada válvula y conserve su pareja histórica; un vínculo desconocido requiere relevamiento explícito.",
        );
      if (
        row.type === "VALVULA" &&
        !documentary.some(
          (cylinder) =>
            cylinder.type === "CILINDRO" &&
            cylinder.componentId === row.cylinderId,
        )
      )
        throw new ConflictException(
          "Documente el cilindro asociado a cada válvula involucrada.",
        );
    }
    if (
      effects.some(
        (effect) =>
          !documentary.some((row) => row.componentId === effect.componentId),
      )
    )
      throw new ConflictException(
        "Cada montaje, desmontaje o baja requiere su intervención documental.",
      );
    if (
      new Set(effects.map((item) => String(item.componentId))).size !==
      effects.length
    )
      throw new ConflictException(
        "Cada componente admite una sola instalación o retiro por servicio.",
      );
    for (const item of effects) {
      const key = String(item.componentId);
      if (item.action === "RETIRAR") {
        if (!desired.has(key))
          throw new ConflictException(
            "No se puede retirar un componente ajeno a la configuración vigente.",
          );
        if (
          draft.interventions.some(
            (row) =>
              row.componentId === item.componentId &&
              row.finalPosition !== null,
          )
        )
          throw new ConflictException(
            "Un componente retirado no puede conservar posición final.",
          );
        desired.delete(key);
      } else {
        if (desired.has(key))
          throw new ConflictException(
            "El componente ya integra la configuración vigente.",
          );
        const row = draft.interventions.find(
          (candidate) =>
            candidate.componentId === item.componentId &&
            candidate.finalPosition !== null,
        );
        if (!row?.componentId || !row.finalPosition || row.type === "ACCESORIO")
          throw new ConflictException(
            "Indique la posición final de cada componente instalado.",
          );
        const installed = await tx.$queryRaw<
          { componentId: bigint }[]
        >`SELECT componente_id AS "componentId" FROM componentes_instalados WHERE componente_id = ${row.componentId}`;
        if (installed.length)
          throw new ConflictException(
            "El componente ya está instalado en otro vehículo.",
          );
        desired.set(key, {
          componentId: row.componentId,
          cylinderId: row.cylinderId,
          type: row.type as ComponentType,
          position: row.finalPosition,
        });
      }
    }
    for (const row of draft.interventions) {
      if (
        row.finalPosition !== null &&
        (!row.componentId || !desired.has(String(row.componentId)))
      )
        throw new ConflictException(
          "La posición final requiere una instalación explícita o un componente vigente.",
        );
      if (
        row.finalPosition !== null &&
        row.componentId &&
        desired.get(String(row.componentId))?.position !== row.finalPosition
      )
        throw new ConflictException(
          "La posición final no coincide con la configuración del equipo.",
        );
    }
    for (const member of desired.values()) {
      if (
        !documentary.some(
          (row) =>
            row.componentId === member.componentId &&
            row.finalPosition === member.position,
        )
      )
        throw new ConflictException(
          "Documente cada componente de la configuración resultante y su posición.",
        );
      if (
        member.type === "VALVULA" &&
        (!member.cylinderId ||
          desired.get(String(member.cylinderId))?.type !== "CILINDRO" ||
          desired.get(String(member.cylinderId))?.position !== member.position)
      )
        throw new ConflictException(
          "Cada válvula debe pertenecer explícitamente a un cilindro de la configuración resultante.",
        );
      if (
        member.type === "CILINDRO" &&
        [...desired.values()].filter(
          (valve) =>
            valve.type === "VALVULA" && valve.cylinderId === member.componentId,
        ).length !== 1
      )
        throw new ConflictException(
          "Cada cilindro debe tener exactamente una válvula en su pareja resultante.",
        );
    }
    if (
      ["D", "B"].includes(draft.sheetOperation ?? "") &&
      (desired.size !== 0 ||
        !members.length ||
        documentary.some((row) => row.action !== draft.sheetOperation))
    )
      throw new ConflictException(
        "Desmontaje y baja requieren retirar el equipo completo con la marca D o B correspondiente.",
      );
    if (draft.sheetOperation === "C" && members.length)
      throw new ConflictException(
        "La conversión requiere un vehículo sin equipo vigente; documente una modificación del equipo existente.",
      );
    if (
      ["C", "M", "R"].includes(draft.sheetOperation ?? "") &&
      ([...desired.values()].filter((member) => member.type === "REGULADOR")
        .length !== 1 ||
        ![...desired.values()].some((member) => member.type === "CILINDRO"))
    )
      throw new ConflictException(
        "La habilitación requiere regulador y al menos una pareja cilindro–válvula en la configuración resultante.",
      );
    if (
      new Set(
        [...desired.values()].map(
          (member) => `${member.type}/${member.position}`,
        ),
      ).size !== desired.size
    )
      throw new ConflictException(
        "La configuración final contiene posiciones duplicadas.",
      );
    if (
      draft.interventions.some(
        (row) =>
          row.performsPh &&
          row.phResult === "RECHAZADO" &&
          row.componentId &&
          desired.has(String(row.componentId)),
      )
    )
      throw new ConflictException(
        "Un cilindro rechazado no puede integrar la configuración final: registre su retiro.",
      );
    return { current, desired, effects };
  }
  async apply(
    tx: Prisma.TransactionClient,
    draft: DraftRow,
    actorId: bigint,
    now: Date,
  ) {
    const { current, desired, effects } = await this.plan(tx, draft);
    let configurationId = current?.id ?? null;
    if (effects.length) {
      if (current)
        await tx.$executeRaw`UPDATE configuraciones SET vigente_hasta = ${now} WHERE id = ${current.id}`;
      const [created] = await tx.$queryRaw<
        { id: bigint }[]
      >`INSERT INTO configuraciones (vehiculo_id, servicio_origen_id, vigente_desde) VALUES (${draft.vehicleId}, ${draft.id}, ${now}) RETURNING id`;
      configurationId = created.id;
      for (const member of desired.values())
        await tx.$executeRaw`INSERT INTO configuracion_componentes (configuracion_id, componente_id, tipo, posicion, cilindro_id) VALUES (${created.id}, ${member.componentId}, ${member.type}, ${member.position}, ${member.cylinderId})`;
      for (const item of effects) {
        const retired = draft.interventions.some(
          (row) => row.componentId === item.componentId && row.action === "B",
        );
        if (retired)
          await tx.$executeRaw`INSERT INTO bajas_componentes (componente_id, servicio_id, ocurrida_en, registrado_por) VALUES (${item.componentId!}, ${draft.id}, ${now}, ${actorId})`;
        await tx.$executeRaw`INSERT INTO movimientos_componentes (componente_id, servicio_id, accion, origen, destino, ocurrido_en, registrado_por) VALUES (${item.componentId!}, ${draft.id}, ${retired ? "DESCARTAR" : item.action}, ${item.action === "INSTALAR" ? "DESCONOCIDO" : "VEHICULO"}, ${retired ? "DESCARTE" : item.action === "INSTALAR" ? "VEHICULO" : "DESCONOCIDO"}, ${now}, ${actorId})`;
      }
    }
    const preparation = draft.preparation;
    if (preparation?.newSticker)
      await tx.$executeRaw`INSERT INTO obleas (servicio_id, numero, numero_anterior, habilitada_el, vence_el) VALUES (${draft.id}, ${preparation.newSticker}, ${preparation.previousSticker}, ${preparation.enabledOn}, ${preparation.expiresOn})`;
    for (const row of draft.interventions.filter(
      (candidate) => candidate.performsPh,
    ))
      await tx.$executeRaw`INSERT INTO revisiones_cilindros (servicio_id, componente_id, crpc_id, fecha_ensayo, vence_el, resultado, numero_certificado) VALUES (${draft.id}, ${row.componentId}, ${row.crpcId}, ${row.testDate}, ${row.revisionExpiresOn}, ${row.phResult}, ${row.certificateNumber})`;
    return { id: configurationId, components: [...desired.values()] };
  }
  async configurations(
    tx: Prisma.TransactionClient,
    vehicleId: bigint,
  ): Promise<VehicleConfigurations> {
    const rows = await tx.$queryRaw<
      Configuration[]
    >`SELECT id, servicio_origen_id AS "serviceId", vigente_desde AS "validFrom", vigente_hasta AS "validUntil" FROM configuraciones WHERE vehiculo_id = ${vehicleId} ORDER BY vigente_desde DESC, id DESC`;
    const configurations = [];
    for (const row of rows)
      configurations.push({
        id: String(row.id),
        serviceId: row.serviceId === null ? null : String(row.serviceId),
        validFrom: row.validFrom.toISOString(),
        validUntil: row.validUntil?.toISOString() ?? null,
        components: (await this.members(tx, row.id)).map((member) => ({
          ...member,
          componentId: String(member.componentId),
          cylinderId:
            member.cylinderId === null ? null : String(member.cylinderId),
        })),
      });
    return {
      vehicleId: String(vehicleId),
      available: true,
      message: rows.length
        ? "Historia de configuraciones del equipo."
        : "Todavía no hay configuraciones confirmadas; esto no determina el equipo físico del vehículo.",
      currentConfigurationId:
        configurations.find((row) => row.validUntil === null)?.id ?? null,
      configurations,
    };
  }
}
