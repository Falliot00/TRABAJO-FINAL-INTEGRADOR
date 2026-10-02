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
import { PeopleService } from "./people.service";
import { PersonDto, PersonDuplicatesQueryDto, UpdatePersonDto } from "./dto";
import {
  PeoplePageDto,
  PersonResponseDto,
} from "../../common/master-responses";

@ApiTags("Personas")
@ApiCookieAuth()
@Controller("people")
export class PeopleController {
  constructor(
    @Inject(PeopleService) private readonly people: PeopleService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: PeoplePageDto })
  @ApiQuery({
    name: "q",
    required: false,
    type: String,
    description: "Nombre o documento.",
  })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.people.list(parseListQuery(query));
  }
  @Get("duplicates")
  @ApiOkResponse({ type: PeoplePageDto })
  @ApiQuery({ name: "name", required: false, type: String })
  @ApiQuery({
    name: "documentType",
    required: false,
    enum: ["DNI", "CUIT", "CUIL", "PASAPORTE", "OTRO"],
  })
  @ApiQuery({ name: "documentNumber", required: false, type: String })
  @ApiQuery({ name: "excludeId", required: false, type: String })
  async duplicates(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.people.duplicates(
      parseMasterBody(PersonDuplicatesQueryDto, query),
    );
  }
  @Get(":id")
  @ApiOkResponse({ type: PersonResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.people.get(parseId(id));
  }
  @Post()
  @ApiCreatedResponse({ type: PersonResponseDto })
  @ApiBody({ type: PersonDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "personas.gestionar",
    );
    return this.people.create(parseMasterBody(PersonDto, body), actor);
  }
  @Patch(":id")
  @ApiOkResponse({ type: PersonResponseDto })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdatePersonDto })
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
    return this.people.update(
      parseId(id),
      parseMasterBody(UpdatePersonDto, body),
      actor,
    );
  }
}
