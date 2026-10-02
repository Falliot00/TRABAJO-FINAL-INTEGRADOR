import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";
import type { ComponentType } from "@cilgas/contracts";
import { identifierText, trimText } from "../../common/master-data";

export class ComponentDto {
  @ApiProperty({ type: String })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  modelId!: string;

  @ApiProperty({ type: String, enum: ["CILINDRO", "VALVULA", "REGULADOR"] })
  @IsIn(["CILINDRO", "VALVULA", "REGULADOR"])
  type!: ComponentType;

  @ApiProperty({ type: String, maxLength: 80 })
  @Transform(identifierText)
  @IsString()
  @Length(1, 80)
  serialNumber!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: "2020-02",
    description: "Mes y año de fabricación (YYYY-MM).",
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/)
  manufactureMonth?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 4000 })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 4000)
  notes?: string | null;
}

export class UpdateComponentDto extends PartialType(ComponentDto, {
  skipNullProperties: false,
}) {}

export class ComponentDuplicatesQueryDto {
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  modelId!: string;

  @Transform(identifierText)
  @IsString()
  @Length(1, 80)
  serialNumber!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  excludeId?: string;
}
