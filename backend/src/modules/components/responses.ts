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

export class ComponentHistoryResponseDto implements ComponentHistory {
  @ApiProperty({ type: String }) componentId!: string;
  @ApiProperty({ type: Boolean, enum: [false] }) available!: false;
  @ApiProperty({ type: String }) message!: string;
}

export class VehicleConfigurationsResponseDto implements VehicleConfigurations {
  @ApiProperty({ type: String }) vehicleId!: string;
  @ApiProperty({ type: Boolean, enum: [false] }) available!: false;
  @ApiProperty({ type: String }) message!: string;
}
