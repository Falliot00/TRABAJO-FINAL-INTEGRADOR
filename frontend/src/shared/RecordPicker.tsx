import { useEffect, useRef, useState } from "react";
import type { Page } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "./api";
import { ErrorNotice } from "./ui";

export function RecordPicker<T extends { id: string }>({
  label,
  searchLabel,
  load,
  describe,
  selectLabel,
  onSelect,
  onSessionLost,
  disabled = false,
}: {
  label: string;
  searchLabel: string;
  load: (
    q: string,
    cursor: string | undefined,
    signal: AbortSignal,
  ) => Promise<Page<T>>;
  describe: (item: T) => string;
  selectLabel: (item: T) => string;
  onSelect: (item: T) => void;
  onSessionLost: () => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const lastQuery = useRef("");
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function search(cursor?: string) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    const searchText = cursor ? lastQuery.current : q.trim();
    lastQuery.current = searchText;
    try {
      const page = await load(searchText, cursor, controller.signal);
      if (controller.signal.aborted) return;
      setItems((current) =>
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
        setPending(false);
        activeRequest.current = null;
      }
    }
  }
  return (
    <div className="records-picker">
      <div className="records-search">
        <label className="field">
          {label}
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            maxLength={180}
            disabled={disabled || pending}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="secondary"
          disabled={disabled || pending}
          onClick={() => void search()}
        >
          {searchLabel}
        </button>
      </div>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {items.length > 0 && (
        <ul className="picker-results">
          {items.map((item) => (
            <li key={item.id}>
              <span>{describe(item)}</span>
              <button
                type="button"
                className="secondary"
                aria-label={`Seleccionar ${selectLabel(item)}`}
                disabled={disabled || pending}
                onClick={() => onSelect(item)}
              >
                Seleccionar
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && !pending && items.length === 0 && (
        <p className="records-description">
          No hay coincidencias activas. Registrá la referencia antes de
          seleccionarla.
        </p>
      )}
      {nextCursor && (
        <button
          type="button"
          className="secondary"
          disabled={disabled || pending}
          onClick={() => void search(nextCursor)}
        >
          Más resultados
        </button>
      )}
    </div>
  );
}
