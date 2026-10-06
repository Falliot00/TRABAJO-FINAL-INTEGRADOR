import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { SessionUser } from "@cilgas/contracts";
import type { Prisma } from "../../generated/prisma/client";
import { parseId } from "./dto";
import { digest, sessionUser, userInclude } from "./identity.service";

/** Revalida y mantiene bloqueados usuario y sesión durante el hecho técnico. */
export async function requireTechnicalActor(
  tx: Prisma.TransactionClient,
  actor: SessionUser,
  token: string | undefined,
): Promise<SessionUser> {
  const actorId = parseId(actor.id);
  await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${actorId} FOR SHARE`;
  if (!token) throw new UnauthorizedException("Inicie sesión para continuar.");
  const tokenHash = digest(token);
  await tx.$queryRaw`SELECT id FROM sesiones WHERE token_hash = ${tokenHash} FOR SHARE`;
  const session = await tx.session.findUnique({ where: { tokenHash } });
  if (
    !session ||
    session.userId !== actorId ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  )
    throw new UnauthorizedException("Inicie sesión para continuar.");
  const user = await tx.user.findUnique({
    where: { id: actorId },
    include: userInclude,
  });
  if (!user?.active)
    throw new UnauthorizedException("Inicie sesión para continuar.");
  const current = sessionUser(user);
  if (!current.permissions.includes("servicios.gestionar"))
    throw new ForbiddenException(
      "No tiene permiso para registrar hechos técnicos.",
    );
  return current;
}
