import type { SupplierObligation } from "@cilgas/contracts";
import type { Prisma } from "../../generated/prisma/client";
export class SupplierObligationsService {
  async originate(tx: Prisma.TransactionClient, serviceId: bigint, now: Date) {
    await tx.$executeRaw`INSERT INTO obligaciones (servicio_costo_id, servicio_id, proveedor_id, importe, nacida_en) SELECT id, servicio_id, proveedor_id, importe, ${now} FROM servicio_costos WHERE servicio_id = ${serviceId} AND tratamiento = 'PROVEEDOR'`;
  }
  async list(tx: Prisma.TransactionClient, serviceId: bigint) {
    const rows = await tx.$queryRaw<
      (Omit<SupplierObligation, "bornAt"> & { bornAt: Date })[]
    >`SELECT o.id::text, o.servicio_id::text AS "serviceId", o.servicio_costo_id::text AS "costId", o.proveedor_id::text AS "supplierId", c.concepto AS concept, o.importe::text AS amount, o.nacida_en AS "bornAt" FROM obligaciones o JOIN servicio_costos c ON c.id = o.servicio_costo_id WHERE o.servicio_id = ${serviceId} ORDER BY o.id`;
    return {
      items: rows.map((row) => ({ ...row, bornAt: row.bornAt.toISOString() })),
      nextCursor: null,
    };
  }
}
