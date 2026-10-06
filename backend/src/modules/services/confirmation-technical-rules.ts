import type { ConfirmationBlocker } from "@cilgas/contracts";
import type { Prisma } from "../../generated/prisma/client";
import type { DraftRow } from "./service-drafts.service";
import { monthEnd } from "./dto";
import {
  latestPhAntecedent,
  latestStickerAntecedent,
} from "./technical-antecedents";

const day = (value: Date) => value.toISOString().slice(0, 10);

/** Contrasta la operación con los hechos del servicio y antecedentes conocidos. */
export async function technicalRules(
  tx: Prisma.TransactionClient,
  row: DraftRow,
) {
  const blockers: ConfirmationBlocker[] = [];
  const block = (code: string, message: string) =>
    blockers.push({ code, message });
  const prep = row.preparation;
  const operation = row.sheetOperation;
  const serviceDay = day(row.serviceDate);
  let expiredPhAntecedents = 0;
  const emits = ["C", "M", "R"].includes(operation ?? "") || row.includesPh;
  if (prep?.enabledOn && day(prep.enabledOn) !== serviceDay)
    block(
      "HABILITACION_FECHA",
      "La habilitación debe coincidir con la fecha del trabajo.",
    );
  if (emits && (!prep?.newSticker || !prep.enabledOn || !prep.expiresOn))
    block(
      "OBLEA_INCOMPLETA",
      "Complete número de oblea nueva, habilitación y vencimiento.",
    );
  if (
    emits &&
    prep?.expiresOn &&
    day(prep.expiresOn) !== day(monthEnd(serviceDay, 1))
  )
    block(
      "VENCIMIENTO_OBLEA",
      "La oblea vence al finalizar el mismo mes del año siguiente al trabajo.",
    );
  if (
    ["D", "B"].includes(operation ?? "") &&
    (row.includesPh || prep?.newSticker || prep?.expiresOn)
  )
    block(
      "RETIRO_SIN_EMISION",
      "Desmontaje y baja no emiten oblea ni presumen una PH.",
    );
  if (
    (operation === "C" && (!row.includesPh || row.phReason !== "CONVERSION")) ||
    (row.includesPh &&
      ((operation === "M" && row.phReason !== "MODIFICACION") ||
        (operation === "R" &&
          !["VENCIMIENTO", "SERVICIO_PH"].includes(row.phReason ?? "")) ||
        !["C", "M", "R"].includes(operation ?? ""))) ||
    (!row.includesPh && row.phReason)
  )
    block(
      "OPERACION_PH",
      "Conversión usa C + PH; modificación con PH usa M; PH por servicio o vencimiento usa R, incluso con oblea vigente. Indique el motivo real.",
    );
  if (
    row.type === "MODIFICACION" &&
    operation === "R" &&
    (!row.includesPh || row.phReason !== "VENCIMIENTO")
  )
    block(
      "OPERACION_INCONSISTENTE",
      "Una modificación usa M; la PH motivada por vencimiento usa R.",
    );

  const sticker = await latestStickerAntecedent(tx, row.vehicleId);
  if (prep && sticker) {
    prep.previousSticker ??= sticker.number;
    prep.previousStickerExpiresOn ??= sticker.expires;
  }
  if (emits && prep?.newSticker === prep?.previousSticker)
    block(
      "OBLEA_NUEVA_REQUERIDA",
      "La oblea nueva debe tener un número distinto del antecedente.",
    );
  if (
    sticker &&
    ((sticker.number &&
      prep?.previousSticker &&
      prep.previousSticker !== sticker.number) ||
      (prep?.previousStickerExpiresOn &&
        sticker.expires &&
        day(prep.previousStickerExpiresOn) !== day(sticker.expires)) ||
      (sticker.enabled && sticker.enabled > row.serviceDate))
  )
    block(
      "ANTECEDENTE_OBLEA_INCONSISTENTE",
      "La oblea anterior o su vigencia contradicen el antecedente registrado del vehículo.",
    );
  if (
    operation === "M" &&
    (!prep?.previousSticker ||
      !(sticker?.expires ?? prep.previousStickerExpiresOn) ||
      (sticker?.expires ?? prep.previousStickerExpiresOn)! < row.serviceDate)
  )
    block(
      "OBLEA_ANTERIOR_VIGENTE",
      "Una modificación requiere identificar la oblea anterior y acreditar que sigue vigente hasta el final de su mes.",
    );

  for (const item of row.interventions.filter(
    (candidate) => candidate.type === "CILINDRO",
  )) {
    if (item.performsPh && item.testDate) {
      if (
        item.testDate > serviceDay.slice(0, item.testDate.length) ||
        (item.manufactureMonth &&
          day(item.manufactureMonth).slice(0, 7) > item.testDate.slice(0, 7))
      )
        block(
          "FECHA_PH",
          "El ensayo no puede ser posterior al trabajo ni anterior a la fabricación del cilindro.",
        );
      if (
        item.phResult === "APROBADO" &&
        item.revisionExpiresOn &&
        day(item.revisionExpiresOn) !== day(monthEnd(item.testDate, 5))
      )
        block(
          "VENCIMIENTO_PH",
          "La PH aprobada vence al finalizar el mismo mes cinco años después del ensayo.",
        );
      if (item.phResult === "RECHAZADO" && item.revisionExpiresOn)
        block(
          "PH_RECHAZADA_SIN_VIGENCIA",
          "Una PH rechazada no habilita un nuevo plazo de vigencia.",
        );
    }
    const prior = item.componentId
      ? await latestPhAntecedent(tx, item.componentId)
      : null;
    // Sólo completa la representación de confirmación desde historia inmutable;
    // no modifica el borrador guardado ni reemplaza datos explícitos contradictorios.
    if (!item.performsPh && prior) {
      if (prior.date)
        item.revisionMonth ??= new Date(
          `${prior.date.slice(0, 7)}-01T00:00:00.000Z`,
        );
      item.crpcId ??= prior.crpcId;
    }
    const providedMonth = item.revisionMonth
      ? day(item.revisionMonth).slice(0, 7)
      : null;
    // En datos previos se usaba Revisado también para el ensayo actual: no reinterpretarlo como antecedente anterior.
    const antecedentMonth =
      item.performsPh && providedMonth === item.testDate?.slice(0, 7)
        ? null
        : providedMonth;
    if (
      prior?.date &&
      antecedentMonth &&
      antecedentMonth !== prior.date.slice(0, 7)
    )
      block(
        "ANTECEDENTE_PH_INCONSISTENTE",
        "El mes de última PH contradice la revisión registrada del cilindro.",
      );
    if (
      prior &&
      ((prior.date && prior.date > serviceDay.slice(0, prior.date.length)) ||
        (prior.serviceDate && prior.serviceDate > row.serviceDate) ||
        (item.performsPh &&
          item.testDate &&
          prior.date &&
          (prior.date.slice(0, 7) > item.testDate.slice(0, 7) ||
            (prior.date.length === 10 &&
              item.testDate.length === 10 &&
              prior.date > item.testDate))))
    )
      block(
        "ANTECEDENTE_PH_INCONSISTENTE",
        "La PH registrada del cilindro es posterior a este trabajo.",
      );
    const previousExpiry =
      prior?.expires ?? (antecedentMonth ? monthEnd(antecedentMonth, 5) : null);
    const incompletePrior =
      prior && (!prior.date || !prior.crpcId || !prior.result);
    if (prior?.ambiguous && !item.performsPh)
      block(
        "ANTECEDENTE_PH_INCONSISTENTE",
        "La precisión conocida no permite ordenar antecedentes de PH contradictorios del mismo mes.",
      );
    if (item.performsPh && previousExpiry && previousExpiry < row.serviceDate)
      expiredPhAntecedents += 1;
    if (
      item.performsPh &&
      ["VENCIMIENTO", "MODIFICACION"].includes(row.phReason ?? "")
    ) {
      if (
        !previousExpiry ||
        incompletePrior ||
        prior?.ambiguous ||
        (!prior && !item.crpcId)
      )
        block(
          "PH_ANTECEDENTE_REQUERIDO",
          "El motivo de la PH requiere conocer la última prueba y su CRPC.",
        );
      else if (
        row.phReason === "MODIFICACION" &&
        previousExpiry < row.serviceDate
      )
        block(
          "MOTIVO_PH_INCONSISTENTE",
          "El motivo informado no coincide con la vigencia de la PH anterior al día del trabajo.",
        );
    }
    if (!item.performsPh && item.finalPosition !== null) {
      if (!item.revisionMonth || !item.crpcId)
        block(
          "PH_DOCUMENTACION_INCOMPLETA",
          "Complete el mes y CRPC de la última PH para conservarlos en la ficha; puede consultar el antecedente registrado.",
        );
      if (prior && item.crpcId && prior.crpcId !== item.crpcId)
        block(
          "ANTECEDENTE_PH_INCONSISTENTE",
          "El CRPC de la última PH no coincide con el antecedente registrado.",
        );
      if (!previousExpiry || incompletePrior || (!prior && !item.crpcId))
        block(
          "PH_ANTECEDENTE_REQUERIDO",
          "Registre la última PH y su CRPC para el cilindro que permanece instalado.",
        );
      else if (
        previousExpiry < row.serviceDate ||
        prior?.result === "RECHAZADO"
      )
        block(
          "PH_VENCIDA",
          "Un cilindro con PH vencida o rechazada requiere una nueva prueba aprobada para permanecer instalado.",
        );
    }
    if (operation === "C" && item.finalPosition !== null && !item.performsPh)
      block(
        "CONVERSION_PH_REQUERIDA",
        "La conversión incluye la PH de cada cilindro instalado.",
      );
  }
  if (row.includesPh && row.phReason === "VENCIMIENTO" && !expiredPhAntecedents)
    block(
      "MOTIVO_PH_INCONSISTENTE",
      "La PH por vencimiento requiere al menos un cilindro cuya prueba anterior esté vencida.",
    );
  return blockers;
}
