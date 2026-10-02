import { useEffect, useState, type FormEvent } from "react";
import type { RegulatoryActor } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { settingsApi } from "../../shared/settings-api";
import { Loading, RetryNotice } from "../../shared/ui";
import { RegulatoryActorForm } from "./RegulatoryActorForm";
import { RegulatoryActorDetails } from "./RegulatoryActorDetails";

export function RegulatoryActors({
  editable,
  onSessionLost,
}: {
  editable: boolean;
  onSessionLost: () => void;
}) {
  const [items, setItems] = useState<RegulatoryActor[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState({ q: "", type: "", cursor: "" });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<RegulatoryActor | "new" | null>(null);
  const [viewing, setViewing] = useState<RegulatoryActor | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "25" });
    for (const [key, value] of Object.entries(query))
      if (value) params.set(key, value);
    void settingsApi
      .actors(params, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setItems((previous) =>
          query.cursor ? [...previous, ...page.items] : page.items,
        );
        setNextCursor(page.nextCursor);
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else {
          setError(errorMessage(failure));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [query, revision, onSessionLost]);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setLoading(true);
    setQuery({
      q: String(form.get("q")).trim(),
      type: String(form.get("type")),
      cursor: "",
    });
  }
  return (
    <>
      {notice && (
        <div className="notice notice-success page-notice" role="status">
          {notice}
        </div>
      )}
      {viewing && (
        <RegulatoryActorDetails
          actor={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      {editing && (
        <RegulatoryActorForm
          key={editing === "new" ? "new" : editing.id}
          actor={editing === "new" ? null : editing}
          onSessionLost={onSessionLost}
          onExisting={setEditing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setNotice(
              editing === "new"
                ? "Actor regulatorio creado."
                : "Actor regulatorio actualizado.",
            );
            setEditing(null);
            setQuery({ q: "", type: "", cursor: "" });
            setLoading(true);
            setRevision((value) => value + 1);
          }}
        />
      )}
      <section
        className="panel settings-records"
        aria-label="Actores regulatorios"
      >
        <div className="section-title">
          <h2>Actores regulatorios</h2>
          {editable && (
            <button
              className="primary"
              disabled={loading || editing !== null}
              onClick={() => {
                setEditing("new");
                setViewing(null);
                setNotice("");
              }}
            >
              Nuevo actor
            </button>
          )}
        </div>
        <p className="settings-description">
          PEC, Talleres de Montaje y CRPC con sus responsables técnicos.
        </p>
        <form
          className="settings-search"
          key={`${query.q}:${query.type}`}
          onSubmit={search}
        >
          <label className="field">
            Buscar actores
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Código o nombre"
            />
          </label>
          <label className="field">
            Filtrar por tipo
            <select name="type" defaultValue={query.type}>
              <option value="">Todos</option>
              <option value="PEC">PEC</option>
              <option value="TDM">Taller de Montaje</option>
              <option value="CRPC">CRPC</option>
            </select>
          </label>
          <button className="secondary" type="submit" disabled={loading}>
            Buscar
          </button>
        </form>
        {error && (
          <RetryNotice
            message={error}
            onRetry={() => {
              setError("");
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          />
        )}
        {loading && <Loading />}
        {!loading && items.length === 0 && (
          <div className="empty-state">
            No se encontraron actores regulatorios.
          </div>
        )}
        {items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Tipo y código</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Responsable técnico</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((actor) => (
                  <tr key={actor.id}>
                    <td>
                      {actor.type} · {actor.code}
                    </td>
                    <td>
                      {actor.name}
                      <small>{actor.locality}</small>
                    </td>
                    <td>
                      {actor.technicalResponsible ?? "Sin informar"}
                      {actor.responsibleLicense && (
                        <small>{actor.responsibleLicense}</small>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status${actor.active ? "" : " status-inactive"}`}
                      >
                        {actor.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="settings-row-actions">
                        <button
                          className="secondary table-action"
                          disabled={editing !== null}
                          aria-label={`Ver ${actor.name}`}
                          onClick={() => setViewing(actor)}
                        >
                          Ver detalle
                        </button>
                        {editable && (
                          <button
                            className="secondary table-action"
                            disabled={editing !== null}
                            aria-label={`Editar ${actor.name}`}
                            onClick={() => {
                              setEditing(actor);
                              setViewing(null);
                              setNotice("");
                            }}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextCursor && (
          <div className="settings-footer">
            <button
              className="secondary"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setQuery((value) => ({ ...value, cursor: nextCursor }));
              }}
            >
              Cargar más actores
            </button>
          </div>
        )}
      </section>
    </>
  );
}
