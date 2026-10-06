import type { RegulatoryActor } from "../../generated/prisma/client";
import type { DraftRow } from "../services/service-drafts.service";
import type { RegulatoryValidation } from "../services/regulatory-validation";

type DocumentEvidence = NonNullable<
  Awaited<ReturnType<RegulatoryValidation["assess"]>>["document"]
>;
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
const month = (value: Date | null) => value?.toISOString().slice(0, 7) ?? null;
export function sheetSnapshot(
  row: DraftRow,
  actors: RegulatoryActor[],
  evidence: DocumentEvidence,
  now: Date,
) {
  const person = (role: string) => {
    const value = row.people.find((link) => link.role === role)?.person;
    return value
      ? {
          nombreRazonSocial: value.name,
          documentoTipo: value.documentType,
          documentoNumero: value.documentNumber,
          calle: value.street,
          numero: value.streetNumber,
          pisoDepto: value.floorApartment,
          localidad: value.locality,
          provincia: value.province,
          codigoPostal: value.postalCode,
          telefono: value.phone,
          email: value.email,
        }
      : null;
  };
  const actor = (id: bigint | null | undefined) => {
    const value = actors.find((candidate) => candidate.id === id);
    return value
      ? {
          codigo: value.code,
          nombre: value.name,
          cuit: value.cuit,
          domicilio: value.address,
          localidad: value.locality,
          telefono: value.phone,
          responsableTecnico: value.technicalResponsible,
          matriculaResponsable: value.responsibleLicense,
        }
      : null;
  };
  const crpcCode = (id: bigint | null) =>
    actors.find((candidate) => candidate.id === id)?.code ?? null;
  const base = (item: DraftRow["interventions"][number]) => ({
    componenteId: item.componentId === null ? null : String(item.componentId),
    renglon: item.row,
    codigoHomologacion: item.homologationCode,
    numeroSerie: item.serialNumber,
  });
  const prep = row.preparation!;
  const removedValves = row.interventions
    .filter(
      (item) =>
        item.type === "VALVULA" && ["D", "B"].includes(item.action ?? ""),
    )
    .map((item) => {
      const cylinder = row.interventions.find(
        (candidate) =>
          candidate.componentId === item.cylinderId &&
          candidate.type === "CILINDRO",
      );
      return {
        ...base(item),
        cilindroId: String(item.cylinderId),
        accion: item.action,
        cilindroCodigo: cylinder?.homologationCode ?? null,
        cilindroSerie: cylinder?.serialNumber ?? null,
      };
    });
  const observations =
    [
      prep.notes,
      ...removedValves.map(
        (item) =>
          `Válvula retirada: ${item.codigoHomologacion}, serie ${item.numeroSerie}, ${item.accion}; cilindro ${item.cilindroCodigo}, serie ${item.cilindroSerie} (ID ${item.cilindroId}).`,
      ),
    ]
      .filter(Boolean)
      .join("\n") || null;
  return {
    documento: {
      numero: `F-${row.id}-1`,
      version: 1,
      plantillaVersion: "ficha-v2",
      emitidaEn: now.toISOString(),
      observaciones: observations,
    },
    servicio: {
      id: String(row.id),
      fecha: day(row.serviceDate),
      descripcion: row.description,
      tipoComercial: row.type,
      operacionCodigo: row.sheetOperation,
      operacionDescripcion: evidence.operationDescription,
      incluyePH: row.includesPh,
      motivoPH: row.phReason,
    },
    habilitacion: {
      fecha: day(prep.enabledOn),
      vencimiento: day(prep.expiresOn),
      obleaAnterior: prep.previousSticker,
      obleaNueva: prep.newSticker,
    },
    pec: actor(prep.pecId),
    taller: actor(prep.tdmId),
    titular: person("TITULAR"),
    contacto: person("CONTACTO"),
    pagador: person("PAGADOR"),
    vehiculo: {
      dominio: row.vehicle.plate,
      marca: row.vehicle.brand,
      modelo: row.vehicle.model,
      motorNumero: row.vehicle.engineNumber,
      chasisNumero: row.vehicle.chassisNumber,
      tipo: row.vehicle.type,
      tipoOtroDetalle: row.vehicle.otherTypeDetail,
      uso: row.vehicle.usage,
      anio: row.vehicle.year,
      inyeccion: row.vehicle.injection,
    },
    reguladores: row.interventions
      .filter((item) => item.type === "REGULADOR")
      .map((item) => ({
        ...base(item),
        condicion: item.condition,
        accion: item.action,
      })),
    cilindros: row.interventions
      .filter((item) => item.type === "CILINDRO")
      .map((item) => ({
        ...base(item),
        condicion: item.condition,
        valvula: (() => {
          const valve = row.interventions.find(
            (candidate) =>
              candidate.type === "VALVULA" &&
              candidate.cylinderId === item.componentId &&
              candidate.finalPosition !== null,
          );
          return valve ? { ...base(valve), accion: valve.action } : null;
        })(),
        fabricacionMes: month(item.manufactureMonth),
        revisionMes: item.performsPh
          ? (item.testDate?.slice(0, 7) ?? null)
          : month(item.revisionMonth),
        crpcCodigo: crpcCode(item.crpcId),
        accion: item.action,
      })),
    valvulas: row.interventions
      .filter((item) => item.type === "VALVULA" && item.finalPosition !== null)
      .map((item) => ({
        ...base(item),
        cilindroId: String(item.cylinderId),
        accion: item.action,
      })),
    valvulasRetiradas: removedValves,
    accesorios: row.interventions
      .filter((item) => item.type === "ACCESORIO")
      .map((item) => ({ ...base(item), descripcion: item.description })),
    revisionesPH: row.interventions
      .filter((item) => item.performsPh)
      .map((item) => ({
        cilindroCodigo: item.homologationCode,
        cilindroSerie: item.serialNumber,
        fechaEnsayo: item.testDate,
        venceEl: day(item.revisionExpiresOn),
        resultado: item.phResult,
        crpcCodigo: crpcCode(item.crpcId),
        numeroCertificado: item.certificateNumber,
      })),
    firmantes: evidence.signers,
    rectificacion: null,
  };
}
