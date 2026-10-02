import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { IdentityService } from "./identity.service";
import { LoginDto, parseBody } from "./dto";
import { Security } from "../../common/security";
import { CsrfResponseDto, SessionResponseDto } from "./responses";

@ApiTags("Acceso")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Security) private readonly security: Security,
  ) {}

  @Get("csrf")
  @ApiOkResponse({ type: CsrfResponseDto })
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.security.issueCsrf(req, res);
  }

  @Post("login")
  @ApiCreatedResponse({ type: SessionResponseDto })
  @ApiBody({ type: LoginDto })
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    this.security.checkCsrf(req);
    const input = parseBody(LoginDto, body);
    this.security.limitLogin(req, input.email);
    const session = await this.identity.login(
      input.email,
      input.password,
      this.security.token(req),
    );
    this.security.loginSucceeded(input.email);
    res.cookie(this.security.sessionCookie, session.token, {
      ...this.security.cookieOptions,
      expires: session.expiresAt,
    });
    return { user: session.user };
  }

  @Get("session")
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiCookieAuth()
  async session(@Req() req: Request) {
    return { user: await this.identity.authenticate(this.security.token(req)) };
  }

  @Post("logout")
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiCookieAuth()
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.security.checkCsrf(req);
    const token = this.security.token(req);
    const actor = await this.identity.authenticate(token);
    await this.identity.logout(token!, actor);
    this.security.clearCookies(res);
  }
}
