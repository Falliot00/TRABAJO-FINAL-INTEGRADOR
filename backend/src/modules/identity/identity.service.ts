import { createHash, randomBytes } from "node:crypto";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { PermissionCode, RoleCode, SessionUser } from "@cilgas/contracts";
import type { PrismaClient, Prisma } from "../../generated/prisma/client";
import type { AppConfig } from "../../common/config";
import { hashPassword, verifyPassword } from "../../common/password";
import { AuditService } from "../audit/audit.service";

export const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
} satisfies Prisma.UserInclude;
type UserWithRole = Prisma.UserGetPayload<{ include: typeof userInclude }>;
export const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function sessionUser(user: UserWithRole): SessionUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role.code as RoleCode,
    permissions: user.role.permissions
      .map(({ permission }) => permission.code as PermissionCode)
      .sort(),
  };
}

export class IdentityService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString("hex"));
  constructor(
    readonly db: PrismaClient,
    readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  async authorize(
    token: string | undefined,
    permission: PermissionCode,
  ): Promise<SessionUser> {
    const actor = await this.authenticate(token);
    if (!actor.permissions.includes(permission)) {
      await this.audit.record({
        actorId: actor.id,
        action: "ACCESO_DENEGADO",
        entity: "usuarios",
        entityId: actor.id,
        result: "RECHAZADO",
        detail: `Capacidad requerida: ${permission}.`,
      });
      throw new ForbiddenException(
        "No tiene permiso para realizar esta acción.",
      );
    }
    return actor;
  }

  async login(email: string, password: string, previousToken?: string) {
    const user = await this.db.user.findFirst({
      where: { email },
      include: userInclude,
    });
    const valid = await verifyPassword(
      user?.passwordHash ?? (await this.dummyHash),
      password,
    );
    if (!user?.active || !valid) {
      await this.audit.record({
        action: "ACCESO_RECHAZADO",
        entity: "usuarios",
        result: "RECHAZADO",
        detail: "Credenciales no válidas o cuenta no habilitada.",
      });
      throw new UnauthorizedException("Email o contraseña incorrectos.");
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.config.sessionHours * 3600000);
    const currentUser = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${user.id} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userInclude,
      });
      if (!current.active)
        throw new UnauthorizedException("Email o contraseña incorrectos.");
      if (previousToken)
        await tx.session.updateMany({
          where: { tokenHash: digest(previousToken), revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await tx.session.create({
        data: { userId: user.id, tokenHash: digest(token), expiresAt },
      });
      await this.audit.record(
        {
          actorId: String(user.id),
          action: "SESION_INICIADA",
          entity: "usuarios",
          entityId: String(user.id),
          result: "EXITO",
        },
        tx,
      );
      return sessionUser(current);
    });
    return { token, expiresAt, user: currentUser };
  }

  async authenticate(token?: string): Promise<SessionUser> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException("Inicie sesión para continuar.");
    const session = await this.db.session.findUnique({
      where: { tokenHash: digest(token) },
      include: { user: { include: userInclude } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    ) {
      throw new UnauthorizedException("Inicie sesión para continuar.");
    }
    return sessionUser(session.user);
  }

  async logout(token: string, actor: SessionUser) {
    await this.db.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { tokenHash: digest(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "SESION_CERRADA",
          entity: "usuarios",
          entityId: actor.id,
          result: "EXITO",
        },
        tx,
      );
    });
  }
}
