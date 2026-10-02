import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { Security } from "../../common/security";
import { parseListQuery } from "../../common/master-data";
import { IdentityService } from "../identity/identity.service";
import { parseId } from "../identity/dto";
import { ServiceConfirmationService } from "./service-confirmation.service";
import {
  ConfirmedServiceDto,
  ConfirmedServicesPageDto,
  ServiceSheetDto,
  SupplierObligationsPageDto,
} from "./confirmation-responses";
@ApiTags("Servicios confirmados")
@ApiCookieAuth()
@Controller("services")
export class ConfirmedServicesController {
  constructor(
    @Inject(ServiceConfirmationService)
    private readonly services: ServiceConfirmationService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: ConfirmedServicesPageDto })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "cursor", required: false, type: String })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    const actor = await this.identity.authorize(
      this.security.token(req),
      "fichas.consultar",
    );
    return this.services.list(parseListQuery(query), actor);
  }
  @Get(":id")
  @ApiOkResponse({ type: ConfirmedServiceDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    const actor = await this.identity.authorize(
      this.security.token(req),
      "fichas.consultar",
    );
    return this.services.get(parseId(id), actor);
  }
  @Get(":id/sheet")
  @ApiOkResponse({ type: ServiceSheetDto })
  @ApiParam({ name: "id", type: String })
  async sheet(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(this.security.token(req), "fichas.consultar");
    return this.services.sheet(parseId(id));
  }
  @Get(":id/obligations")
  @ApiOkResponse({ type: SupplierObligationsPageDto })
  @ApiParam({ name: "id", type: String })
  async obligations(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "finanzas.consultar",
    );
    return this.services.supplierObligations(parseId(id));
  }
}
