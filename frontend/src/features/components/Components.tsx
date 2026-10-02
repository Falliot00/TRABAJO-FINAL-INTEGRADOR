import { useState, type FormEvent } from "react";
import type { Component } from "@cilgas/contracts";
import { componentsApi } from "../../shared/components-api";
import { useRecords } from "../../shared/use-records";
import { Loading, RetryNotice } from "../../shared/ui";
import { ComponentEditor } from "./ComponentEditor";
import { TechnicalHistory } from "./TechnicalHistory";
import "../people/people.css";

function monthLabel(month: string | null) {
  return month ? `${month.slice(5, 7)}/${month.slice(0, 4)}` : "Sin informar";
}
export function Components({ onSessionLost }: { onSessionLost: () => void }) {
  const records = useRecords(componentsApi.list, onSessionLost);
  const [editing, setEditing] = useState<Component | "new" | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    records.search({
      q: String(form.get("q")).trim(),
      type: String(form.get("type")),
    });
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Identidad técnica</span>
          <h1>Componentes</h1>
          <p>
            Cilindros, válvulas y reguladores identificados por modelo y serie.
          </p>
        </div>
        <button
          className="primary"
          disabled={records.loading || editing !== null}
          onClick={() => {
            setEditing("new");
            setNotice("");
          }}
        >
          Nuevo componente
        </button>
      </header>
      {notice && (
        <div role="status" className="notice notice-success page-notice">
          {notice}
        </div>
      )}
      {editing && (
        <ComponentEditor
          key={editing === "new" ? "new" : editing.id}
          component={editing === "new" ? null : editing}
          onSessionLost={onSessionLost}
          onExisting={(component) => {
            records.upsert(component);
            setEditing(component);
          }}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            records.upsert(saved);
            setEditing(null);
            setNotice("Componente guardado correctamente.");
          }}
        />
      )}
      <form className="panel panel-padding records-search" onSubmit={search}>
        <label className="field">
          Buscar componentes
          <input
            name="q"
            placeholder="Serie, homologación, marca o modelo"
            maxLength={180}
          />
        </label>
        <label className="field">
          Tipo de componente
          <select name="type">
            <option value="">Todos</option>
            <option value="CILINDRO">Cilindro</option>
            <option value="VALVULA">Válvula</option>
            <option value="REGULADOR">Regulador</option>
          </select>
        </label>
        <button type="submit" className="secondary" disabled={records.loading}>
          Buscar
        </button>
      </form>
      {records.error && (
        <RetryNotice message={records.error} onRetry={records.retry} />
      )}
      <section className="panel" aria-label="Componentes registrados">
        <div className="section-title">
          <h2>Componentes registrados</h2>
          <small>{records.items.length} resultados</small>
        </div>
        {records.loading && <Loading />}
        {!records.loading && records.items.length === 0 && (
          <p className="empty-state">No hay componentes para esta búsqueda.</p>
        )}
        {records.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Componente</th>
                  <th scope="col">Modelo</th>
                  <th scope="col">Fabricación</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.items.map((item) => (
                  <tr key={item.id}>
                    <td className="records-identity">
                      <strong>{item.serialNumber}</strong>
                      <small>{item.type}</small>
                    </td>
                    <td className="records-identity">
                      {item.model.homologationCode}
                      <small>
                        {item.model.brand} {item.model.model}
                      </small>
                    </td>
                    <td>{monthLabel(item.manufactureMonth)}</td>
                    <td>
                      <div className="records-actions">
                        <button
                          className="secondary table-action"
                          disabled={editing !== null}
                          aria-label={`Editar ${item.serialNumber}`}
                          onClick={() => {
                            setEditing(item);
                            setNotice("");
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="secondary table-action"
                          aria-label={`Ver historia de ${item.serialNumber}`}
                          onClick={() => setHistory(item.id)}
                        >
                          Ver historia
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {records.nextCursor && (
          <div className="panel-padding">
            <button
              className="secondary"
              disabled={records.loading}
              onClick={records.more}
            >
              Cargar más componentes
            </button>
          </div>
        )}
      </section>
      {history && (
        <TechnicalHistory
          key={history}
          id={history}
          kind="component"
          onSessionLost={onSessionLost}
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}
