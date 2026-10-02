import { ApiProperty, OmitType } from "@nestjs/swagger";
import type {
  ServiceDraft,
  ServiceDraftItem,
  ServiceDraftPerson,
} from "@cilgas/contracts";
import { serviceTypes } from "../catalog/dto";
import {
  DraftItemDto,
  DraftPersonDto,
  InterventionDto,
  PreparationDto,
} from "./dto";

class DraftPersonSummaryDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) documentType!: string;
  @ApiProperty({ type: String }) documentNumber!: string;
}
class DraftVehicleSummaryDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) plate!: string;
  @ApiProperty({ type: String }) brand!: string;
  @ApiProperty({ type: String }) model!: string;
}
export class DraftPersonResponseDto
  extends DraftPersonDto
  implements ServiceDraftPerson
{
  @ApiProperty({ type: DraftPersonSummaryDto }) person!: DraftPersonSummaryDto;
}
export class DraftItemResponseDto
  extends OmitType(DraftItemDto, ["id", "componentId", "action"] as const)
  implements ServiceDraftItem
{
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, nullable: true }) catalogItemId!: string | null;
  @ApiProperty({ type: String, nullable: true }) componentId!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    enum: ["INSTALAR", "RETIRAR", "INSPECCIONAR", "ENSAYAR", "MANTENER"],
  })
  action!: ServiceDraftItem["action"];
  @ApiProperty({ type: String }) amount!: string;
}
export class ServiceDraftResponseDto implements ServiceDraft {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: String, enum: ["BORRADOR"] }) status!: "BORRADOR";
  @ApiProperty({ type: String }) vehicleId!: string;
  @ApiProperty({ type: DraftVehicleSummaryDto })
  vehicle!: DraftVehicleSummaryDto;
  @ApiProperty({ type: String }) catalogOfferId!: string;
  @ApiProperty({ type: String, format: "date" }) serviceDate!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String, enum: serviceTypes })
  type!: ServiceDraft["type"];
  @ApiProperty({
    type: String,
    nullable: true,
    enum: ["C", "M", "R", "D", "B"],
  })
  sheetOperation!: ServiceDraft["sheetOperation"];
  @ApiProperty({ type: Boolean }) includesPh!: boolean;
  @ApiProperty({ type: String }) totalAmount!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ type: String }) createdBy!: string;
  @ApiProperty({ type: String }) createdByName!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: string;
  @ApiProperty({ type: [DraftPersonResponseDto] })
  people!: DraftPersonResponseDto[];
  @ApiProperty({ type: [DraftItemResponseDto] }) items!: DraftItemResponseDto[];
  @ApiProperty({ type: PreparationDto, nullable: true })
  preparation!: PreparationDto | null;
  @ApiProperty({ type: [InterventionDto] }) interventions!: InterventionDto[];
}
export class ServiceDraftPageDto {
  @ApiProperty({ type: [ServiceDraftResponseDto] })
  items!: ServiceDraftResponseDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
