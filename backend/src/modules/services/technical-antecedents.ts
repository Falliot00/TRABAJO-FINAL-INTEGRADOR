import type { Prisma } from "../../generated/prisma/client";
import { monthEnd } from "./dto";

type PhAntecedent = {
  date: string | null;
  result: string | null;
  expires: Date | null;
  crpcId: bigint | null;
  serviceDate: Date | null;
  recordedAt: Date;
  source: "SERVICE" | "SURVEY";
  recordId: bigint;
};

/** La PH acompaña al cilindro. Nunca combina campos de antecedentes distintos. */
export async function latestPhAntecedent(
  tx: Prisma.TransactionClient,
  componentId: bigint,
) {
  const rows = await tx.$queryRaw<
    PhAntecedent[]
  >`SELECT r.fecha_ensayo AS date, r.resultado AS result, r.vence_el AS expires, r.crpc_id AS "crpcId", s.fecha_servicio AS "serviceDate", s.confirmado_en AS "recordedAt", 'SERVICE' AS source, r.id AS "recordId" FROM revisiones_cilindros r JOIN servicios s ON s.id = r.servicio_id WHERE r.componente_id = ${componentId}
    UNION ALL SELECT a.fecha_ensayo, a.resultado, a.vence_el, a.crpc_id, NULL, r.registrado_en, 'SURVEY', r.configuracion_id FROM antecedentes_ph_relevados a JOIN relevamientos_iniciales r ON r.configuracion_id = a.configuracion_id WHERE a.componente_id = ${componentId}`;
  const byRecording = (a: PhAntecedent, b: PhAntecedent) =>
    b.recordedAt.getTime() - a.recordedAt.getTime() ||
    (a.recordId === b.recordId ? 0 : a.recordId > b.recordId ? -1 : 1);
  // Los servicios ya tienen un orden de hechos conocido, aun con ensayo mensual.
  const service = rows
    .filter((row) => row.source === "SERVICE")
    .sort(
      (a, b) =>
        b.date!.slice(0, 7).localeCompare(a.date!.slice(0, 7)) ||
        b.serviceDate!.getTime() - a.serviceDate!.getTime() ||
        byRecording(a, b),
    )[0];
  const surveys = rows.filter(
    (row) =>
      row.source === "SURVEY" &&
      !(
        service &&
        service.recordedAt > row.recordedAt &&
        (!row.date ||
          service.date!.slice(
            0,
            row.date.length === 10 && service.date!.length === 10 ? 10 : 7,
          ) >=
            row.date.slice(
              0,
              row.date.length === 10 && service.date!.length === 10 ? 10 : 7,
            ))
      ),
  );
  // Los límites sólo se usan para comparar rangos; nunca se guardan como fecha de ensayo.
  const dated = [...(service ? [service] : []), ...surveys].flatMap((row) =>
    row.date
      ? [
          {
            row,
            lower: row.date.length === 7 ? `${row.date}-01` : row.date,
            upper:
              row.date.length === 7
                ? monthEnd(row.date).toISOString().slice(0, 10)
                : row.date,
          },
        ]
      : [],
  );
  dated.sort(
    (a, b) =>
      b.upper.localeCompare(a.upper) ||
      b.lower.localeCompare(a.lower) ||
      b.row.source.localeCompare(a.row.source) ||
      byRecording(a.row, b.row),
  );
  const selected = dated[0];
  if (!selected) {
    const unknown = surveys.sort(byRecording)[0];
    return unknown ? { ...unknown, ambiguous: false } : null;
  }
  const prior = selected.row;
  const ambiguous =
    surveys.some((row) => !row.date && row.recordedAt >= prior.recordedAt) ||
    dated.some(
      (other) =>
        other.row !== prior &&
        other.lower <= selected.upper &&
        selected.lower <= other.upper &&
        (other.row.result !== prior.result ||
          other.row.crpcId !== prior.crpcId),
    );
  return { ...prior, ambiguous };
}

export async function latestStickerAntecedent(
  tx: Prisma.TransactionClient,
  vehicleId: bigint,
) {
  const [sticker] = await tx.$queryRaw<
    { number: string | null; enabled: Date | null; expires: Date | null }[]
  >`SELECT number, enabled, expires FROM (
    SELECT o.numero AS number, o.habilitada_el AS enabled, o.vence_el AS expires, 1 AS priority, s.confirmado_en AS recorded FROM obleas o JOIN servicios s ON s.id = o.servicio_id WHERE s.vehiculo_id = ${vehicleId}
    UNION ALL SELECT a.numero, a.habilitada_el, a.vence_el, 0, r.registrado_en FROM antecedentes_oblea_relevados a JOIN relevamientos_iniciales r ON r.configuracion_id = a.configuracion_id WHERE r.vehiculo_id = ${vehicleId}
  ) history ORDER BY priority DESC, enabled DESC NULLS LAST, recorded DESC LIMIT 1`;
  return sticker ?? null;
}
