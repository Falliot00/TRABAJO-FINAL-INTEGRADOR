import { useState, type FormEvent } from "react";
import type { Supplier } from "@cilgas/contracts";
import { suppliersApi } from "../../shared/catalog-api";
import { useRecords } from "../../shared/use-records";
import { Loading, RetryNotice } from "../../shared/ui";
import { SupplierEditor } from "./SupplierEditor";
import "../people/people.css";

export function Suppliers({ onSessionLost }: { onSessionLost: () => void }) {
  const records = useRecords(suppliersApi.list, onSessionLost);
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [notice, setNotice] = useState("");
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    records.search({
      q: String(form.get("q")).trim(),
      active: String(form.get("active")),
    });
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Catálogo comercial</span>
          <h1>Proveedores</h1>
          <p>
            Contactos y proveedores propuestos para los costos del catálogo.
          </p>
        </div>
        <button
          className="primary"
          disabled={records.loading || editing !== null}
          onClick={() => {
            setEditing("new");
            setNotice("");
          }}
        >
          Nuevo proveedor
        </button>
      </header>
      {notice && (
        <div role="status" className="notice notice-success page-notice">
          {notice}
        </div>
      )}
      {editing && (
        <SupplierEditor
          key={editing === "new" ? "new" : editing.id}
          supplier={editing === "new" ? null : editing}
          onSessionLost={onSessionLost}
          onExisting={(supplier) => {
            records.upsert(supplier);
            setEditing(supplier);
          }}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            records.upsert(saved);
            setEditing(null);
            setNotice("Proveedor guardado correctamente.");
          }}
        />
      )}
      <form className="panel panel-padding records-search" onSubmit={search}>
        <label className="field">
          Buscar proveedores
          <input name="q" placeholder="Nombre o CUIT" maxLength={180} />
        </label>
        <label className="field">
          Estado
          <select name="active">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        <button type="submit" className="secondary" disabled={records.loading}>
          Buscar
        </button>
      </form>
      {records.error && (
        <RetryNotice message={records.error} onRetry={records.retry} />
      )}
      <section className="panel" aria-label="Proveedores registrados">
        <div className="section-title">
          <h2>Proveedores registrados</h2>
          <small>{records.items.length} resultados</small>
        </div>
        {records.loading && <Loading />}
        {!records.loading && records.items.length === 0 && (
          <p className="empty-state">No hay proveedores para esta búsqueda.</p>
        )}
        {records.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Proveedor</th>
                  <th scope="col">Contacto</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.items.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="records-identity">
                      <strong>{supplier.name}</strong>
                      <small>{supplier.cuit || "Sin CUIT informado"}</small>
                    </td>
                    <td>
                      {supplier.phone || supplier.email || "Sin informar"}
                    </td>
                    <td>
                      <span
                        className={`status${supplier.active ? "" : " status-inactive"}`}
                      >
                        {supplier.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary table-action"
                        disabled={editing !== null}
                        aria-label={`Editar ${supplier.name}`}
                        onClick={() => {
                          setEditing(supplier);
                          setNotice("");
                        }}
                      >
                        Editar
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
              Cargar más proveedores
            </button>
          </div>
        )}
      </section>
    </>
  );
}
