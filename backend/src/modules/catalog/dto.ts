import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import type { CatalogItemType, ServiceType } from "@cilgas/contracts";
import { trimText, upperText } from "../../common/master-data";

export const serviceTypes = [
  "REVISION_ANUAL",
  "REVISION_QUINQUENAL",
  "CONVERSION",
  "MODIFICACION",
  "DESMONTAJE",
  "OTRO",
];
export const itemTypes = [
  "COMPONENTE",
  "INSPECCION",
  "ENSAYO_PH",
  "OBLEA",
  "MANO_OBRA",
  "ACCESORIO",
  "OTRO",
];
const moneyPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
export class CatalogItemDto {
  @ApiPropertyOptional({
    type: String,
    description: "Identidad del ítem que se conserva al editar la oferta.",
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  id?: string;
  @ApiProperty({ type: Number, minimum: 1, maximum: 32767 })
  @IsInt()
  @Min(1)
  @Max(32767)
  order!: number;
  @ApiProperty({ type: String, maxLength: 180 })
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  description!: string;
  @ApiProperty({ type: String, enum: itemTypes })
  @IsIn(itemTypes)
  type!: CatalogItemType;
  @ApiProperty({
    type: String,
    description: "Cantidad decimal positiva de hasta dos decimales.",
  })
  @IsString()
  @Matches(/^(?!0(?:\.0{1,2})?$)(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/)
  quantity!: string;
  @ApiProperty({
    type: String,
    description: "Importe ARS exacto, no negativo, de hasta dos decimales.",
  })
  @IsString()
  @Matches(moneyPattern)
  unitPrice!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  supplierId?: string | null;
  @ApiProperty({
    type: String,
    description: "Costo sugerido ARS exacto; no genera obligación ni pago.",
  })
  @IsString()
  @Matches(moneyPattern)
  unitCost!: string;
}
export class CatalogOfferDto {
  @ApiProperty({ type: String, maxLength: 40 })
  @Transform(upperText)
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  code!: string;
  @ApiProperty({ type: String, maxLength: 140 })
  @Transform(trimText)
  @IsString()
  @Length(1, 140)
  name!: string;
  @ApiProperty({ type: String, maxLength: 4000 })
  @Transform(trimText)
  @IsString()
  @Length(1, 4000)
  description!: string;
  @ApiProperty({ type: String, enum: serviceTypes })
  @IsIn(serviceTypes)
  type!: ServiceType;
  @ApiProperty({
    type: String,
    description: "Precio propuesto ARS exacto, hasta dos decimales.",
  })
  @IsString()
  @Matches(moneyPattern)
  suggestedPrice!: string;
  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
  @ApiProperty({ type: [CatalogItemDto], maxItems: 100 })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CatalogItemDto)
  items!: CatalogItemDto[];
}
export class UpdateCatalogOfferDto extends PartialType(CatalogOfferDto, {
  skipNullProperties: false,
}) {}
export class CatalogDuplicatesQueryDto {
  @Transform(upperText)
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  code!: string;
  @IsOptional() @IsString() @Matches(/^[1-9]\d{0,18}$/) excludeId?: string;
}
