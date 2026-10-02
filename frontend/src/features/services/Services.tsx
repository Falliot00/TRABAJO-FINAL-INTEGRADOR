import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ServiceDraft } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { serviceDraftsApi } from "../../shared/service-drafts-api";
import { useRecords } from "../../shared/use-records";
import { Loading, RetryNotice } from "../../shared/ui";
import "../people/people.css";
import { NewServiceDraft } from "./NewServiceDraft";
import { ServiceDraftEditor } from "./ServiceDraftEditor";
import "./services.css";

export function Services({
  canViewCosts,
  onSessionLost,
}: {
  canViewCosts: boolean;
  onSessionLost: () => void;
}) {
  const records = useRecords(serviceDraftsApi.list, onSessionLost);
  const [editing, setEditing] = useState<ServiceDraft | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [retrieving, setRetrieving] = useState(false);
  const [retrievalError, setRetrievalError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function open(id: string) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setRetrieving(true);
    setRetrievalError(null);
    setNotice("");
    try {
      const draft = await serviceDraftsApi.detail(id, controller.signal);
      if (!controller.signal.aborted) setEditing(draft);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else setRetrievalError({ id, message: errorMessage(failure) });
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setRetrieving(false);
      }
    }
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    records.search({
      q: String(new FormData(event.currentTarget).get("q")).trim(),
    });
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Trabajo compartido del taller</span>
          <h1>Servicios</h1>
          <p>Prepará y continuá los borradores del equipo.</p>
        </div>
        <button
          className="primary"
          disabled={editing !== null || retrieving}
          onClick={() => {
            setEditing("new");
            setNotice("");
          }}
        >
          Nuevo borrador
        </button>
      </header>
      {notice && (
        <div role="status" className="notice notice-success page-notice">
          {notice}
        </div>
      )}
      {editing === "new" && (
        <NewServiceDraft
          onCreated={(draft) => {
            records.upsert(draft);
            setEditing(draft);
          }}
          onCancel={() => setEditing(null)}
          onSessionLost={onSessionLost}
        />
      )}
      {editing && editing !== "new" && (
        <ServiceDraftEditor
          key={`${editing.id}-${editing.version}`}
          draft={editing}
          canViewCosts={canViewCosts}
          onReloaded={(draft) => {
            records.upsert(draft);
            setEditing(draft);
          }}
          onSaved={(draft) => {
            records.upsert(draft);
            setEditing(null);
            setNotice("Borrador guardado correctamente.");
          }}
          onCancel={() => setEditing(null)}
          onSessionLost={onSessionLost}
        />
      )}
      {retrievalError && (
        <RetryNotice
          message={retrievalError.message}
          onRetry={() => void open(retrievalError.id)}
        />
      )}
      <form className="panel panel-padding records-search" onSubmit={search}>
        <label className="field">
          Buscar borradores
          <input
            name="q"
            placeholder="Dominio, persona, documento o descripción"
            maxLength={180}
          />
        </label>
        <button type="submit" className="secondary" disabled={records.loading}>
          Buscar
        </button>
      </form>
      {records.error && (
        <RetryNotice message={records.error} onRetry={records.retry} />
      )}
      <section className="panel" aria-label="Borradores del taller">
        <div className="section-title">
          <h2>Borradores del taller</h2>
          <small>{records.items.length} resultados</small>
        </div>
        {records.loading && <Loading />}
        {!records.loading && records.items.length === 0 && (
          <p className="empty-state">No hay borradores para esta búsqueda.</p>
        )}
        {records.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Servicio</th>
                  <th scope="col">Vehículo</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Total acordado (ARS)</th>
                  <th scope="col">Creado por</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.items.map((draft) => (
                  <tr key={draft.id}>
                    <td className="records-identity">
                      <strong>{draft.description}</strong>
                      <small>Borrador · {draft.id}</small>
                    </td>
                    <td>{draft.vehicle.plate}</td>
                    <td>{draft.serviceDate}</td>
                    <td>{draft.totalAmount}</td>
                    <td>{draft.createdByName}</td>
                    <td>
                      <button
                        className="secondary table-action"
                        disabled={editing !== null || retrieving}
                        aria-label={`Editar borrador ${draft.id}`}
                        onClick={() => void open(draft.id)}
                      >
                        Editar
                      </button>
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
              Cargar más borradores
            </button>
          </div>
        )}
      </section>
    </>
  );
}
