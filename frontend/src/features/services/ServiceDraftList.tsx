import type { FormEvent } from "react";
import type { ServiceDraft } from "@cilgas/contracts";
import type { useRecords } from "../../shared/use-records";
import { Loading, RetryNotice } from "../../shared/ui";

export function ServiceDraftList({
  records,
  busy,
  onEdit,
  onReview,
}: {
  records: ReturnType<typeof useRecords<ServiceDraft>>;
  busy: boolean;
  onEdit: (id: string) => void;
  onReview: (id: string) => void;
}) {
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    records.search({
      q: String(new FormData(event.currentTarget).get("q")).trim(),
    });
  }
  return (
    <>
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
                        disabled={busy}
                        aria-label={`Editar borrador ${draft.id}`}
                        onClick={() => onEdit(draft.id)}
                      >
                        Editar
                      </button>
                      <button
                        className="secondary table-action"
                        disabled={busy}
                        aria-label={`Revisar confirmación ${draft.id}`}
                        onClick={() => onReview(draft.id)}
                      >
                        Revisar confirmación
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
