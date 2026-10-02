import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  Person,
  VehicleDetail,
  VehiclePersonRole,
  VehicleRelationshipInput,
} from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { vehiclesApi } from "../../shared/people-api";
import { ErrorNotice } from "../../shared/ui";
import { PersonPicker } from "./PersonPicker";

interface RelationshipEditorProps {
  vehicle: VehicleDetail;
  initialPerson?: Person;
  onSessionLost: () => void;
  onSaved: (detail: VehicleDetail) => void;
}

export function RelationshipEditor({
  vehicle,
  initialPerson,
  onSessionLost,
  onSaved,
}: RelationshipEditorProps) {
  const [person, setPerson] = useState<Person | null>(initialPerson ?? null);
  const [confirmation, setConfirmation] =
    useState<VehicleRelationshipInput | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!person) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setConfirmation({
      personId: person.id,
      role: form.get("role") as VehiclePersonRole,
      from: String(form.get("from")),
    });
  }

  async function confirm() {
    if (!confirmation || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const detail = await vehiclesApi.relate(
        vehicle.id,
        confirmation,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setConfirmation(null);
        onSaved(detail);
      }
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

  const previous =
    confirmation?.role === "TITULAR"
      ? vehicle.relationships.find(
          (relationship) =>
            relationship.role === "TITULAR" && relationship.until === null,
        )
      : undefined;

  return (
    <section
      className="records-section"
      aria-label="Asociar persona al vehículo"
    >
      <h3>Asociar persona</h3>
      <PersonPicker
        selected={person}
        disabled={pending || confirmation !== null}
        onSelect={setPerson}
        onSessionLost={onSessionLost}
      />
      <form onSubmit={prepare}>
        <fieldset
          className="form-grid"
          disabled={pending || confirmation !== null}
        >
          <label className="field">
            Relación con el vehículo
            <select name="role" defaultValue="CONTACTO">
              <option value="CONTACTO">Contacto</option>
              <option value="TITULAR">Titular</option>
            </select>
          </label>
          <label className="field">
            Desde
            <input name="from" type="date" required />
          </label>
        </fieldset>
        {!confirmation && (
          <div className="form-actions">
            <button
              type="submit"
              className="primary"
              disabled={!person?.active}
            >
              Asociar persona
            </button>
          </div>
        )}
      </form>
      {confirmation && (
        <section className="notice notice-info" aria-label="Confirmar relación">
          <strong>
            {person?.name} ·{" "}
            {confirmation.role === "TITULAR" ? "Titular" : "Contacto"} desde{" "}
            {confirmation.from}
          </strong>
          {previous && (
            <p>
              La titularidad abierta de {previous.person.name} finalizará el{" "}
              {confirmation.from}. Su historia se conserva.
            </p>
          )}
          <div className="confirm-actions">
            <button
              className="secondary"
              disabled={pending}
              onClick={() => setConfirmation(null)}
            >
              Volver
            </button>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void confirm()}
            >
              {pending ? "Guardando…" : "Confirmar relación"}
            </button>
          </div>
        </section>
      )}
      {error && <ErrorNotice>{error}</ErrorNotice>}
    </section>
  );
}
