import { ApiProperty, OmitType } from "@nestjs/swagger";
import type {
  ConfirmationBlocker,
  ConfirmedService,
  ServiceConfirmationCheck,
  ServiceSheet,
  SupplierObligation,
} from "@cilgas/contracts";
import { ServiceDraftResponseDto } from "./responses";

class ConfirmationBlockerDto implements ConfirmationBlocker {
  @ApiProperty({ type: String }) code!: string;
  @ApiProperty({ type: String }) message!: string;
}

export class ServiceConfirmationCheckDto implements ServiceConfirmationCheck {
  @ApiProperty({ type: String }) serviceId!: string;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: String, nullable: true })
  currentConfigurationId!: string | null;
  @ApiProperty({ type: Boolean }) canConfirm!: boolean;
  @ApiProperty({ type: [ConfirmationBlockerDto] })
  blockers!: ConfirmationBlockerDto[];
}

export class ConfirmedServiceDto
  extends OmitType(ServiceDraftResponseDto, ["status"] as const)
  implements ConfirmedService
{
  @ApiProperty({ type: String, enum: ["CONFIRMADO"] }) status!: "CONFIRMADO";
  @ApiProperty({ type: String }) confirmedBy!: string;
  @ApiProperty({ type: String, format: "date-time" }) confirmedAt!: string;
  @ApiProperty({ type: String, nullable: true })
  configurationId!: string | null;
  @ApiProperty({ type: String }) sheetId!: string;
  @ApiProperty({ type: String, enum: ["PENDIENTE"] }) pdfStatus!: "PENDIENTE";
}

export class ConfirmedServicesPageDto {
  @ApiProperty({ type: [ConfirmedServiceDto] }) items!: ConfirmedServiceDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}

export class ServiceSheetDto implements ServiceSheet {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) serviceId!: string;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: String }) templateVersion!: string;
  @ApiProperty({ type: Number }) snapshotVersion!: number;
  @ApiProperty({ type: String, enum: ["PENDIENTE"] }) pdfStatus!: "PENDIENTE";
  @ApiProperty({ type: String, format: "date-time" }) issuedAt!: string;
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description:
      "Snapshot autocontenido e inmutable según snapshotVersion. Los identificadores y meses se conservan como texto; no incluye costos ni obligaciones.",
  })
  content!: ServiceSheet["content"];
}

export class SupplierObligationDto implements SupplierObligation {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) serviceId!: string;
  @ApiProperty({ type: String }) costId!: string;
  @ApiProperty({ type: String }) supplierId!: string;
  @ApiProperty({ type: String }) concept!: string;
  @ApiProperty({ type: String, example: "20.20" }) amount!: string;
  @ApiProperty({ type: String, format: "date-time" }) bornAt!: string;
}

export class SupplierObligationsPageDto {
  @ApiProperty({ type: [SupplierObligationDto] })
  items!: SupplierObligationDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
