import { ApiProperty } from "@nestjs/swagger";
import type {
  ComponentModel,
  ComponentType,
  DocumentType,
  Person,
  PersonType,
  RegulatoryActor,
  RegulatoryActorType,
  Vehicle,
  VehicleDetail,
  VehiclePersonRole,
  VehicleRelationship,
  VehicleType,
  Workshop,
} from "@cilgas/contracts";

export class WorkshopResponseDto implements Workshop {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String, nullable: true }) cuit!: string | null;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty({ type: String, nullable: true }) locality!: string | null;
  @ApiProperty({ type: String, nullable: true }) province!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: String, nullable: true }) tdmId!: string | null;
}

export class RegulatoryActorResponseDto implements RegulatoryActor {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, enum: ["PEC", "TDM", "CRPC"] })
  type!: RegulatoryActorType;
  @ApiProperty({ type: String }) code!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String, nullable: true }) cuit!: string | null;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty({ type: String, nullable: true }) locality!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) technicalResponsible!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) responsibleLicense!:
    string | null;
  @ApiProperty({ type: Boolean }) active!: boolean;
}

export class ComponentModelResponseDto implements ComponentModel {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, enum: ["CILINDRO", "VALVULA", "REGULADOR"] })
  type!: ComponentType;
  @ApiProperty({ type: String }) homologationCode!: string;
  @ApiProperty({ type: String, nullable: true }) brand!: string | null;
  @ApiProperty({ type: String, nullable: true }) model!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: "Capacidad decimal en litros; exclusiva de cilindros.",
  })
  capacityLiters!: string | null;
  @ApiProperty({ type: Boolean }) active!: boolean;
}

export class PersonResponseDto implements Person {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, enum: ["FISICA", "JURIDICA"] })
  type!: PersonType;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({
    type: String,
    enum: ["DNI", "CUIT", "CUIL", "PASAPORTE", "OTRO"],
  })
  documentType!: DocumentType;
  @ApiProperty({ type: String }) documentNumber!: string;
  @ApiProperty({ type: String, nullable: true }) street!: string | null;
  @ApiProperty({ type: String, nullable: true }) streetNumber!: string | null;
  @ApiProperty({ type: String, nullable: true }) floorApartment!: string | null;
  @ApiProperty({ type: String, nullable: true }) locality!: string | null;
  @ApiProperty({ type: String, nullable: true }) province!: string | null;
  @ApiProperty({ type: String, nullable: true }) postalCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: Boolean }) active!: boolean;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: string;
}

export class VehicleResponseDto implements Vehicle {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) plate!: string;
  @ApiProperty({ type: String }) brand!: string;
  @ApiProperty({ type: String }) model!: string;
  @ApiProperty({ type: Number, minimum: 1900, maximum: 2200 }) year!: number;
  @ApiProperty({ type: String, nullable: true }) engineNumber!: string | null;
  @ApiProperty({ type: String, nullable: true }) chassisNumber!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    enum: ["TAXI", "PICKUP", "PARTICULAR", "BUS", "OFICIAL", "OTROS"],
  })
  type!: VehicleType | null;
  @ApiProperty({ type: String, nullable: true }) otherTypeDetail!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) usage!: string | null;
  @ApiProperty({ type: Boolean, nullable: true }) injection!: boolean | null;
  @ApiProperty({ type: Boolean }) active!: boolean;
}

export class VehicleRelationshipResponseDto implements VehicleRelationship {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) vehicleId!: string;
  @ApiProperty({ type: String }) personId!: string;
  @ApiProperty({ type: String, enum: ["TITULAR", "CONTACTO"] })
  role!: VehiclePersonRole;
  @ApiProperty({ type: String, format: "date" }) from!: string;
  @ApiProperty({ type: String, format: "date", nullable: true }) until!:
    string | null;
  @ApiProperty({ type: PersonResponseDto }) person!: Person;
}

export class VehicleDetailResponseDto
  extends VehicleResponseDto
  implements VehicleDetail
{
  @ApiProperty({ type: [VehicleRelationshipResponseDto] })
  relationships!: VehicleRelationship[];
}

export class RegulatoryActorsPageDto {
  @ApiProperty({ type: [RegulatoryActorResponseDto] })
  items!: RegulatoryActor[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class ComponentModelsPageDto {
  @ApiProperty({ type: [ComponentModelResponseDto] }) items!: ComponentModel[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class PeoplePageDto {
  @ApiProperty({ type: [PersonResponseDto] }) items!: Person[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class VehiclesPageDto {
  @ApiProperty({ type: [VehicleResponseDto] }) items!: Vehicle[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
