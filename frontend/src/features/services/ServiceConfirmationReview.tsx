import { useEffect, useRef, useState } from "react";
import type {
  ConfirmedService,
  ServiceConfirmationCheck,
  ServiceDraft,
} from "@cilgas/contracts";
import { serviceDraftsApi } from "../../shared/service-drafts-api";
import { ApiError, errorMessage, isSessionLost } from "../../shared/api";
import { ErrorNotice } from "../../shared/ui";
import { ServiceSavedDetails } from "./ServiceSavedDetails";

export function ServiceConfirmationReview({
  draft,
  check,
  canViewCosts,
  onReload,
  onClose,
  onConfirmed,
  onSessionLost,
}: {
  draft: ServiceDraft;
  check: ServiceConfirmationCheck;
  canViewCosts: boolean;
  onReload: () => void;
  onClose: () => void;
  onConfirmed: (service: ConfirmedService) => void;
  onSessionLost: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const outdated = conflict || check.version !== draft.version;
  const canConfirm =
    check.canConfirm && check.blockers.length === 0 && !outdated;
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function confirm() {
    if (!accepted || !canConfirm || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    idempotencyKey.current ??= crypto.randomUUID();
    setPending(true);
    setError("");
    try {
      const service = await serviceDraftsApi.confirm(
        draft.id,
        {
          version: draft.version,
          idempotencyKey: idempotencyKey.current,
          expectedConfigurationId: check.currentConfigurationId,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) onConfirmed(service);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else {
        setError(errorMessage(failure));
        if (
          failure instanceof ApiError &&
          failure.status >= 400 &&
          failure.status < 500
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
    <>
      <ServiceSavedDetails service={draft} canViewCosts={canViewCosts} />
      {check.blockers.length > 0 && (
        <div className="notice notice-info">
          <h3>Pendientes que impiden confirmar</h3>
          <ul>
            {check.blockers.map((blocker) => (
              <li key={`${blocker.code}-${blocker.message}`}>
                <strong>{blocker.code}</strong>: {blocker.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {outdated && (
        <>
          <p>
            Los datos compartidos cambiaron. Conservamos esta revisión; cargá
            los datos actuales antes de confirmar.
          </p>
          <button type="button" className="secondary" onClick={onReload}>
            Volver a revisar
          </button>
        </>
      )}
      {canConfirm && (
        <>
          <p>
            La confirmación conservará la ficha y registrará los efectos
            técnicos y las obligaciones del trabajo. La ficha confirmada no se
            puede editar.
          </p>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={accepted}
              disabled={pending}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            Revisé los datos guardados y confirmo el trabajo realizado
          </label>
          <button
            type="button"
            className="primary"
            disabled={!accepted || pending}
            onClick={() => void confirm()}
          >
            {pending
              ? "Confirmando…"
              : error
                ? "Reintentar confirmación"
                : "Confirmar servicio"}
          </button>
        </>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={onClose}
        >
          Cerrar revisión
        </button>
      </div>
    </>
  );
}
