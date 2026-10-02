import { BadRequestException } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { plainToInstance, Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  validateSync,
} from "class-validator";
import type { RoleCode } from "@cilgas/contracts";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const email = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class LoginDto {
  @ApiProperty({ type: String, maxLength: 254 })
  @Transform(email)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 128, writeOnly: true })
  @IsString()
  @Length(1, 128)
  password!: string;
}

export class CreateUserDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ type: String, maxLength: 254 })
  @Transform(email)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ type: String, minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @Length(12, 128)
  password!: string;

  @ApiProperty({ type: String, enum: ["ADMINISTRADOR", "OPERADOR"] })
  @IsIn(["ADMINISTRADOR", "OPERADOR"])
  role!: RoleCode;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ type: String, enum: ["ADMINISTRADOR", "OPERADOR"] })
  @IsOptional()
  @IsIn(["ADMINISTRADOR", "OPERADOR"])
  role?: RoleCode;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export function parseBody<T extends object>(
  type: new () => T,
  input: unknown,
): T {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.values(input).includes(null)
  ) {
    throw new BadRequestException("Revise los datos ingresados.");
  }
  const dto = plainToInstance(type, input);
  if (
    validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length
  ) {
    throw new BadRequestException("Revise los datos ingresados.");
  }
  return dto;
}

export function parseId(value: string): bigint {
  if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
    throw new BadRequestException("Identificador no válido.");
  }
  return BigInt(value);
}
