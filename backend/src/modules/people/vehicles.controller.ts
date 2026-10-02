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
import { VehiclesService } from "./vehicles.service";
import {
  VehicleDto,
  VehicleDuplicatesQueryDto,
  UpdateVehicleDto,
  VehicleRelationshipDto,
  CloseVehicleRelationshipDto,
} from "./dto";
import {
  VehicleDetailResponseDto,
  VehicleResponseDto,
  VehiclesPageDto,
} from "../../common/master-responses";

@ApiTags("Vehículos")
@ApiCookieAuth()
@Controller("vehicles")
export class VehiclesController {
  constructor(
    @Inject(VehiclesService) private readonly vehicles: VehiclesService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: VehiclesPageDto })
  @ApiQuery({
    name: "q",
    required: false,
    type: String,
    description: "Dominio, marca o modelo.",
  })
  @ApiQuery({
    name: "personId",
    required: false,
    type: String,
    description: "Persona con vínculo actual, programado o histórico.",
  })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.vehicles.list(parseListQuery(query, ["personId"]));
  }
  @Get("duplicates")
  @ApiOkResponse({ type: VehiclesPageDto })
  @ApiQuery({ name: "plate", required: false, type: String })
  @ApiQuery({ name: "excludeId", required: false, type: String })
  async duplicates(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.vehicles.duplicates(
      parseMasterBody(VehicleDuplicatesQueryDto, query),
    );
  }
  @Get(":id")
  @ApiOkResponse({ type: VehicleDetailResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.vehicles.get(parseId(id));
  }
  @Post()
  @ApiCreatedResponse({ type: VehicleResponseDto })
  @ApiBody({ type: VehicleDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.vehicles.create(parseMasterBody(VehicleDto, body), actor);
  }
  @Patch(":id")
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateVehicleDto })
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
    return this.vehicles.update(
      parseId(id),
      parseMasterBody(UpdateVehicleDto, body),
      actor,
    );
  }
  @Post(":id/relationships")
  @ApiCreatedResponse({ type: VehicleDetailResponseDto })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: VehicleRelationshipDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async relate(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.vehicles.relate(
      parseId(id),
      parseMasterBody(VehicleRelationshipDto, body),
      actor,
    );
  }
  @Patch(":id/relationships/:relationshipId")
  @ApiOkResponse({ type: VehicleDetailResponseDto })
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "relationshipId", type: String })
  @ApiBody({ type: CloseVehicleRelationshipDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async closeRelationship(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("relationshipId") relationshipId: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.vehicles.closeRelationship(
      parseId(id),
      parseId(relationshipId),
      parseMasterBody(CloseVehicleRelationshipDto, body),
      actor,
    );
  }
}
