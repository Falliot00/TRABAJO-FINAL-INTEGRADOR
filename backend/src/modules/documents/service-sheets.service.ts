import { NotFoundException } from "@nestjs/common";
import type { ServiceSheet } from "@cilgas/contracts";
import type { Prisma } from "../../generated/prisma/client";
import type { DraftRow } from "../services/service-drafts.service";
export const jsonText = (value: unknown) =>
  JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "bigint" ? String(item) : item,
  );
export class ServiceSheetsService {
  async issue(
    tx: Prisma.TransactionClient,
    draft: DraftRow,
    content: object,
    actorId: bigint,
    now: Date,
  ) {
    const [row] = await tx.$queryRaw<
      { id: bigint }[]
    >`INSERT INTO fichas (servicio_id, version, plantilla_version, snapshot_version, contenido, pec_id, tdm_id, emitida_por, emitida_en) VALUES (${draft.id}, 1, 'ficha-v2', 2, ${jsonText(content)}::jsonb, ${draft.preparation!.pecId}, ${draft.preparation!.tdmId}, ${actorId}, ${now}) RETURNING id`;
    for (const item of draft.interventions)
      await tx.$executeRaw`INSERT INTO ficha_componentes (ficha_id, tipo, renglon, componente_id, codigo_homologacion, numero_serie, condicion, accion, fabricacion_mes, revision_mes, crpc_codigo, descripcion, cilindro_id) VALUES (${row.id}, ${item.type}, ${item.row}, ${item.componentId}, ${item.homologationCode}, ${item.serialNumber}, ${item.condition}, ${item.action}, ${item.manufactureMonth}, ${item.revisionMonth}, (SELECT codigo FROM actores_regulatorios WHERE id = ${item.crpcId}), ${item.description}, ${item.cylinderId})`;
    return row.id;
  }
  async get(
    tx: Prisma.TransactionClient,
    serviceId: bigint,
  ): Promise<ServiceSheet> {
    const rows = await tx.$queryRaw<
      (Omit<ServiceSheet, "issuedAt"> & { issuedAt: Date })[]
    >`SELECT id::text, servicio_id::text AS "serviceId", version, plantilla_version AS "templateVersion", snapshot_version AS "snapshotVersion", pdf_estado AS "pdfStatus", emitida_en AS "issuedAt", contenido AS content FROM fichas WHERE servicio_id = ${serviceId} ORDER BY version DESC LIMIT 1`;
    if (!rows[0]) throw new NotFoundException("Ficha no encontrada.");
    return { ...rows[0], issuedAt: rows[0].issuedAt.toISOString() };
  }
}
