import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { Security } from "../../common/security";
import { CreateUserDto, UpdateUserDto, parseBody, parseId } from "./dto";
import { UsersService } from "./users.service";
import { IdentityService } from "./identity.service";
import { UserSummaryDto } from "./responses";

@ApiTags("Cuentas")
@ApiCookieAuth()
@Controller("users")
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}

  @Get()
  @ApiOkResponse({ type: UserSummaryDto, isArray: true })
  async list(@Req() req: Request) {
    await this.identity.authorize(
      this.security.token(req),
      "usuarios.administrar",
    );
    return this.users.list();
  }

  @Post()
  @ApiCreatedResponse({ type: UserSummaryDto })
  @ApiBody({ type: CreateUserDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async create(@Req() req: Request, @Body() body: unknown) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "usuarios.administrar",
    );
    return this.users.create(parseBody(CreateUserDto, body), actor);
  }

  @Patch(":id")
  @ApiOkResponse({ type: UserSummaryDto })
  @ApiParam({
    name: "id",
    type: String,
    description: "Identificador decimal del usuario.",
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "usuarios.administrar",
    );
    return this.users.update(
      parseId(id),
      parseBody(UpdateUserDto, body),
      actor,
    );
  }

  @Post(":id/revoke-sessions")
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiParam({
    name: "id",
    type: String,
    description: "Identificador decimal del usuario.",
  })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async revoke(@Req() req: Request, @Param("id") id: string) {
    this.security.checkCsrf(req);
    const actor = await this.identity.authorize(
      this.security.token(req),
      "usuarios.administrar",
    );
    await this.users.revoke(parseId(id), actor);
  }
}
