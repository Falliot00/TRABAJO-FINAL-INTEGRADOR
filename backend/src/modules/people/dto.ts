import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import type {
  DocumentType,
  PersonType,
  VehicleType,
  VehiclePersonRole,
} from "@cilgas/contracts";
import { emailText, identifierText, trimText } from "../../common/master-data";

export class PersonDto {
  @ApiProperty({ type: String, enum: ["FISICA", "JURIDICA"] })
  @IsIn(["FISICA", "JURIDICA"])
  type!: PersonType;
  @ApiProperty({ type: String, maxLength: 180 })
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  name!: string;
  @ApiProperty({
    type: String,
    enum: ["DNI", "CUIT", "CUIL", "PASAPORTE", "OTRO"],
  })
  @IsIn(["DNI", "CUIT", "CUIL", "PASAPORTE", "OTRO"])
  documentType!: DocumentType;
  @ApiProperty({ type: String, maxLength: 30 })
  @Transform(identifierText)
  @IsString()
  @Length(3, 30)
  @Matches(/^[A-Z0-9]+$/)
  documentNumber!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  street?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 20)
  streetNumber?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 40)
  floorApartment?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 100)
  locality?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 100)
  province?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 15)
  postalCode?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 40)
  phone?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emailText)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
export class UpdatePersonDto extends PartialType(PersonDto, {
  skipNullProperties: false,
}) {}

export class PersonDuplicatesQueryDto {
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(180)
  name?: string;
  @IsOptional()
  @IsIn(["DNI", "CUIT", "CUIL", "PASAPORTE", "OTRO"])
  documentType?: DocumentType;
  @IsOptional()
  @Transform(identifierText)
  @IsString()
  @MaxLength(30)
  documentNumber?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  excludeId?: string;
}

export class VehicleDto {
  @ApiProperty({
    type: String,
    description: "Dominio argentino, convencional o Mercosur.",
  })
  @Transform(identifierText)
  @IsString()
  @Matches(
    /^(?:[A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|\d{3}[A-Z]{3}|[A-Z]\d{3}[A-Z]{3})$/,
  )
  plate!: string;
  @ApiProperty({ type: String, maxLength: 80 })
  @Transform(trimText)
  @IsString()
  @Length(1, 80)
  brand!: string;
  @ApiProperty({ type: String, maxLength: 100 })
  @Transform(trimText)
  @IsString()
  @Length(1, 100)
  model!: string;
  @ApiProperty({ type: Number, minimum: 1900, maximum: 2200 })
  @IsInt()
  @Min(1900)
  @Max(2200)
  year!: number;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 80)
  engineNumber?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 80)
  chassisNumber?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["TAXI", "PICKUP", "PARTICULAR", "BUS", "OFICIAL", "OTROS"],
  })
  @IsOptional()
  @IsIn(["TAXI", "PICKUP", "PARTICULAR", "BUS", "OFICIAL", "OTROS"])
  type?: VehicleType | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 100)
  otherTypeDetail?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 60)
  usage?: string | null;
  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @IsBoolean()
  injection?: boolean | null;
  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
export class UpdateVehicleDto extends PartialType(VehicleDto, {
  skipNullProperties: false,
}) {}
export class VehicleDuplicatesQueryDto {
  @Transform(identifierText)
  @IsString()
  @MaxLength(15)
  plate!: string;
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  excludeId?: string;
}

export class VehicleRelationshipDto {
  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  personId!: string;
  @ApiProperty({ type: String, enum: ["TITULAR", "CONTACTO"] })
  @IsIn(["TITULAR", "CONTACTO"])
  role!: VehiclePersonRole;
  @ApiProperty({ type: String, format: "date" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;
}
export class CloseVehicleRelationshipDto {
  @ApiProperty({
    type: String,
    format: "date",
    description: "Fin exclusivo del vínculo.",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  until!: string;
}
