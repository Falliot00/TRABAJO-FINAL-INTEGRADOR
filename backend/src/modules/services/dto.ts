import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { BadRequestException } from "@nestjs/common";
import type {
  ServiceDraftCostInput,
  ServiceDraftItemInput,
  ServiceDraftPersonInput,
  ServiceInterventionInput,
  ServicePreparationInput,
  UpdateServiceDraftRequest,
} from "@cilgas/contracts";
import { trimText } from "../../common/master-data";
import { itemTypes, serviceTypes } from "../catalog/dto";

const idPattern = /^[1-9]\d{0,18}$/;
const moneyPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export class CreateServiceDraftDto {
  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  vehicleId!: string;
  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  catalogOfferId!: string;
  @ApiProperty({ type: String, format: "date" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  serviceDate!: string;
}

export class DraftPersonDto implements ServiceDraftPersonInput {
  @ApiProperty({ type: String, enum: ["TITULAR", "CONTACTO", "PAGADOR"] })
  @IsIn(["TITULAR", "CONTACTO", "PAGADOR"])
  role!: ServiceDraftPersonInput["role"];
  @ApiProperty({ type: String })
  @IsString()
  @Matches(idPattern)
  personId!: string;
}
export class DraftCostDto implements ServiceDraftCostInput {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(idPattern)
  supplierId?: string | null;
  @ApiProperty({ type: String })
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  concept!: string;
  @ApiProperty({ type: String, enum: ["PROVEEDOR", "ABSORBIDO"] })
  @IsIn(["PROVEEDOR", "ABSORBIDO"])
  treatment!: "PROVEEDOR" | "ABSORBIDO";
  @ApiProperty({ type: String })
  @IsString()
  @Matches(moneyPattern)
  amount!: string;
}
export class DraftItemDto implements ServiceDraftItemInput {
  @ApiPropertyOptional({ type: String })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Matches(idPattern)
  id?: string;
  @ApiProperty({ type: Number }) @IsInt() @Min(1) @Max(32767) order!: number;
  @ApiProperty({ type: String })
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  description!: string;
  @ApiProperty({ type: String, enum: itemTypes })
  @IsIn(itemTypes)
  type!: ServiceDraftItemInput["type"];
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(idPattern)
  componentId?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["INSTALAR", "RETIRAR", "INSPECCIONAR", "ENSAYAR", "MANTENER"],
  })
  @IsOptional()
  @IsIn(["INSTALAR", "RETIRAR", "INSPECCIONAR", "ENSAYAR", "MANTENER"])
  action?: ServiceDraftItemInput["action"];
  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^(?!0(?:\.0{1,2})?$)(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/)
  quantity!: string;
  @ApiProperty({ type: String })
  @IsString()
  @Matches(moneyPattern)
  unitPrice!: string;
  @ApiProperty({ type: String })
  @IsString()
  @Matches(moneyPattern)
  discount!: string;
  @ApiPropertyOptional({ type: [DraftCostDto] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => DraftCostDto)
  costs?: DraftCostDto[];
}
export class PreparationDto implements ServicePreparationInput {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(idPattern)
  pecId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(idPattern)
  tdmId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 40)
  previousSticker?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 40)
  newSticker?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: "date" })
  @IsOptional()
  @IsString()
  @Matches(dayPattern)
  enabledOn?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: "date" })
  @IsOptional()
  @IsString()
  @Matches(dayPattern)
  expiresOn?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 4000)
  notes?: string | null;
}
export class InterventionDto implements ServiceInterventionInput {
  @ApiProperty({
    type: String,
    enum: ["REGULADOR", "CILINDRO", "VALVULA", "ACCESORIO"],
  })
  @IsIn(["REGULADOR", "CILINDRO", "VALVULA", "ACCESORIO"])
  type!: ServiceInterventionInput["type"];
  @ApiProperty({ type: Number }) @IsInt() @Min(1) @Max(32767) row!: number;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(idPattern)
  componentId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 50)
  homologationCode?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 80)
  serialNumber?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 30)
  condition?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["M", "S", "D", "B"],
  })
  @IsOptional()
  @IsIn(["M", "S", "D", "B"])
  action?: ServiceInterventionInput["action"];
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  finalPosition?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(monthPattern)
  manufactureMonth?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(monthPattern)
  revisionMonth?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(idPattern)
  crpcId?: string | null;
  @ApiProperty({ type: Boolean }) @IsBoolean() performsPh!: boolean;
  @ApiPropertyOptional({ type: String, nullable: true, format: "date" })
  @IsOptional()
  @IsString()
  @Matches(dayPattern)
  testDate?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: "date" })
  @IsOptional()
  @IsString()
  @Matches(dayPattern)
  revisionExpiresOn?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["APROBADO", "RECHAZADO"],
  })
  @IsOptional()
  @IsIn(["APROBADO", "RECHAZADO"])
  phResult?: ServiceInterventionInput["phResult"];
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 80)
  certificateNumber?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  description?: string | null;
}
export class UpdateServiceDraftDto implements UpdateServiceDraftRequest {
  @ApiProperty({ type: Number })
  @IsInt()
  @Min(1)
  @Max(2147483646)
  version!: number;
  @ApiPropertyOptional({ type: String })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Matches(idPattern)
  vehicleId?: string;
  @ApiPropertyOptional({ type: String, format: "date" })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Matches(dayPattern)
  serviceDate?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf((_o, v) => v !== undefined)
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  description?: string;
  @ApiPropertyOptional({ type: String, enum: serviceTypes })
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(serviceTypes)
  type?: UpdateServiceDraftRequest["type"];
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["C", "M", "R", "D", "B"],
  })
  @IsOptional()
  @IsIn(["C", "M", "R", "D", "B"])
  sheetOperation?: UpdateServiceDraftRequest["sheetOperation"];
  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_o, v) => v !== undefined)
  @IsBoolean()
  includesPh?: boolean;
  @ApiPropertyOptional({ type: String })
  @ValidateIf((_o, v) => v !== undefined)
  @IsString()
  @Matches(moneyPattern)
  totalAmount?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 4000)
  notes?: string | null;
  @ApiPropertyOptional({ type: [DraftPersonDto] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(3)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => DraftPersonDto)
  people?: DraftPersonDto[];
  @ApiPropertyOptional({ type: [DraftItemDto] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => DraftItemDto)
  items?: DraftItemDto[];
  @ApiPropertyOptional({ type: PreparationDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreparationDto)
  preparation?: PreparationDto | null;
  @ApiPropertyOptional({ type: [InterventionDto] })
  @ValidateIf((_o, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => InterventionDto)
  interventions?: InterventionDto[];
}

export function dateValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const result = new Date(`${value}T00:00:00.000Z`);
  if (
    value.startsWith("0000-") ||
    !Number.isFinite(result.getTime()) ||
    result.toISOString().slice(0, 10) !== value
  )
    throw new BadRequestException("Indique una fecha válida.");
  return result;
}
