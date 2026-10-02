import { useEffect, useState, type FormEvent } from "react";
import type { ComponentModel } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { settingsApi } from "../../shared/settings-api";
import { Loading, RetryNotice } from "../../shared/ui";
import { ComponentModelForm } from "./ComponentModelForm";

export function ComponentModels({
  editable,
  onSessionLost,
}: {
  editable: boolean;
  onSessionLost: () => void;
}) {
  const [items, setItems] = useState<ComponentModel[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState({ q: "", type: "", cursor: "" });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<ComponentModel | "new" | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "25" });
    for (const [key, value] of Object.entries(query))
      if (value) params.set(key, value);
    void settingsApi
      .models(params, controller.signal)
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
      {editing && (
        <ComponentModelForm
          key={editing === "new" ? "new" : editing.id}
          model={editing === "new" ? null : editing}
          onSessionLost={onSessionLost}
          onExisting={setEditing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setNotice(
              editing === "new"
                ? "Modelo de componente creado."
                : "Modelo de componente actualizado.",
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
        aria-label="Modelos de componentes"
      >
        <div className="section-title">
          <h2>Modelos de componentes</h2>
          {editable && (
            <button
              className="primary"
              disabled={loading || editing !== null}
              onClick={() => {
                setEditing("new");
                setNotice("");
              }}
            >
              Nuevo modelo
            </button>
          )}
        </div>
        <p className="settings-description">
          Referencias técnicas de cilindros, válvulas y reguladores.
        </p>
        <form
          className="settings-search"
          key={`${query.q}:${query.type}`}
          onSubmit={search}
        >
          <label className="field">
            Buscar modelos
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Homologación, marca o modelo"
            />
          </label>
          <label className="field">
            Filtrar por tipo
            <select name="type" defaultValue={query.type}>
              <option value="">Todos</option>
              <option value="CILINDRO">Cilindro</option>
              <option value="VALVULA">Válvula</option>
              <option value="REGULADOR">Regulador</option>
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
            No se encontraron modelos de componentes.
          </div>
        )}
        {items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Tipo y homologación</th>
                  <th scope="col">Marca y modelo</th>
                  <th scope="col">Capacidad (L)</th>
                  <th scope="col">Estado</th>
                  {editable && <th scope="col">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((model) => (
                  <tr key={model.id}>
                    <td>
                      {model.type} · {model.homologationCode}
                    </td>
                    <td>
                      {model.brand ?? "Sin marca informada"}
                      <small>{model.model}</small>
                    </td>
                    <td>{model.capacityLiters ?? "—"}</td>
                    <td>
                      <span
                        className={`status${model.active ? "" : " status-inactive"}`}
                      >
                        {model.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {editable && (
                      <td>
                        <button
                          className="secondary table-action"
                          disabled={editing !== null}
                          aria-label={`Editar ${model.homologationCode}`}
                          onClick={() => {
                            setEditing(model);
                            setNotice("");
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    )}
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
              Cargar más modelos
            </button>
          </div>
        )}
      </section>
    </>
  );
}
