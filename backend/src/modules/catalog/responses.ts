import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CatalogItem,
  CatalogItemType,
  CatalogOffer,
  ServiceType,
} from "@cilgas/contracts";
import { itemTypes, serviceTypes } from "./dto";

export class CatalogItemResponseDto implements CatalogItem {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: Number }) order!: number;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String, enum: itemTypes }) type!: CatalogItemType;
  @ApiProperty({ type: String }) quantity!: string;
  @ApiProperty({ type: String }) unitPrice!: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Sólo con catalogo.administrar.",
  })
  supplierId?: string | null;
  @ApiPropertyOptional({
    type: String,
    description: "Sólo con catalogo.administrar.",
  })
  unitCost?: string;
}
export class CatalogOfferResponseDto implements CatalogOffer {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) code!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String, enum: serviceTypes }) type!: ServiceType;
  @ApiProperty({ type: String }) suggestedPrice!: string;
  @ApiProperty({ type: Boolean }) active!: boolean;
  @ApiProperty({ type: [CatalogItemResponseDto] })
  items!: CatalogItemResponseDto[];
}
export class CatalogPageDto {
  @ApiProperty({ type: [CatalogOfferResponseDto] })
  items!: CatalogOfferResponseDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
