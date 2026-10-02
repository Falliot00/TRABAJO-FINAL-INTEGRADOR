import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  RegulatoryActor,
  RegulatoryActorInput,
  RegulatoryActorType,
} from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { settingsApi } from "../../shared/settings-api";
import { ErrorNotice } from "../../shared/ui";

const fields = [
  ["code", "Código o matrícula", 40],
  ["name", "Nombre", 180],
  ["cuit", "CUIT", 20],
  ["address", "Domicilio", 220],
  ["locality", "Localidad", 100],
  ["phone", "Teléfono", 40],
  ["technicalResponsible", "Responsable técnico", 140],
  ["responsibleLicense", "Matrícula del responsable", 40],
] as const;

export function RegulatoryActorForm({
  actor,
  onSessionLost,
  onCancel,
  onSaved,
  onExisting,
}: {
  actor: RegulatoryActor | null;
  onSessionLost: () => void;
  onCancel: () => void;
  onSaved: () => void;
  onExisting: (actor: RegulatoryActor) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<RegulatoryActor | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const firstInput = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    firstInput.current?.focus();
    return () => activeRequest.current?.abort();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const body: RegulatoryActorInput = {
      type: form.get("type") as RegulatoryActorType,
      code: String(form.get("code")).trim(),
      name: String(form.get("name")).trim(),
      active: form.get("active") === "true",
    };
    for (const [key] of fields)
      if (key !== "code" && key !== "name")
        body[key] = String(form.get(key) ?? "").trim() || null;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setDuplicate(null);
    try {
      const query = new URLSearchParams({
        q: body.code.toUpperCase(),
        type: body.type,
        limit: "100",
      });
      let cursor: string | null = null;
      do {
        if (cursor) query.set("cursor", cursor);
        const page = await settingsApi.actors(query, controller.signal);
        const existing = page.items.find(
          (item) =>
            item.type === body.type &&
            item.code.toUpperCase() === body.code.toUpperCase() &&
            item.id !== actor?.id,
        );
        if (existing) {
          setDuplicate(existing);
          setError(`Ya existe ${existing.name} con ese tipo y código.`);
          return;
        }
        cursor = page.nextCursor;
      } while (cursor);
      if (actor)
        await settingsApi.updateActor(actor.id, body, controller.signal);
      else await settingsApi.createActor(body, controller.signal);
      if (!controller.signal.aborted) onSaved();
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
  return (
    <section
      className="panel panel-padding editor-panel"
      aria-labelledby="actor-form-title"
    >
      <h2 id="actor-form-title">
        {actor ? "Editar actor regulatorio" : "Nuevo actor regulatorio"}
      </h2>
      <form onSubmit={(event) => void save(event)} aria-busy={pending}>
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Tipo de actor
            <select
              name="type"
              ref={firstInput}
              defaultValue={actor?.type ?? ""}
              required
            >
              <option value="" disabled>
                Seleccionar tipo
              </option>
              <option value="PEC">PEC</option>
              <option value="TDM">Taller de Montaje</option>
              <option value="CRPC">CRPC</option>
            </select>
          </label>
          {fields.map(([key, label, maxLength]) => (
            <label className="field" key={key}>
              {label}
              <input
                name={key}
                required={key === "code" || key === "name"}
                defaultValue={actor?.[key] ?? ""}
                maxLength={maxLength}
              />
            </label>
          ))}
          <label className="field">
            Estado
            <select name="active" defaultValue={String(actor?.active ?? true)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {duplicate && (
          <button
            className="text-button"
            type="button"
            onClick={() => onExisting(duplicate)}
          >
            Usar actor existente
          </button>
        )}
        <div className="form-actions">
          <button
            className="secondary"
            type="button"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button className="primary" type="submit" disabled={pending}>
            {pending ? "Guardando…" : actor ? "Guardar actor" : "Crear actor"}
          </button>
        </div>
      </form>
    </section>
  );
}
