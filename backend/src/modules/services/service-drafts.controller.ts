import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { Security } from "../../common/security";
import { parseListQuery, parseMasterBody } from "../../common/master-data";
import { IdentityService } from "../identity/identity.service";
import { parseId } from "../identity/dto";
import { ServiceDraftsService } from "./service-drafts.service";
import { CreateServiceDraftDto, UpdateServiceDraftDto } from "./dto";
import { ServiceDraftPageDto, ServiceDraftResponseDto } from "./responses";

@ApiTags("Borradores de servicios")
@ApiCookieAuth()
@Controller("service-drafts")
export class ServiceDraftsController {
  constructor(
    @Inject(ServiceDraftsService) private readonly drafts: ServiceDraftsService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: ServiceDraftPageDto })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "cursor", required: false, type: String })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    const actor = await this.identity.authorize(
      this.security.token(req),
      "servicios.gestionar",
    );
    return this.drafts.list(parseListQuery(query), actor);
  }
  @Get(":id")
  @ApiOkResponse({ type: ServiceDraftResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    const actor = await this.identity.authorize(
      this.security.token(req),
      "servicios.gestionar",
    );
    return this.drafts.get(parseId(id), actor);
  }
  @Post()
  @ApiCreatedResponse({ type: ServiceDraftResponseDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiBody({ type: CreateServiceDraftDto })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "servicios.gestionar",
    );
    return this.drafts.create(
      parseMasterBody(CreateServiceDraftDto, body),
      actor,
    );
  }
  @Patch(":id")
  @ApiOkResponse({ type: ServiceDraftResponseDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateServiceDraftDto })
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "servicios.gestionar",
    );
    return this.drafts.update(
      parseId(id),
      parseMasterBody(UpdateServiceDraftDto, body),
      actor,
    );
  }
}
