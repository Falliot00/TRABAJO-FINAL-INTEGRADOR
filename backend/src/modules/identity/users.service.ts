import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import type { SessionUser, UserSummary } from "@cilgas/contracts";
import { Prisma } from "../../generated/prisma/client";
import { hashPassword } from "../../common/password";
import { IdentityService, sessionUser, userInclude } from "./identity.service";
import type { CreateUserDto, UpdateUserDto } from "./dto";
import { AuditService } from "../audit/audit.service";

export class UsersService {
  constructor(
    private readonly identity: IdentityService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<UserSummary[]> {
    const users = await this.identity.db.user.findMany({
      include: userInclude,
      orderBy: { id: "asc" },
    });
    return users.map((user) => ({
      ...sessionUser(user),
      active: user.active,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async create(input: CreateUserDto, actor: SessionUser): Promise<UserSummary> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.identity.db.$transaction(async (tx) => {
        const role = await tx.role.findUniqueOrThrow({
          where: { code: input.role },
        });
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash,
            roleId: role.id,
          },
          include: userInclude,
        });
        await this.audit.record(
          {
            actorId: actor.id,
            action: "USUARIO_CREADO",
            entity: "usuarios",
            entityId: String(user.id),
            result: "EXITO",
            detail: `Rol asignado: ${input.role}.`,
          },
          tx,
        );
        return {
          ...sessionUser(user),
          active: user.active,
          createdAt: user.createdAt.toISOString(),
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Ya existe una cuenta con ese email.");
      }
      throw error;
    }
  }

  async update(
    id: bigint,
    input: UpdateUserDto,
    actor: SessionUser,
  ): Promise<UserSummary> {
    const changedFields = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
    if (!changedFields.length)
      throw new BadRequestException("Indique al menos un cambio.");
    return this.identity.db.$transaction(async (tx) => {
      // Serialize changes affecting administrator availability, including bootstrap.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7348291)`;
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${id} FOR UPDATE`;
      const previous = await tx.user.findUnique({
        where: { id },
        include: userInclude,
      });
      if (!previous) throw new NotFoundException("Cuenta no encontrada.");
      const role = input.role
        ? await tx.role.findUniqueOrThrow({ where: { code: input.role } })
        : previous.role;
      if (
        previous.active &&
        previous.role.code === "ADMINISTRADOR" &&
        (input.active === false || role.code !== "ADMINISTRADOR")
      ) {
        const remaining = await tx.user.count({
          where: {
            active: true,
            role: { code: "ADMINISTRADOR" },
            id: { not: id },
          },
        });
        if (!remaining)
          throw new ConflictException(
            "Debe conservar al menos un administrador activo.",
          );
      }
      const user = await tx.user.update({
        where: { id },
        data: { name: input.name, active: input.active, roleId: role.id },
        include: userInclude,
      });
      if (role.id !== previous.roleId || input.active === false) {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      const fields = changedFields
        .map((key) => ({ name: "nombre", role: "rol", active: "estado" })[key])
        .join(", ");
      const detail = [`Campos actualizados: ${fields}.`];
      if (role.id !== previous.roleId) {
        detail.push(`Rol: ${previous.role.code} → ${role.code}.`);
      }
      if (user.active !== previous.active) {
        detail.push(
          `Estado: ${previous.active ? "activo" : "inactivo"} → ${user.active ? "activo" : "inactivo"}.`,
        );
      }
      await this.audit.record(
        {
          actorId: actor.id,
          action: "USUARIO_ACTUALIZADO",
          entity: "usuarios",
          entityId: String(id),
          result: "EXITO",
          detail: detail.join(" "),
        },
        tx,
      );
      return {
        ...sessionUser(user),
        active: user.active,
        createdAt: user.createdAt.toISOString(),
      };
    });
  }

  async revoke(id: bigint, actor: SessionUser) {
    await this.identity.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${id} FOR UPDATE`;
      if (!(await tx.user.findUnique({ where: { id } })))
        throw new NotFoundException("Cuenta no encontrada.");
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "SESIONES_REVOCADAS",
          entity: "usuarios",
          entityId: String(id),
          result: "EXITO",
        },
        tx,
      );
    });
  }
}
