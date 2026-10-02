import { useEffect, useState, type FormEvent } from "react";
import type { Person } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { peopleApi, type PeopleQuery } from "../../shared/people-api";
import { Loading, RetryNotice } from "../../shared/ui";
import { PersonEditor } from "./PersonEditor";
import "./people.css";

interface PeopleProps {
  onSessionLost: () => void;
  onOpenVehicles: (person: Person) => void;
}

export function People({ onSessionLost, onOpenVehicles }: PeopleProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState<PeopleQuery>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Person | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void peopleApi
      .list(query, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setPeople((current) =>
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
  }, [query, retry, onSessionLost]);

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
          <h1>Personas</h1>
          <p>Recuperá sus datos y los vehículos relacionados.</p>
        </div>
        <button
          className="primary"
          disabled={loading || creating || editing !== null}
          onClick={() => {
            setCreating(true);
            setNotice("");
          }}
        >
          Nueva persona
        </button>
      </header>
      {notice && (
        <div className="notice notice-success page-notice" role="status">
          {notice}
        </div>
      )}
      {(editing || creating) && (
        <PersonEditor
          key={editing?.id ?? "new"}
          person={editing}
          onSessionLost={onSessionLost}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSelect={(person) => {
            setEditing(person);
            setCreating(false);
            setPeople((current) =>
              current.some((entry) => entry.id === person.id)
                ? current
                : [person, ...current],
            );
          }}
          onSaved={(saved) => {
            setPeople((current) =>
              current.some((person) => person.id === saved.id)
                ? current.map((person) =>
                    person.id === saved.id ? saved : person,
                  )
                : [saved, ...current],
            );
            setEditing(null);
            setCreating(false);
            setNotice("Los datos de la persona se guardaron correctamente.");
          }}
        />
      )}
      <form className="panel panel-padding records-search" onSubmit={search}>
        <label className="field">
          Buscar personas
          <input name="q" placeholder="Nombre o documento" maxLength={180} />
        </label>
        <label className="field">
          Estado
          <select name="active" defaultValue="">
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
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
      <section className="panel" aria-label="Personas registradas">
        <div className="section-title">
          <h2>Personas registradas</h2>
          <small>{people.length} resultados</small>
        </div>
        {loading && !query.cursor ? (
          <Loading />
        ) : people.length === 0 ? (
          <div className="empty-state">No hay personas para esta búsqueda.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Contacto</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <div className="person-cell">
                        <div>
                          <strong>{person.name}</strong>
                          <small>
                            {person.documentType} {person.documentNumber}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{person.phone || person.email || "Sin informar"}</td>
                    <td>
                      <span
                        className={`status${person.active ? "" : " status-inactive"}`}
                      >
                        {person.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>
                      <div className="records-actions">
                        <button
                          className="secondary table-action"
                          disabled={creating || editing !== null}
                          aria-label={`Editar ${person.name}`}
                          onClick={() => {
                            setEditing(person);
                            setNotice("");
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="secondary table-action"
                          onClick={() => onOpenVehicles(person)}
                          aria-label={`Vehículos de ${person.name}`}
                        >
                          Ver vehículos
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
              {loading ? "Cargando…" : "Cargar más personas"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
