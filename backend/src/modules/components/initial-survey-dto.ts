import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import type {
  InitialEquipmentSurveyInput,
  KnownPhAntecedentInput,
  KnownStickerAntecedentInput,
} from "@cilgas/contracts";
import { trimText } from "../../common/master-data";

const id = /^[1-9]\d{0,18}$/;
const day = /^(?!0000)\d{4}-(0[1-9]|1[0-2])-\d{2}$/;
export class KnownPhAntecedentDto implements KnownPhAntecedentInput {
  @ApiPropertyOptional({ type: String, nullable: true, example: "2024-09" })
  @IsOptional()
  @IsString()
  @Matches(/^(?!0000)\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/)
  testDate?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: "date" })
  @IsOptional()
  @IsString()
  @Matches(day)
  expiresOn?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(id)
  crpcId?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["APROBADO", "RECHAZADO"],
  })
  @IsOptional()
  @IsIn(["APROBADO", "RECHAZADO"])
  result?: "APROBADO" | "RECHAZADO" | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 80)
  certificateNumber?: string | null;
}
export class KnownStickerAntecedentDto implements KnownStickerAntecedentInput {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 40)
  number?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: "date" })
  @IsOptional()
  @IsString()
  @Matches(day)
  enabledOn?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: "date" })
  @IsOptional()
  @IsString()
  @Matches(day)
  expiresOn?: string | null;
}
export class InitialSurveyPairDto {
  @ApiProperty({ type: Number, minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  position!: number;
  @ApiProperty({ type: String }) @IsString() @Matches(id) cylinderId!: string;
  @ApiProperty({ type: String }) @IsString() @Matches(id) valveId!: string;
  @ApiPropertyOptional({ type: KnownPhAntecedentDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => KnownPhAntecedentDto)
  ph?: KnownPhAntecedentDto | null;
}
export class InitialEquipmentSurveyDto implements InitialEquipmentSurveyInput {
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  idempotencyKey!: string;
  @ApiProperty({ type: String }) @IsString() @Matches(id) regulatorId!: string;
  @ApiProperty({ type: [InitialSurveyPairDto], minItems: 1, maxItems: 4 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => InitialSurveyPairDto)
  pairs!: InitialSurveyPairDto[];
  @ApiPropertyOptional({ type: KnownStickerAntecedentDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => KnownStickerAntecedentDto)
  sticker?: KnownStickerAntecedentDto | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(1, 4000)
  notes?: string | null;
}
