import { ApiProperty } from "@nestjs/swagger";
import type {
  CsrfResponse,
  PermissionCode,
  RoleCode,
  SessionResponse,
  SessionUser,
  UserSummary,
} from "@cilgas/contracts";

export class SessionUserDto implements SessionUser {
  @ApiProperty({
    type: String,
    description: "Identificador decimal conservado sin pérdida de precisión.",
  })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, format: "email" })
  email!: string;

  @ApiProperty({ type: String, enum: ["ADMINISTRADOR", "OPERADOR"] })
  role!: RoleCode;

  @ApiProperty({ type: [String] })
  permissions!: PermissionCode[];
}

export class UserSummaryDto extends SessionUserDto implements UserSummary {
  @ApiProperty({ type: Boolean })
  active!: boolean;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;
}

export class SessionResponseDto implements SessionResponse {
  @ApiProperty({ type: () => SessionUserDto })
  user!: SessionUserDto;
}

export class CsrfResponseDto implements CsrfResponse {
  @ApiProperty({ type: String })
  csrfToken!: string;
}
