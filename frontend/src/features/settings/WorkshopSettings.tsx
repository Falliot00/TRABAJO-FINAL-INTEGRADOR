import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  RegulatoryActor,
  Workshop,
  WorkshopInput,
} from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { settingsApi } from "../../shared/settings-api";
import { ErrorNotice, Loading, RetryNotice } from "../../shared/ui";

const fields = [
  ["name", "Nombre del taller", 180],
  ["cuit", "CUIT", 20],
  ["address", "Domicilio", 220],
  ["locality", "Localidad", 100],
  ["province", "Provincia", 100],
  ["phone", "Teléfono", 40],
  ["email", "Correo electrónico", 254],
] as const;

export function WorkshopSettings({
  editable,
  onSessionLost,
}: {
  editable: boolean;
  onSessionLost: () => void;
}) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [actors, setActors] = useState<RegulatoryActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      settingsApi.workshop(controller.signal),
      settingsApi.workshopActors(controller.signal),
    ])
      .then(([data, references]) => {
        if (controller.signal.aborted) return;
        setWorkshop(data);
        setActors(references);
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else {
          setLoadError(errorMessage(failure));
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
      activeRequest.current?.abort();
    };
  }, [onSessionLost, retry]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const body: WorkshopInput = { name: String(form.get("name")).trim() };
    for (const [key] of fields)
      if (key !== "name")
        body[key] = String(form.get(key) ?? "").trim() || null;
    body.tdmId = String(form.get("tdmId") ?? "") || null;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const updated = await settingsApi.saveWorkshop(body, controller.signal);
      if (!controller.signal.aborted) {
        setWorkshop(updated);
        setNotice("Datos del taller guardados.");
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

  if (loading) return <Loading />;
  if (loadError)
    return (
      <RetryNotice
        message={loadError}
        onRetry={() => {
          setLoadError("");
          setLoading(true);
          setRetry((value) => value + 1);
        }}
      />
    );
  return (
    <section className="panel panel-padding" aria-label="Datos del taller">
      <h2>Taller</h2>
      {notice && (
        <div className="notice notice-success page-notice" role="status">
          {notice}
        </div>
      )}
      <form onSubmit={(event) => void save(event)} aria-busy={pending}>
        <fieldset className="form-grid" disabled={!editable || pending}>
          {fields.map(([key, label, maxLength]) => (
            <label className="field" key={key}>
              {label}
              <input
                name={key}
                defaultValue={workshop?.[key] ?? ""}
                type={key === "email" ? "email" : "text"}
                required={key === "name"}
                maxLength={maxLength}
              />
            </label>
          ))}
          <div className="field">
            <label htmlFor="workshop-tdm">Taller de Montaje (TdM)</label>
            <select
              id="workshop-tdm"
              name="tdmId"
              aria-describedby="workshop-tdm-hint"
              defaultValue={workshop?.tdmId ?? ""}
            >
              <option value="">Sin seleccionar</option>
              {actors
                .filter((actor) => actor.active || actor.id === workshop?.tdmId)
                .map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.code} · {actor.name}
                    {actor.active ? "" : " (inactivo)"}
                  </option>
                ))}
            </select>
            <span className="field-hint" id="workshop-tdm-hint">
              Seleccioná el actor registrado que corresponda al taller.
            </span>
          </div>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {editable && (
          <div className="form-actions">
            <button className="primary" type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar taller"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
