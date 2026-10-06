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
