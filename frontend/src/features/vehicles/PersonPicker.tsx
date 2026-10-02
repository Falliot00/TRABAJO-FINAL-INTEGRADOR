import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Person } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { peopleApi } from "../../shared/people-api";
import { ErrorNotice } from "../../shared/ui";

interface PersonPickerProps {
  selected: Person | null;
  disabled: boolean;
  onSelect: (person: Person) => void;
  onSessionLost: () => void;
}

export function PersonPicker({
  selected,
  disabled,
  onSelect,
  onSessionLost,
}: PersonPickerProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const searchText = useRef("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const q = String(form.get("personSearch")).trim();
    searchText.current = q;
    void search(q);
  }

  async function search(q: string, cursor?: string) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const page = await peopleApi.list({ q, cursor }, controller.signal);
      if (controller.signal.aborted) return;
      setPeople((current) =>
        cursor ? [...current, ...page.items] : page.items,
      );
      setNextCursor(page.nextCursor);
      setSearched(true);
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
    <div>
      {selected && (
        <p className="notice notice-info">
          Persona seleccionada: <strong>{selected.name}</strong> ·{" "}
          {selected.documentType} {selected.documentNumber}
          {!selected.active &&
            " · Inactiva: reactivala en Personas para asociarla."}
        </p>
      )}
      <form onSubmit={submit}>
        <fieldset className="records-search" disabled={disabled || pending}>
          <label className="field">
            Buscar persona para asociar
            <input
              name="personSearch"
              placeholder="Nombre o documento"
              required
              maxLength={180}
            />
          </label>
          <button type="submit" className="secondary">
            {pending ? "Buscando…" : "Buscar persona"}
          </button>
        </fieldset>
      </form>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {people.length > 0 ? (
        <div className="records-matches">
          <ul>
            {people.map((person) => (
              <li key={person.id}>
                <span>
                  {person.name} · {person.documentType} {person.documentNumber}
                  {!person.active && " · Inactiva"}
                </span>
                <button
                  className="secondary"
                  disabled={disabled || pending || !person.active}
                  onClick={() => onSelect(person)}
                  aria-label={`Seleccionar ${person.name}`}
                >
                  Seleccionar
                </button>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <button
              className="secondary"
              disabled={disabled || pending}
              onClick={() => void search(searchText.current, nextCursor)}
            >
              Más personas
            </button>
          )}
        </div>
      ) : (
        searched &&
        !pending && (
          <p className="records-description">
            No hay coincidencias. Registrá la persona en Personas antes de
            asociarla.
          </p>
        )
      )}
    </div>
  );
}
