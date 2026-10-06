import type { Prisma } from "../../generated/prisma/client";

type PhAntecedent = {
  date: string | null;
  result: string | null;
  expires: Date | null;
  crpcId: bigint | null;
  serviceDate: Date | null;
  recordedAt: Date;
  source: "SERVICE" | "SURVEY";
};

/** La PH acompaña al cilindro. Nunca combina campos de antecedentes distintos. */
export async function latestPhAntecedent(
  tx: Prisma.TransactionClient,
  componentId: bigint,
) {
  const rows = await tx.$queryRaw<
    PhAntecedent[]
  >`SELECT r.fecha_ensayo AS date, r.resultado AS result, r.vence_el AS expires, r.crpc_id AS "crpcId", s.fecha_servicio AS "serviceDate", s.confirmado_en AS "recordedAt", 'SERVICE' AS source FROM revisiones_cilindros r JOIN servicios s ON s.id = r.servicio_id WHERE r.componente_id = ${componentId}
    UNION ALL SELECT a.fecha_ensayo, a.resultado, a.vence_el, a.crpc_id, NULL, r.registrado_en, 'SURVEY' FROM antecedentes_ph_relevados a JOIN relevamientos_iniciales r ON r.configuracion_id = a.configuracion_id WHERE a.componente_id = ${componentId}`;
  const candidates = rows.filter(
    (candidate) =>
      candidate.source !== "SURVEY" ||
      !rows.some(
        (other) =>
          other.source === "SERVICE" &&
          other.recordedAt > candidate.recordedAt &&
          other.date &&
          candidate.date &&
          other.date.slice(0, 7) >= candidate.date.slice(0, 7),
      ),
  );
  candidates.sort((a, b) => {
    if (!a.date || !b.date)
      return b.recordedAt.getTime() - a.recordedAt.getTime();
    const month = b.date.slice(0, 7).localeCompare(a.date.slice(0, 7));
    if (month) return month;
    if (a.source === "SERVICE" && b.source === "SERVICE")
      return (
        b.serviceDate!.getTime() - a.serviceDate!.getTime() ||
        b.recordedAt.getTime() - a.recordedAt.getTime()
      );
    if (a.date.length === 10 && b.date.length === 10 && a.date !== b.date)
      return b.date.localeCompare(a.date);
    if (a.source !== b.source) return a.source === "SERVICE" ? -1 : 1;
    return b.recordedAt.getTime() - a.recordedAt.getTime();
  });
  const prior = candidates[0];
  if (!prior) return null;
  const ambiguous = candidates.some(
    (other) =>
      other !== prior &&
      (prior.source === "SURVEY" || other.source === "SURVEY") &&
      prior.date &&
      other.date &&
      prior.date.slice(0, 7) === other.date.slice(0, 7) &&
      (prior.date.length === 7 || other.date.length === 7) &&
      (other.result !== prior.result || other.crpcId !== prior.crpcId),
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
