import { useEffect, useState } from "react";
import type { Page } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "./api";
import type { RecordQuery } from "./catalog-api";

export function useRecords<T extends { id: string }>(
  load: (query: RecordQuery, signal: AbortSignal) => Promise<Page<T>>,
  onSessionLost: () => void,
) {
  const [items, setItems] = useState<T[]>([]);
  const [query, setQuery] = useState<RecordQuery>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void load(query, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setItems((current) =>
          query.cursor
            ? [
                ...new Map(
                  [...current, ...page.items].map((item) => [item.id, item]),
                ).values(),
              ]
            : page.items,
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
  }, [load, query, revision, onSessionLost]);
  function search(next: RecordQuery) {
    setLoading(true);
    setError("");
    if (!next.cursor) {
      setItems([]);
      setNextCursor(null);
    }
    setQuery(next);
  }
  function upsert(saved: T) {
    setItems((current) =>
      current.some((item) => item.id === saved.id)
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current],
    );
  }
  return {
    items,
    loading,
    error,
    nextCursor,
    search,
    upsert,
    retry: () => {
      setError("");
      setLoading(true);
      setRevision((value) => value + 1);
    },
    more: () => {
      if (nextCursor) search({ ...query, cursor: nextCursor });
    },
  };
}
