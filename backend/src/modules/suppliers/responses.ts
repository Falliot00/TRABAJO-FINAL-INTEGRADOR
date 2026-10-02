import { ApiProperty } from "@nestjs/swagger";
import type { Supplier } from "@cilgas/contracts";
export class SupplierResponseDto implements Supplier {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String, nullable: true }) cuit!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ type: Boolean }) active!: boolean;
}
export class SuppliersPageDto {
  @ApiProperty({ type: [SupplierResponseDto] }) items!: SupplierResponseDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
