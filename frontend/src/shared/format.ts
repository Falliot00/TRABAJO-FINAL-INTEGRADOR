import type { RoleCode } from "@cilgas/contracts";

const workshopDateTime = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function workshopInstant(value: string) {
  return workshopDateTime.format(new Date(value));
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export function roleName(role: RoleCode) {
  return role === "ADMINISTRADOR" ? "Administrador" : "Operador";
}
