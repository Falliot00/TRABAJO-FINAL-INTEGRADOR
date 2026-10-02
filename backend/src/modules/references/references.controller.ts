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
  Res,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Security } from "../../common/security";
import { parseListQuery, parseMasterBody } from "../../common/master-data";
import { IdentityService } from "../identity/identity.service";
import { ReferencesService } from "./references.service";
import {
  ComponentModelDto,
  UpdateComponentModelDto,
  RegulatoryActorDto,
  UpdateRegulatoryActorDto,
  UpdateWorkshopDto,
} from "./dto";
import { parseId } from "../identity/dto";
import {
  ComponentModelResponseDto,
  ComponentModelsPageDto,
  RegulatoryActorResponseDto,
  RegulatoryActorsPageDto,
  WorkshopResponseDto,
} from "../../common/master-responses";

@ApiTags("Taller y referencias")
@ApiCookieAuth()
@Controller("workshop")
@ApiExtraModels(WorkshopResponseDto)
export class WorkshopController {
  constructor(
    @Inject(ReferencesService) private readonly references: ReferencesService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}

  @Get()
  @ApiOkResponse({
    schema: {
      nullable: true,
      allOf: [{ $ref: getSchemaPath(WorkshopResponseDto) }],
    },
  })
  async get(@Req() req: Request, @Res() res: Response) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    res.json(await this.references.workshop());
  }

  @Patch()
  @ApiOkResponse({ type: WorkshopResponseDto })
  @ApiBody({ type: UpdateWorkshopDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async update(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "configuracion.administrar",
    );
    return this.references.updateWorkshop(
      parseMasterBody(UpdateWorkshopDto, body),
      actor,
    );
  }
}

@ApiTags("Taller y referencias")
@ApiCookieAuth()
@Controller("regulatory-actors")
export class RegulatoryActorsController {
  constructor(
    @Inject(ReferencesService) private readonly references: ReferencesService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: RegulatoryActorsPageDto })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "type", required: false, enum: ["PEC", "TDM", "CRPC"] })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.references.actors(parseListQuery(query, ["type"]));
  }
  @Get(":id")
  @ApiOkResponse({ type: RegulatoryActorResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.references.actor(parseId(id));
  }
  @Post()
  @ApiCreatedResponse({ type: RegulatoryActorResponseDto })
  @ApiBody({ type: RegulatoryActorDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "configuracion.administrar",
    );
    return this.references.createActor(
      parseMasterBody(RegulatoryActorDto, body),
      actor,
    );
  }
  @Patch(":id")
  @ApiOkResponse({ type: RegulatoryActorResponseDto })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateRegulatoryActorDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "configuracion.administrar",
    );
    return this.references.updateActor(
      parseId(id),
      parseMasterBody(UpdateRegulatoryActorDto, body),
      actor,
    );
  }
}

@ApiTags("Taller y referencias")
@ApiCookieAuth()
@Controller("component-models")
export class ComponentModelsController {
  constructor(
    @Inject(ReferencesService) private readonly references: ReferencesService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: ComponentModelsPageDto })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({
    name: "type",
    required: false,
    enum: ["CILINDRO", "VALVULA", "REGULADOR"],
  })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.references.models(parseListQuery(query, ["type"]));
  }
  @Get(":id")
  @ApiOkResponse({ type: ComponentModelResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.references.model(parseId(id));
  }
  @Post()
  @ApiCreatedResponse({ type: ComponentModelResponseDto })
  @ApiBody({ type: ComponentModelDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "configuracion.administrar",
    );
    return this.references.createModel(
      parseMasterBody(ComponentModelDto, body),
      actor,
    );
  }
  @Patch(":id")
  @ApiOkResponse({ type: ComponentModelResponseDto })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateComponentModelDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "configuracion.administrar",
    );
    return this.references.updateModel(
      parseId(id),
      parseMasterBody(UpdateComponentModelDto, body),
      actor,
    );
  }
}
