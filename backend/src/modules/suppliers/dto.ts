import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { emailText, identifierText, trimText } from "../../common/master-data";

export class SupplierDto {
  @ApiProperty({ type: String, maxLength: 180 })
  @Transform(trimText)
  @IsString()
  @Length(1, 180)
  name!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(identifierText)
  @IsString()
  @Matches(/^\d{11}$/)
  cuit?: string | null;
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
  @Transform(trimText)
  @IsString()
  @Length(1, 2000)
  notes?: string | null;
  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
export class UpdateSupplierDto extends PartialType(SupplierDto, {
  skipNullProperties: false,
}) {}
export class SupplierDuplicatesQueryDto {
  @Transform(identifierText) @IsString() @Matches(/^\d{11}$/) cuit!: string;
  @IsOptional() @IsString() @Matches(/^[1-9]\d{0,18}$/) excludeId?: string;
}
