import { useEffect, useRef, useState, type FormEvent } from "react";
import type { VehicleDetail, VehicleRelationship } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { vehiclesApi } from "../../shared/people-api";
import { ErrorNotice } from "../../shared/ui";

interface CloseRelationshipProps {
  relationship: VehicleRelationship;
  onSessionLost: () => void;
  onCancel: () => void;
  onSaved: (detail: VehicleDetail) => void;
}

export function CloseRelationship({
  relationship,
  onSessionLost,
  onCancel,
  onSaved,
}: CloseRelationshipProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    dateInput.current?.focus();
    return () => activeRequest.current?.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const detail = await vehiclesApi.closeRelationship(
        relationship.vehicleId,
        relationship.id,
        String(form.get("until")),
        controller.signal,
      );
      if (!controller.signal.aborted) onSaved(detail);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else setError(errorMessage(failure));
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  const minimum = new Date(`${relationship.from}T00:00:00Z`);
  minimum.setUTCDate(minimum.getUTCDate() + 1);

  return (
    <section
      className="records-section notice notice-info"
      aria-label="Confirmar cierre de relación"
    >
      <h3>Cerrar relación con {relationship.person.name}</h3>
      <p>
        La fecha de cierre es exclusiva y debe ser posterior al{" "}
        {relationship.from}. El antecedente permanecerá visible.
      </p>
      <form onSubmit={(event) => void submit(event)} aria-busy={pending}>
        <label className="field">
          Hasta (exclusivo)
          <input
            ref={dateInput}
            name="until"
            type="date"
            required
            min={minimum.toISOString().slice(0, 10)}
            disabled={pending}
          />
        </label>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="confirm-actions">
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar cierre
          </button>
          <button type="submit" className="primary" disabled={pending}>
            {pending ? "Guardando…" : "Confirmar cierre"}
          </button>
        </div>
      </form>
    </section>
  );
}
