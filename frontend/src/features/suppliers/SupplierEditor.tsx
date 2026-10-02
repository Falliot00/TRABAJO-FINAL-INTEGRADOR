import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Supplier, SupplierInput } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { suppliersApi } from "../../shared/catalog-api";
import { ErrorNotice } from "../../shared/ui";

export function SupplierEditor({
  supplier,
  onSaved,
  onCancel,
  onSessionLost,
  onExisting,
}: {
  supplier: Supplier | null;
  onSaved: (saved: Supplier) => void;
  onCancel: () => void;
  onSessionLost: () => void;
  onExisting: (supplier: Supplier) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<Supplier | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const data = new FormData(event.currentTarget);
    const optional = (name: string) =>
      String(data.get(name) ?? "").trim() || null;
    const body: SupplierInput = {
      name: String(data.get("name")).trim(),
      cuit: optional("cuit"),
      phone: optional("phone"),
      email: optional("email"),
      notes: optional("notes"),
      active: data.get("active") === "true",
    };
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setDuplicate(null);
    try {
      if (body.cuit && body.cuit.replace(/[.\s-]/g, "") !== supplier?.cuit) {
        const matches = await suppliersApi.duplicates(
          body.cuit,
          supplier?.id,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (matches.items[0]) {
          setDuplicate(matches.items[0]);
          setError("Ya existe un proveedor con ese CUIT. Recuperá sus datos.");
          return;
        }
      }
      const saved = supplier
        ? await suppliersApi.update(supplier.id, body, controller.signal)
        : await suppliersApi.create(body, controller.signal);
      if (!controller.signal.aborted) onSaved(saved);
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
    <section
      className="panel panel-padding editor-panel"
      aria-labelledby="supplier-editor-title"
    >
      <h2 id="supplier-editor-title">
        {supplier ? "Editar proveedor" : "Nuevo proveedor"}
      </h2>
      <form onSubmit={(event) => void save(event)} aria-busy={pending}>
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Nombre o razón social
            <input
              name="name"
              required
              maxLength={180}
              defaultValue={supplier?.name ?? ""}
            />
          </label>
          <label className="field">
            CUIT
            <input
              name="cuit"
              maxLength={20}
              defaultValue={supplier?.cuit ?? ""}
            />
          </label>
          <label className="field">
            Teléfono
            <input
              name="phone"
              maxLength={40}
              defaultValue={supplier?.phone ?? ""}
            />
          </label>
          <label className="field">
            Correo electrónico
            <input
              name="email"
              type="email"
              maxLength={254}
              defaultValue={supplier?.email ?? ""}
            />
          </label>
          <label className="field">
            Observaciones
            <textarea name="notes" defaultValue={supplier?.notes ?? ""} />
          </label>
          <label className="field">
            Estado del proveedor
            <select
              name="active"
              defaultValue={String(supplier?.active ?? true)}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {duplicate && (
          <button
            className="text-button"
            type="button"
            onClick={() => onExisting(duplicate)}
          >
            Usar proveedor existente
          </button>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={pending}>
            {pending
              ? "Guardando…"
              : supplier
                ? "Guardar proveedor"
                : "Crear proveedor"}
          </button>
        </div>
      </form>
    </section>
  );
}
