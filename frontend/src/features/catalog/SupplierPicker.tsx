import { useEffect, useState } from "react";
import type { Supplier } from "@cilgas/contracts";
import { suppliersApi } from "../../shared/catalog-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { RecordPicker } from "../../shared/RecordPicker";
import { RetryNotice } from "../../shared/ui";

function loadSuppliers(
  q: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  return suppliersApi.list({ q, cursor, active: "true" }, signal);
}
export function SupplierPicker({
  supplierId,
  disabled,
  onChange,
  onSessionLost,
}: {
  supplierId: string | null;
  disabled: boolean;
  onChange: (id: string | null) => void;
  onSessionLost: () => void;
}) {
  return (
    <div>
      {supplierId ? (
        <div className="notice notice-info">
          <SupplierName
            key={supplierId}
            id={supplierId}
            onSessionLost={onSessionLost}
          />
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Quitar proveedor
          </button>
        </div>
      ) : (
        <p className="records-description">Sin proveedor propuesto.</p>
      )}
      <RecordPicker
        label="Buscar proveedor del ítem"
        searchLabel="Buscar proveedores"
        load={loadSuppliers}
        describe={(supplier) =>
          `${supplier.name}${supplier.cuit ? ` · ${supplier.cuit}` : ""}`
        }
        selectLabel={(supplier) => supplier.name}
        onSelect={(supplier) => onChange(supplier.id)}
        onSessionLost={onSessionLost}
        disabled={disabled}
      />
    </div>
  );
}
export function SupplierName({
  id,
  onSessionLost,
}: {
  id: string;
  onSessionLost: () => void;
}) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void suppliersApi
      .detail(id, controller.signal)
      .then((saved) => {
        if (!controller.signal.aborted) setSupplier(saved);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [id, revision, onSessionLost]);
  if (error)
    return (
      <RetryNotice
        message={error}
        onRetry={() => {
          setError("");
          setRevision((value) => value + 1);
        }}
      />
    );
  return supplier ? (
    <span>
      <strong>{supplier.name}</strong>
      {!supplier.active && " · Inactivo"}
    </span>
  ) : (
    <span>Cargando proveedor…</span>
  );
}
