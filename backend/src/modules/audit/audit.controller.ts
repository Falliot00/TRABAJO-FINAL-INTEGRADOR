import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { Security } from "../../common/security";
import { parseId } from "../identity/dto";
import { IdentityService } from "../identity/identity.service";
import { AuditService } from "./audit.service";
import { AuditPageDto } from "./responses";

@ApiTags("Auditoría")
@ApiCookieAuth()
@Controller("audit")
export class AuditController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(Security) private readonly security: Security,
  ) {}

  @Get()
  @ApiOkResponse({ type: AuditPageDto })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(
    @Req() req: Request,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    await this.identity.authorize(
      this.security.token(req),
      "auditoria.consultar",
    );
    if (
      (limit !== undefined &&
        (typeof limit !== "string" || !/^\d{1,3}$/.test(limit))) ||
      (cursor !== undefined && typeof cursor !== "string")
    )
      throw new BadRequestException("Paginación no válida.");
    const take = limit === undefined ? 50 : Number(limit);
    if (take < 1 || take > 100)
      throw new BadRequestException("Paginación no válida.");
    return this.audit.list(
      take,
      cursor === undefined ? undefined : parseId(cursor),
    );
  }
}
