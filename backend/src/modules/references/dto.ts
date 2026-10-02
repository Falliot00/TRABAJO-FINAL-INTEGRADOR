import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import type { ComponentType, RegulatoryActorType } from "@cilgas/contracts";
import {
  emailText,
  identifierText,
  trimText,
  upperText,
} from "../../common/master-data";

export class WorkshopDto {
  @ApiProperty({ type: String, maxLength: 180 })
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(identifierText)
  @IsString()
  @Length(11, 11)
  cuit?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 220)
  address?: string | null;

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
  @Length(1, 40)
  phone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emailText)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  tdmId?: string | null;
}
export class UpdateWorkshopDto extends PartialType(WorkshopDto, {
  skipNullProperties: false,
}) {}

export class RegulatoryActorDto {
  @ApiProperty({ type: String, enum: ["PEC", "TDM", "CRPC"] })
  @IsIn(["PEC", "TDM", "CRPC"])
  type!: RegulatoryActorType;
  @ApiProperty({ type: String, maxLength: 40 })
  @Transform(upperText)
  @IsString()
  @Length(1, 40)
  code!: string;
  @ApiProperty({ type: String, maxLength: 180 })
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  name!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(identifierText)
  @IsString()
  @Length(11, 11)
  cuit?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 220)
  address?: string | null;
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
  @Length(1, 40)
  phone?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 140)
  technicalResponsible?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 40)
  responsibleLicense?: string | null;
  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
export class UpdateRegulatoryActorDto extends PartialType(RegulatoryActorDto, {
  skipNullProperties: false,
}) {}

export class ComponentModelDto {
  @ApiProperty({ type: String, enum: ["CILINDRO", "VALVULA", "REGULADOR"] })
  @IsIn(["CILINDRO", "VALVULA", "REGULADOR"])
  type!: ComponentType;
  @ApiProperty({ type: String, maxLength: 50 })
  @Transform(upperText)
  @IsString()
  @Length(1, 50)
  homologationCode!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 100)
  brand?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 100)
  model?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: "^\\d{1,5}(\\.\\d{1,2})?$",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,5}(\.\d{1,2})?$/)
  capacityLiters?: string | null;
  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
export class UpdateComponentModelDto extends PartialType(ComponentModelDto, {
  skipNullProperties: false,
}) {}
