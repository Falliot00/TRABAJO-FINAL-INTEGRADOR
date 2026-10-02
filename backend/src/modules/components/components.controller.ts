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
import { ComponentsService } from "./components.service";
import {
  ComponentDto,
  ComponentDuplicatesQueryDto,
  UpdateComponentDto,
} from "./dto";
import {
  ComponentResponseDto,
  ComponentsPageDto,
  ComponentHistoryResponseDto,
  VehicleConfigurationsResponseDto,
} from "./responses";

@ApiTags("Componentes")
@ApiCookieAuth()
@Controller("components")
export class ComponentsController {
  constructor(
    @Inject(ComponentsService) private readonly components: ComponentsService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}

  @Get()
  @ApiOkResponse({ type: ComponentsPageDto })
  @ApiQuery({
    name: "q",
    required: false,
    type: String,
    description: "Serie, código de homologación, marca o modelo.",
  })
  @ApiQuery({
    name: "type",
    required: false,
    enum: ["CILINDRO", "VALVULA", "REGULADOR"],
  })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.components.list(parseListQuery(query, ["type"]));
  }

  @Get("duplicates")
  @ApiOkResponse({ type: ComponentsPageDto })
  @ApiQuery({ name: "modelId", type: String })
  @ApiQuery({ name: "serialNumber", type: String })
  @ApiQuery({ name: "excludeId", required: false, type: String })
  async duplicates(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.components.duplicates(
      parseMasterBody(ComponentDuplicatesQueryDto, query),
    );
  }

  @Get(":id")
  @ApiOkResponse({ type: ComponentResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.components.get(parseId(id));
  }

  @Get(":id/history")
  @ApiOkResponse({ type: ComponentHistoryResponseDto })
  @ApiParam({ name: "id", type: String })
  async history(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.components.history(parseId(id));
  }

  @Post()
  @ApiCreatedResponse({ type: ComponentResponseDto })
  @ApiBody({ type: ComponentDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.components.create(parseMasterBody(ComponentDto, body), actor);
  }

  @Patch(":id")
  @ApiOkResponse({ type: ComponentResponseDto })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateComponentDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.components.update(
      parseId(id),
      parseMasterBody(UpdateComponentDto, body),
      actor,
    );
  }
}

@ApiTags("Configuraciones del equipo")
@ApiCookieAuth()
@Controller("vehicles/:id/configurations")
export class VehicleConfigurationsController {
  constructor(
    @Inject(ComponentsService) private readonly components: ComponentsService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}

  @Get()
  @ApiOkResponse({ type: VehicleConfigurationsResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.components.configurations(parseId(id));
  }
}
