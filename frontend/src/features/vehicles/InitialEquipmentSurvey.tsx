import { useEffect, useRef, useState, type FormEvent } from "react";
import type { InitialEquipmentSurveyInput } from "@cilgas/contracts";
import { ApiError, errorMessage, isSessionLost } from "../../shared/api";
import { componentsApi } from "../../shared/components-api";
import { ErrorNotice } from "../../shared/ui";
import { ServiceComponentPicker } from "../services/ServiceReferences";
import { InitialSurveyPair, type SurveyPairDraft } from "./InitialSurveyPair";
import { SurveyStickerFields } from "./SurveyStickerFields";

export function InitialEquipmentSurvey({
  vehicleId,
  onSaved,
  onReload,
  onCancel,
  onSessionLost,
}: {
  vehicleId: string;
  onSaved: () => void;
  onReload: () => void;
  onCancel: () => void;
  onSessionLost: () => void;
}) {
  const [regulatorId, setRegulatorId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<SurveyPairDraft[]>([
    { key: 1, cylinderId: null, valveId: null, knownPh: false, crpcId: null },
  ]);
  const nextPairKey = useRef(2);
  const [knownSticker, setKnownSticker] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const locked = pending || conflict;
  const idempotency = useRef<{ payload: string; key: string } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current || conflict) return;
    if (!regulatorId) {
      setError("Seleccioná el regulador y cada pareja de cilindro y válvula.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim() || null;
    const selectedPairs: InitialEquipmentSurveyInput["pairs"] = [];
    for (const [index, pair] of pairs.entries()) {
      if (!pair.cylinderId || !pair.valveId) {
        setError(
          "Seleccioná el regulador y cada pareja de cilindro y válvula.",
        );
        return;
      }
      selectedPairs.push({
        position: index + 1,
        cylinderId: pair.cylinderId,
        valveId: pair.valveId,
        ...(pair.knownPh
          ? {
              ph: {
                testDate: value(`phTestDate-${pair.key}`),
                expiresOn: value(`phExpiresOn-${pair.key}`),
                result: value(`phResult-${pair.key}`) as
                  "APROBADO" | "RECHAZADO" | null,
                certificateNumber: value(`phCertificate-${pair.key}`),
                crpcId: pair.crpcId,
              },
            }
          : {}),
      });
    }
    const body: Omit<InitialEquipmentSurveyInput, "idempotencyKey"> = {
      regulatorId,
      pairs: selectedPairs,
      ...(knownSticker
        ? {
            sticker: {
              number: value("stickerNumber"),
              enabledOn: value("stickerEnabledOn"),
              expiresOn: value("stickerExpiresOn"),
            },
          }
        : {}),
      notes: value("notes"),
    };
    const payload = JSON.stringify(body);
    if (idempotency.current?.payload !== payload)
      idempotency.current = { payload, key: crypto.randomUUID() };
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      await componentsApi.registerInitialSurvey(
        vehicleId,
        { ...body, idempotencyKey: idempotency.current.key },
        controller.signal,
      );
      if (!controller.signal.aborted) onSaved();
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else {
        setError(errorMessage(failure));
        if (
          failure instanceof ApiError &&
          (failure.status === 409 || failure.status === 403)
        )
          setConflict(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} aria-busy={pending}>
      <h3>Relevamiento inicial del equipo existente</h3>
      <p className="records-description">
        Seleccioná las identidades del equipo que ya tiene el vehículo. El
        relevamiento registra su primera configuración y los antecedentes
        conocidos. No acredita servicios, instalaciones, ensayos ni emisiones de
        oblea anteriores. Una vez guardado, se conserva como historia.
      </p>
      <fieldset className="catalog-item" disabled={locked}>
        <legend>Regulador del equipo</legend>
        <ServiceComponentPicker
          componentId={regulatorId}
          type="REGULADOR"
          disabled={locked}
          onSelect={(component) => setRegulatorId(component.id)}
          onClear={() => setRegulatorId(null)}
          onSessionLost={onSessionLost}
        />
      </fieldset>
      {pairs.map((pair, index) => (
        <InitialSurveyPair
          key={pair.key}
          pair={pair}
          position={index + 1}
          disabled={locked}
          canRemove={pairs.length > 1}
          onChange={(change) =>
            setPairs((current) =>
              current.map((item) =>
                item.key === pair.key ? { ...item, ...change } : item,
              ),
            )
          }
          onRemove={() =>
            setPairs((current) =>
              current.filter((item) => item.key !== pair.key),
            )
          }
          onSessionLost={onSessionLost}
        />
      ))}
      <button
        type="button"
        className="secondary"
        disabled={locked || pairs.length >= 4}
        onClick={() => {
          const key = nextPairKey.current++;
          setPairs((current) => [
            ...current,
            {
              key,
              cylinderId: null,
              valveId: null,
              knownPh: false,
              crpcId: null,
            },
          ]);
        }}
      >
        Agregar pareja
      </button>
      <p className="records-description">
        El equipo admite de una a cuatro parejas cilindro–válvula.
      </p>
      <SurveyStickerFields
        known={knownSticker}
        onChange={setKnownSticker}
        disabled={locked}
      />
      <label className="field">
        Observaciones del relevamiento
        <textarea name="notes" maxLength={4000} disabled={locked} />
      </label>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {conflict && (
        <div className="notice notice-info">
          <p>
            La disponibilidad del equipo o tus permisos cambiaron. Conservamos
            los datos ingresados para que puedas revisarlos; recargá las
            configuraciones antes de continuar.
          </p>
          <button type="button" className="secondary" onClick={onReload}>
            Recargar configuraciones
          </button>
        </div>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar relevamiento
        </button>
        <button type="submit" className="primary" disabled={locked}>
          {pending
            ? "Guardando…"
            : error
              ? "Reintentar relevamiento"
              : "Guardar relevamiento inicial"}
        </button>
      </div>
    </form>
  );
}
