import { useState, type FormEvent } from "react";
import { servicesApi } from "../../shared/services-api";
import { useRecords } from "../../shared/use-records";
import { Loading, RetryNotice } from "../../shared/ui";
import { ConfirmedServiceDetails } from "./ConfirmedServiceDetails";

export function ConfirmedServices({
  canViewCosts,
  onSessionLost,
}: {
  canViewCosts: boolean;
  onSessionLost: () => void;
}) {
  const records = useRecords(servicesApi.list, onSessionLost);
  const [selected, setSelected] = useState<string | null>(null);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    records.search({
      q: String(new FormData(event.currentTarget).get("q")).trim(),
    });
  }
  return (
    <section aria-label="Servicios confirmados" className="records-section">
      <h2>Servicios confirmados</h2>
      {selected && (
        <ConfirmedServiceDetails
          key={selected}
          id={selected}
          canViewCosts={canViewCosts}
          onSessionLost={onSessionLost}
          onClose={() => setSelected(null)}
        />
      )}
      <form className="panel panel-padding records-search" onSubmit={search}>
        <label className="field">
          Buscar servicios confirmados
          <input
            name="q"
            placeholder="Dominio, persona o descripción"
            maxLength={180}
          />
        </label>
        <button className="secondary" type="submit" disabled={records.loading}>
          Buscar confirmados
        </button>
      </form>
      {records.error && (
        <RetryNotice message={records.error} onRetry={records.retry} />
      )}
      {records.loading && <Loading />}
      {!records.loading && records.items.length === 0 && (
        <p className="empty-state">
          No hay servicios confirmados para esta búsqueda.
        </p>
      )}
      {records.items.length > 0 && (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Vehículo</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.items.map((service) => (
                <tr key={service.id}>
                  <td>
                    {service.description} · {service.id}
                  </td>
                  <td>{service.vehicle.plate}</td>
                  <td>{service.serviceDate}</td>
                  <td>
                    <button
                      className="secondary table-action"
                      aria-label={`Ver ficha del servicio ${service.id}`}
                      onClick={() => setSelected(service.id)}
                    >
                      Ver ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {records.nextCursor && (
        <button
          className="secondary"
          disabled={records.loading}
          onClick={records.more}
        >
          Cargar más confirmados
        </button>
      )}
    </section>
  );
}
