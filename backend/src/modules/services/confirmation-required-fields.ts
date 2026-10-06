import type { ConfirmationBlocker } from "@cilgas/contracts";
import type { Prisma } from "../../generated/prisma/client";
import type { DraftRow } from "./service-drafts.service";

export async function requiredFields(
  tx: Prisma.TransactionClient,
  row: DraftRow,
): Promise<ConfirmationBlocker[]> {
  const blockers: ConfirmationBlocker[] = [];
  const missing = (entries: [string, unknown][]) =>
    entries
      .filter(
        ([, value]) => value === null || value === undefined || value === "",
      )
      .map(([label]) => label);
  const vehicle = row.vehicle;
  const vehicleFields = missing([
    ["marca", vehicle.brand],
    ["modelo", vehicle.model],
    ["año", vehicle.year],
    ["dominio", vehicle.plate],
    ["inyección", vehicle.injection],
    ["tipo", vehicle.type],
    ...(vehicle.type === "OTROS"
      ? [
          ["detalle de tipo Otros", vehicle.otherTypeDetail] as [
            string,
            unknown,
          ],
        ]
      : []),
  ]);
  if (vehicleFields.length)
    blockers.push({
      code: "VEHICULO_INCOMPLETO",
      message: `Complete los datos del vehículo: ${vehicleFields.join(", ")}.`,
    });
  const titular = row.people.find((link) => link.role === "TITULAR")?.person;
  if (!titular)
    blockers.push({
      code: "TITULAR_REQUERIDO",
      message: "Seleccione el titular del servicio.",
    });
  else {
    const fields = missing([
      ["nombre", titular.name],
      ["tipo de documento", titular.documentType],
      ["número de documento", titular.documentNumber],
      ["calle", titular.street],
      ["altura (o S/N)", titular.streetNumber],
      ["CPA", titular.postalCode],
      ["localidad", titular.locality],
      ["provincia", titular.province],
      ["teléfono", titular.phone],
    ]);
    if (fields.length)
      blockers.push({
        code: "TITULAR_INCOMPLETO",
        message: `Complete los datos del titular: ${fields.join(", ")}.`,
      });
  }
  const actorRefs = [
    { id: row.preparation?.tdmId, type: "TDM" },
    { id: row.preparation?.pecId, type: "PEC" },
    ...row.interventions
      .filter((item) => item.performsPh)
      .map((item) => ({ id: item.crpcId, type: "CRPC" })),
  ].filter((actor): actor is { id: bigint; type: string } => actor.id != null);
  const actors = await tx.regulatoryActor.findMany({
    where: { id: { in: actorRefs.map((ref) => ref.id) } },
  });
  for (const reference of new Map(
    actorRefs.map((ref) => [`${ref.type}/${ref.id}`, ref]),
  ).values()) {
    const actor = actors.find((value) => value.id === reference.id);
    if (!actor || actor.type !== reference.type) {
      blockers.push({
        code: "ACTOR_INCONSISTENTE",
        message: `Seleccione una referencia de tipo ${reference.type}.`,
      });
      continue;
    }
    const fields = missing([
      ["código", actor.code],
      ["nombre", actor.name],
      ...(reference.type === "TDM"
        ? ([
            ["CUIT", actor.cuit],
            ["domicilio", actor.address],
          ] as [string, unknown][])
        : []),
    ]);
    if (fields.length)
      blockers.push({
        code: "ENCABEZADO_INCOMPLETO",
        message: `Complete ${reference.type}: ${fields.join(", ")}.`,
      });
  }
  for (const item of row.interventions.filter(
    (entry) => entry.type === "ACCESORIO",
  )) {
    if (
      (item.description ||
        item.action ||
        item.condition ||
        item.homologationCode ||
        item.serialNumber) &&
      (!item.homologationCode || !item.serialNumber)
    ) {
      blockers.push({
        code: "ACCESORIO_INCOMPLETO",
        message: `Complete código y serie del accesorio documentado en el renglón ${item.row}.`,
      });
    }
  }
  return blockers;
}
