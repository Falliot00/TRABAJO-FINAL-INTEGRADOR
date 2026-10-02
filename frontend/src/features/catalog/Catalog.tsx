import { useState, type FormEvent } from "react";
import type { CatalogOffer } from "@cilgas/contracts";
import { catalogApi } from "../../shared/catalog-api";
import { useRecords } from "../../shared/use-records";
import { Loading, RetryNotice } from "../../shared/ui";
import { CatalogEditor } from "./CatalogEditor";
import { SupplierName } from "./SupplierPicker";
import "../people/people.css";

export function Catalog({
  editable,
  onSessionLost,
}: {
  editable: boolean;
  onSessionLost: () => void;
}) {
  const records = useRecords(catalogApi.list, onSessionLost);
  const [viewing, setViewing] = useState<CatalogOffer | null>(null);
  const [editing, setEditing] = useState<CatalogOffer | "new" | null>(null);
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
          <span className="eyebrow">Ofertas del taller</span>
          <h1>Catálogo</h1>
          <p>Precios y composición habituales para preparar cada trabajo.</p>
        </div>
        {editable && (
          <button
            className="primary"
            disabled={records.loading || editing !== null}
            onClick={() => {
              setEditing("new");
              setViewing(null);
              setNotice("");
            }}
          >
            Nueva oferta
          </button>
        )}
      </header>
      {notice && (
        <div role="status" className="notice notice-success page-notice">
          {notice}
        </div>
      )}
      {editable && editing && (
        <CatalogEditor
          key={editing === "new" ? "new" : editing.id}
          offer={editing === "new" ? null : editing}
          onSessionLost={onSessionLost}
          onExisting={(offer) => {
            records.upsert(offer);
            setEditing(offer);
          }}
          onCancel={() => setEditing(null)}
          onSaved={(offer) => {
            records.upsert(offer);
            setEditing(null);
            setViewing(null);
            setNotice("Oferta guardada correctamente.");
          }}
        />
      )}
      <form className="panel panel-padding records-search" onSubmit={search}>
        <label className="field">
          Buscar ofertas
          <input name="q" placeholder="Código o nombre" maxLength={180} />
        </label>
        <label className="field">
          Estado
          <select name="active">
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </label>
        <button type="submit" className="secondary" disabled={records.loading}>
          Buscar
        </button>
      </form>
      {records.error && (
        <RetryNotice message={records.error} onRetry={records.retry} />
      )}
      <section className="panel" aria-label="Ofertas registradas">
        <div className="section-title">
          <h2>Ofertas registradas</h2>
          <small>{records.items.length} resultados</small>
        </div>
        {records.loading && <Loading />}
        {!records.loading && records.items.length === 0 && (
          <p className="empty-state">No hay ofertas para esta búsqueda.</p>
        )}
        {records.items.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Oferta</th>
                  <th scope="col">Precio sugerido (ARS)</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.items.map((offer) => (
                  <tr key={offer.id}>
                    <td className="records-identity">
                      <strong>{offer.name}</strong>
                      <small>{offer.code}</small>
                    </td>
                    <td>{offer.suggestedPrice}</td>
                    <td>
                      <span
                        className={`status${offer.active ? "" : " status-inactive"}`}
                      >
                        {offer.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>
                      <div className="records-actions">
                        <button
                          className="secondary table-action"
                          aria-label={`Ver composición de ${offer.name}`}
                          onClick={() => setViewing(offer)}
                        >
                          Ver composición
                        </button>
                        {editable && (
                          <button
                            className="secondary table-action"
                            disabled={editing !== null}
                            aria-label={`Editar ${offer.name}`}
                            onClick={() => {
                              setEditing(offer);
                              setViewing(null);
                              setNotice("");
                            }}
                          >
                            Editar
                          </button>
                        )}
                      </div>
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
              Cargar más ofertas
            </button>
          </div>
        )}
      </section>
      {viewing && (
        <section
          className="panel panel-padding records-section"
          aria-label={`Composición de ${viewing.name}`}
        >
          <div className="section-title">
            <h2>{viewing.name}</h2>
            <button className="secondary" onClick={() => setViewing(null)}>
              Cerrar composición
            </button>
          </div>
          <p>{viewing.description}</p>
          <p className="records-description">
            Esta composición es una propuesta. Cada servicio conserva lo
            realmente realizado y sus importes.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Concepto</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Precio unitario (ARS)</th>
                  {editable && <th scope="col">Costo unitario (ARS)</th>}
                  {editable && <th scope="col">Proveedor propuesto</th>}
                </tr>
              </thead>
              <tbody>
                {viewing.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unitPrice}</td>
                    {editable && <td>{item.unitCost ?? "—"}</td>}
                    {editable && (
                      <td>
                        {item.supplierId ? (
                          <SupplierName
                            key={item.supplierId}
                            id={item.supplierId}
                            onSessionLost={onSessionLost}
                          />
                        ) : (
                          "Sin proveedor"
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {viewing.items.length === 0 && <p>Sin composición propuesta.</p>}
        </section>
      )}
    </>
  );
}
