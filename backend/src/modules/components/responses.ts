import { ApiProperty } from "@nestjs/swagger";
import type {
  Component,
  ComponentHistory,
  ComponentType,
  VehicleConfigurations,
} from "@cilgas/contracts";
import { ComponentModelResponseDto } from "../../common/master-responses";

export class ComponentResponseDto implements Component {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) modelId!: string;
  @ApiProperty({ type: String, enum: ["CILINDRO", "VALVULA", "REGULADOR"] })
  type!: ComponentType;
  @ApiProperty({ type: String }) serialNumber!: string;
  @ApiProperty({ type: String, nullable: true, example: "2020-02" })
  manufactureMonth!: string | null;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ type: ComponentModelResponseDto })
  model!: ComponentModelResponseDto;
}

export class ComponentsPageDto {
  @ApiProperty({ type: [ComponentResponseDto] }) items!: ComponentResponseDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}

type ComponentMovement = ComponentHistory["movements"][number];
type ComponentActivity = ComponentHistory["activities"][number];
type ComponentRevision = ComponentHistory["revisions"][number];
type Configuration = VehicleConfigurations["configurations"][number];
type ConfigurationMember = Configuration["components"][number];

class ComponentMovementDto implements ComponentMovement {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) serviceId!: string;
  @ApiProperty({ type: String }) action!: string;
  @ApiProperty({ type: String }) origin!: string;
  @ApiProperty({ type: String }) destination!: string;
  @ApiProperty({ type: String, format: "date-time" }) occurredAt!: string;
}

class ComponentActivityDto implements ComponentActivity {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) serviceId!: string;
  @ApiProperty({ type: String, enum: ["INSPECCIONAR", "ENSAYAR", "MANTENER"] })
  action!: ComponentActivity["action"];
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String, format: "date-time" }) occurredAt!: string;
  @ApiProperty({ type: String }) recordedBy!: string;
}

class ComponentRevisionDto implements ComponentRevision {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) serviceId!: string;
  @ApiProperty({ type: String }) crpcId!: string;
  @ApiProperty({ type: String, format: "date" }) testDate!: string;
  @ApiProperty({ type: String, format: "date", nullable: true })
  expiresOn!: string | null;
  @ApiProperty({ type: String, enum: ["APROBADO", "RECHAZADO"] })
  result!: "APROBADO" | "RECHAZADO";
  @ApiProperty({ type: String, nullable: true }) certificateNumber!:
    string | null;
}

class ConfigurationMemberDto implements ConfigurationMember {
  @ApiProperty({ type: String }) componentId!: string;
  @ApiProperty({ type: String, enum: ["REGULADOR", "CILINDRO", "VALVULA"] })
  type!: ComponentType;
  @ApiProperty({ type: Number }) position!: number;
}

class ConfigurationDto implements Configuration {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, nullable: true }) serviceId!: string | null;
  @ApiProperty({ type: String, format: "date-time" }) validFrom!: string;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  validUntil!: string | null;
  @ApiProperty({ type: [ConfigurationMemberDto] })
  components!: ConfigurationMemberDto[];
}

export class ComponentHistoryResponseDto implements ComponentHistory {
  @ApiProperty({ type: [ComponentActivityDto] })
  activities!: ComponentActivityDto[];
  @ApiProperty({ type: [ComponentMovementDto] })
  movements!: ComponentMovementDto[];
  @ApiProperty({ type: [ComponentRevisionDto] })
  revisions!: ComponentRevisionDto[];
  @ApiProperty({ type: String }) componentId!: string;
  @ApiProperty({ type: Boolean }) available!: boolean;
  @ApiProperty({ type: String }) message!: string;
}

export class VehicleConfigurationsResponseDto implements VehicleConfigurations {
  @ApiProperty({ type: String, nullable: true }) currentConfigurationId!:
    string | null;
  @ApiProperty({ type: [ConfigurationDto] })
  configurations!: ConfigurationDto[];
  @ApiProperty({ type: String }) vehicleId!: string;
  @ApiProperty({ type: Boolean }) available!: boolean;
  @ApiProperty({ type: String }) message!: string;
}
