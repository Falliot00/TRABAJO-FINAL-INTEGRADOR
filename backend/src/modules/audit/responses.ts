import { ApiProperty } from "@nestjs/swagger";
import type { AuditEvent, AuditPage } from "@cilgas/contracts";

export class AuditEventDto implements AuditEvent {
  @ApiProperty({
    type: String,
    description: "Identificador decimal del evento.",
  })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  actorId!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  occurredAt!: string;

  @ApiProperty({ type: String })
  action!: string;

  @ApiProperty({ type: String })
  entity!: string;

  @ApiProperty({ type: String, nullable: true })
  entityId!: string | null;

  @ApiProperty({ type: String, enum: ["EXITO", "RECHAZADO"] })
  result!: "EXITO" | "RECHAZADO";

  @ApiProperty({ type: String, nullable: true })
  detail!: string | null;
}

export class AuditPageDto implements AuditPage {
  @ApiProperty({ type: [AuditEventDto] })
  items!: AuditEventDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Cursor decimal de la próxima página; null al terminar.",
  })
  nextCursor!: string | null;
}
