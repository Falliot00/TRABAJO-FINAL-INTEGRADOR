import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Prisma } from "../generated/prisma/client";
import { parseId } from "../modules/identity/dto";
import type { Page } from "@cilgas/contracts";

export const trimText = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
export const upperText = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;
export const emailText = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;
export const identifierText = ({ value }: { value: unknown }) =>
  typeof value === "string"
    ? value
        .trim()
        .toUpperCase()
        .replace(/[.\s-]/g, "")
    : value;

export function validateTaxId(value: string | null | undefined) {
  if (value == null) return;
  if (!/^\d{11}$/.test(value))
    throw new BadRequestException(
      "El CUIT/CUIL debe contener once dígitos y un verificador válido.",
    );
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const remainder =
    11 -
    (weights.reduce(
      (total, weight, index) => total + Number(value[index]) * weight,
      0,
    ) %
      11);
  const check = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;
  if (Number(value[10]) !== check)
    throw new BadRequestException(
      "El CUIT/CUIL tiene un dígito verificador incorrecto.",
    );
}

export interface ListQuery {
  q: string;
  limit: number;
  cursor?: bigint;
  active?: boolean;
  type?: string;
  personId?: bigint;
}
export function parseListQuery(
  query: Record<string, unknown>,
  extraKeys: string[] = [],
): ListQuery {
  if (
    Object.entries(query).some(
      ([key, value]) =>
        !["q", "limit", "cursor", "active", ...extraKeys].includes(key) ||
        typeof value !== "string",
    )
  )
    throw new BadRequestException("Filtros de búsqueda no válidos.");
  const q = ((query.q as string | undefined) ?? "").trim();
  if (
    q.length > 180 ||
    (query.limit !== undefined &&
      !/^(?:[1-9]\d?|100)$/.test(query.limit as string)) ||
    (query.active !== undefined &&
      !["true", "false"].includes(query.active as string))
  )
    throw new BadRequestException("Filtros de búsqueda no válidos.");
  return {
    q,
    limit: query.limit === undefined ? 25 : Number(query.limit),
    cursor:
      query.cursor === undefined ? undefined : parseId(query.cursor as string),
    active: query.active === undefined ? undefined : query.active === "true",
    type: query.type as string | undefined,
    personId:
      query.personId === undefined
        ? undefined
        : parseId(query.personId as string),
  };
}
export function pageOf<T extends { id: string }>(
  rows: T[],
  limit: number,
): Page<T> {
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
}

// Master records allow explicit null to clear optional fields; access DTOs remain unchanged.
export function parseMasterBody<T extends object>(
  type: new () => T,
  input: unknown,
): T {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !Object.keys(input).length
  ) {
    throw new BadRequestException("Indique los datos que desea guardar.");
  }
  const dto = plainToInstance(type, input);
  if (
    validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length
  ) {
    throw new BadRequestException(
      "Revise los datos ingresados y sus formatos.",
    );
  }
  return dto;
}

export function masterDataError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      throw new ConflictException(
        "Ya existe un registro con ese identificador. Recupérelo antes de crear otro.",
      );
    if (error.code === "P2025")
      throw new NotFoundException("Registro no encontrado.");
    if (error.code === "P2003")
      throw new ConflictException(
        "La referencia está vinculada a otros registros y no admite ese cambio.",
      );
  }
  throw error;
}
