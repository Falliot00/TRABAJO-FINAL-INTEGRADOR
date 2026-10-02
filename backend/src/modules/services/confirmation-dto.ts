import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
} from "class-validator";
import type { ConfirmServiceRequest } from "@cilgas/contracts";
export class ConfirmServiceDto implements ConfirmServiceRequest {
  @ApiProperty({ type: Number }) @IsInt() @Min(1) version!: number;
  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  idempotencyKey!: string;
  @ApiProperty({ type: String, nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  expectedConfigurationId!: string | null;
}
