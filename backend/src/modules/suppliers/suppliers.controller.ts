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
import { SuppliersService } from "./suppliers.service";
import {
  SupplierDto,
  SupplierDuplicatesQueryDto,
  UpdateSupplierDto,
} from "./dto";
import { SupplierResponseDto, SuppliersPageDto } from "./responses";

@ApiTags("Proveedores")
@ApiCookieAuth()
@Controller("suppliers")
export class SuppliersController {
  constructor(
    @Inject(SuppliersService) private readonly suppliers: SuppliersService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}
  @Get()
  @ApiOkResponse({ type: SuppliersPageDto })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "active", required: false, type: Boolean })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(@Req() req: Request, @Query() query: Record<string, unknown>) {
    await this.identity.authorize(
      this.security.token(req),
      "catalogo.administrar",
    );
    return this.suppliers.list(parseListQuery(query));
  }
  @Get("duplicates")
  @ApiOkResponse({ type: SuppliersPageDto })
  @ApiQuery({ name: "cuit", required: true, type: String })
  @ApiQuery({ name: "excludeId", required: false, type: String })
  async duplicates(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    await this.identity.authorize(
      this.security.token(req),
      "catalogo.administrar",
    );
    return this.suppliers.duplicates(
      parseMasterBody(SupplierDuplicatesQueryDto, query),
    );
  }
  @Get(":id")
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiParam({ name: "id", type: String })
  async get(@Req() req: Request, @Param("id") id: string) {
    await this.identity.authorize(
      this.security.token(req),
      "catalogo.administrar",
    );
    return this.suppliers.get(parseId(id));
  }
  @Post()
  @ApiCreatedResponse({ type: SupplierResponseDto })
  @ApiBody({ type: SupplierDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "catalogo.administrar",
    );
    return this.suppliers.create(parseMasterBody(SupplierDto, body), actor);
  }
  @Patch(":id")
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiBody({ type: UpdateSupplierDto })
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
    return this.suppliers.update(
      parseId(id),
      parseMasterBody(UpdateSupplierDto, body),
      actor,
    );
  }
}
