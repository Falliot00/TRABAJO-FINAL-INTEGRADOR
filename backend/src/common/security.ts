import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ForbiddenException, HttpException } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import type { AppConfig } from "./config";

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Attempt {
  count: number;
  expires: number;
}

export class Security {
  private readonly csrfSecret = randomBytes(32);
  private readonly attempts = new Map<string, Attempt>();
  readonly sessionCookie: string;
  private readonly csrfCookie: string;
  readonly cookieOptions: CookieOptions;

  constructor(private readonly config: AppConfig) {
    this.sessionCookie = config.production
      ? "__Host-cilgas_session"
      : "cilgas_session";
    this.csrfCookie = config.production ? "__Host-cilgas_csrf" : "cilgas_csrf";
    this.cookieOptions = {
      httpOnly: true,
      secure: config.production,
      sameSite: "strict",
      path: "/",
    };
  }

  token(req: Request): string | undefined {
    const token: unknown = (
      req.cookies as Record<string, unknown> | undefined
    )?.[this.sessionCookie];
    return typeof token === "string" ? token : undefined;
  }

  private signature(nonce: string, req: Request) {
    return createHmac("sha256", this.csrfSecret)
      .update(`${nonce}:${this.token(req) ?? ""}`)
      .digest("base64url");
  }

  issueCsrf(req: Request, res: Response) {
    if (
      (req.headers.origin && req.headers.origin !== this.config.origin) ||
      req.headers["sec-fetch-site"] === "cross-site"
    ) {
      throw new ForbiddenException("Origen no permitido.");
    }
    const nonce = randomBytes(32).toString("base64url");
    const token = `${nonce}.${this.signature(nonce, req)}`;
    res.cookie(this.csrfCookie, token, {
      ...this.cookieOptions,
      maxAge: this.config.sessionHours * 3600000,
    });
    return { csrfToken: token };
  }

  checkCsrf(req: Request) {
    const token = req.header("X-CSRF-Token");
    const cookie: unknown = (
      req.cookies as Record<string, unknown> | undefined
    )?.[this.csrfCookie];
    const pieces = token?.split(".");
    if (
      req.headers.origin !== this.config.origin ||
      req.headers["sec-fetch-site"] === "cross-site" ||
      typeof cookie !== "string" ||
      !token ||
      !/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(token) ||
      !equal(cookie, token) ||
      !pieces?.[0] ||
      !pieces[1] ||
      !equal(this.signature(pieces[0], req), pieces[1])
    ) {
      throw new ForbiddenException(
        "La solicitud no es válida. Actualice la página e intente nuevamente.",
      );
    }
  }

  limitLogin(req: Request, email: string) {
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (value.expires <= now) this.attempts.delete(key);
    const account = createHmac("sha256", this.csrfSecret)
      .update(email)
      .digest("hex");
    const limits: [string, number][] = [
      [`ip:${req.ip ?? "unknown"}`, 30],
      [`account:${account}`, 10],
    ];
    if (
      this.attempts.size > 10000 ||
      limits.some(
        ([key, limit]) => (this.attempts.get(key)?.count ?? 0) >= limit,
      )
    ) {
      throw new HttpException(
        "Demasiados intentos. Espere quince minutos antes de intentar nuevamente.",
        429,
      );
    }
    for (const [key] of limits) {
      const attempt = this.attempts.get(key) ?? {
        count: 0,
        expires: now + 15 * 60000,
      };
      attempt.count += 1;
      this.attempts.set(key, attempt);
    }
  }

  loginSucceeded(email: string) {
    const account = createHmac("sha256", this.csrfSecret)
      .update(email)
      .digest("hex");
    this.attempts.delete(`account:${account}`);
  }

  clearCookies(res: Response) {
    res.clearCookie(this.sessionCookie, this.cookieOptions);
    res.clearCookie(this.csrfCookie, this.cookieOptions);
  }
}
