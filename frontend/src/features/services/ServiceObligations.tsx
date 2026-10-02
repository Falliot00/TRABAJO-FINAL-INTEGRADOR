import { useEffect, useState } from "react";
import type { SupplierObligation } from "@cilgas/contracts";
import { servicesApi } from "../../shared/services-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { Loading, RetryNotice } from "../../shared/ui";

export function ServiceObligations({
  id,
  onSessionLost,
}: {
  id: string;
  onSessionLost: () => void;
}) {
  const [items, setItems] = useState<SupplierObligation[] | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void servicesApi
      .obligations(id, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setItems(page.items);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [id, revision, onSessionLost]);
  return (
    <section
      className="records-section"
      aria-label="Obligaciones con proveedores"
    >
      <h3>Obligaciones con proveedores</h3>
      {error ? (
        <RetryNotice
          message={error}
          onRetry={() => {
            setError("");
            setRevision((value) => value + 1);
          }}
        />
      ) : items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <p>Este servicio no generó obligaciones con proveedores.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.concept}</strong> · Proveedor {item.supplierId} ·{" "}
              {item.amount} ARS
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
