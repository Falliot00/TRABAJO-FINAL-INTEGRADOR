import { useEffect, useState, type FormEvent } from "react";
import type { Person, Vehicle } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { vehiclesApi, type VehiclesQuery } from "../../shared/people-api";
import { Loading, RetryNotice } from "../../shared/ui";
import { VehicleEditor } from "./VehicleEditor";
import { VehiclePeople } from "./VehiclePeople";
import "../people/people.css";

interface VehiclesProps {
  onSessionLost: () => void;
  person?: Person;
}

export function Vehicles({ onSessionLost, person }: VehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState<VehiclesQuery>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void vehiclesApi
      .list({ ...query, personId: person?.id }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setVehicles((current) =>
          query.cursor ? [...current, ...page.items] : page.items,
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
  }, [query, person?.id, retry, onSessionLost]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    setQuery({
      q: String(form.get("q")).trim(),
      active: String(form.get("active")),
    });
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Atención del taller</span>
          <h1>Vehículos</h1>
          <p>
            {person
              ? `Vehículos relacionados con ${person.name}, incluidos sus antecedentes.`
              : "Buscá por dominio y recuperá los datos del vehículo."}
          </p>
        </div>
        <button
          className="primary"
          disabled={loading || creating || editing !== null}
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
            setNotice("");
          }}
        >
          Nuevo vehículo
        </button>
      </header>
      {notice && (
        <div className="notice notice-success page-notice" role="status">
          {notice}
        </div>
      )}
      {(editing || creating) && (
        <VehicleEditor
          key={editing?.id ?? "new"}
          vehicle={editing}
          onSessionLost={onSessionLost}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSelect={(vehicle) => {
            setEditing(vehicle);
            setCreating(false);
            setSelectedId(vehicle.id);
          }}
          onSaved={(saved) => {
            setVehicles((current) =>
              current.some((vehicle) => vehicle.id === saved.id)
                ? current.map((vehicle) =>
                    vehicle.id === saved.id ? saved : vehicle,
                  )
                : person
                  ? current
                  : [saved, ...current],
            );
            if (creating) setSelectedId(saved.id);
            setEditing(null);
            setCreating(false);
            setNotice(
              creating
                ? "El vehículo se creó. Asociá su titular o contacto para completar el registro."
                : "Los datos del vehículo se guardaron correctamente.",
            );
          }}
        />
      )}
      {selectedId && !editing && !creating && (
        <VehiclePeople
          key={selectedId}
          vehicleId={selectedId}
          initialPerson={person}
          onSessionLost={onSessionLost}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            setLoading(true);
            setNotice("");
            setQuery((current) => ({ ...current, cursor: undefined }));
          }}
        />
      )}
      <form className="panel panel-padding records-search" onSubmit={search}>
        <label className="field">
          Buscar vehículos
          <input
            name="q"
            placeholder="Dominio, marca o modelo"
            maxLength={180}
          />
        </label>
        <label className="field">
          Estado
          <select name="active" defaultValue="">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        <button type="submit" className="primary" disabled={loading}>
          Buscar
        </button>
      </form>
      {error && (
        <RetryNotice
          message={error}
          onRetry={() => {
            setLoading(true);
            setError("");
            setRetry((value) => value + 1);
          }}
        />
      )}
      <section className="panel" aria-label="Vehículos registrados">
        <div className="section-title">
          <h2>Vehículos registrados</h2>
          <small>{vehicles.length} resultados</small>
        </div>
        {loading && !query.cursor ? (
          <Loading />
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            No hay vehículos para esta búsqueda.
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Dominio</th>
                  <th scope="col">Vehículo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <strong>{vehicle.plate}</strong>
                    </td>
                    <td>
                      {vehicle.brand} {vehicle.model} · {vehicle.year}
                    </td>
                    <td>
                      <span
                        className={`status${vehicle.active ? "" : " status-inactive"}`}
                      >
                        {vehicle.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="records-actions">
                        <button
                          className="secondary table-action"
                          disabled={creating || editing !== null}
                          aria-label={`Editar ${vehicle.plate}`}
                          onClick={() => {
                            setEditing(vehicle);
                            setSelectedId(null);
                            setNotice("");
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="secondary table-action"
                          disabled={creating || editing !== null}
                          aria-label={`Personas e historia de ${vehicle.plate}`}
                          onClick={() => {
                            setSelectedId(vehicle.id);
                            setNotice("");
                          }}
                        >
                          Personas e historia
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextCursor && (
          <div className="panel-padding">
            <button
              className="secondary"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setQuery({ ...query, cursor: nextCursor });
              }}
            >
              {loading ? "Cargando…" : "Cargar más vehículos"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
