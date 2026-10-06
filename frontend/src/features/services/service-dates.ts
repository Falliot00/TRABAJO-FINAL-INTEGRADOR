import type { ServiceInterventionInput } from "@cilgas/contracts";

export function expirationAtMonthEnd(
  value: string | null | undefined,
  years: number,
) {
  if (!value || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) return null;
  const year = Number(value.slice(0, 4)) + years;
  const month = Number(value.slice(5, 7));
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
}
export function phExpiration(
  intervention: Pick<
    ServiceInterventionInput,
    "performsPh" | "phResult" | "testDate" | "revisionMonth"
  >,
) {
  if (intervention.performsPh && intervention.phResult === "RECHAZADO")
    return null;
  return expirationAtMonthEnd(
    intervention.performsPh
      ? intervention.testDate
      : intervention.revisionMonth,
    5,
  );
}
