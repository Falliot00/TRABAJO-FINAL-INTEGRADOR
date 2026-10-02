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
import { CatalogService } from "./catalog.service";
import {
  CatalogDuplicatesQueryDto,
  CatalogOfferDto,
  UpdateCatalogOfferDto,
} from "./dto";
import { CatalogOfferResponseDto, CatalogPageDto } from "./responses";

@ApiTags("Catálogo de servicios")
@ApiCookieAuth()
@Controller("catalog-services")
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: CatalogPageDto })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    const actor = await this.identity.authorize(
      this.security.token(req),
      "catalogo.consultar",
    );
    return this.catalog.list(
      parseListQuery(query),
      actor.permissions.includes("catalogo.administrar"),
    );
  }
  @Get("duplicates")
  @ApiOkResponse({ type: CatalogPageDto })
  @ApiQuery({ name: "code", required: true, type: String })
  @ApiQuery({ name: "excludeId", required: false, type: String })
  async duplicates(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const actor = await this.identity.authorize(
      this.security.token(req),
      "catalogo.consultar",
    );
    return this.catalog.duplicates(
      parseMasterBody(CatalogDuplicatesQueryDto, query),
      actor.permissions.includes("catalogo.administrar"),
    );
  }
  @Get(":id")
  @ApiOkResponse({ type: CatalogOfferResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    const actor = await this.identity.authorize(
      this.security.token(req),
      "catalogo.consultar",
    );
    return this.catalog.get(
      parseId(id),
      actor.permissions.includes("catalogo.administrar"),
    );
  }
  @Post()
  @ApiCreatedResponse({ type: CatalogOfferResponseDto })
  @ApiBody({ type: CatalogOfferDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "catalogo.administrar",
    );
    return this.catalog.create(parseMasterBody(CatalogOfferDto, body), actor);
  }
  @Patch(":id")
  @ApiOkResponse({ type: CatalogOfferResponseDto })
  @ApiBody({ type: UpdateCatalogOfferDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  @ApiParam({ name: "id", type: String })
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "catalogo.administrar",
    );
    return this.catalog.update(
      parseId(id),
      parseMasterBody(UpdateCatalogOfferDto, body),
      actor,
    );
  }
}
