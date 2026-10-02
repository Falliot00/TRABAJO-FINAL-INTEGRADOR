import type { RoleCode } from "@cilgas/contracts";

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
