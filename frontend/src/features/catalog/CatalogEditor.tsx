import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  CatalogOffer,
  CatalogOfferInput,
  ServiceType,
} from "@cilgas/contracts";
import { catalogApi } from "../../shared/catalog-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { ErrorNotice } from "../../shared/ui";
import { CatalogItemEditor } from "./CatalogItemEditor";
import {
  decimal,
  newItem,
  serviceTypes,
  usualComposition,
  type DraftItem,
} from "./catalog-fields";

export function CatalogEditor({
  offer,
  onSaved,
  onCancel,
  onSessionLost,
  onExisting,
}: {
  offer: CatalogOffer | null;
  onSaved: (offer: CatalogOffer) => void;
  onCancel: () => void;
  onSessionLost: () => void;
  onExisting: (offer: CatalogOffer) => void;
}) {
  const [type, setType] = useState<ServiceType>(
    offer?.type ?? "REVISION_ANUAL",
  );
  const [items, setItems] = useState<DraftItem[]>(
    () =>
      offer?.items.map((item) => ({
        ...item,
        key: item.id,
        unitCost: item.unitCost ?? "0",
      })) ?? [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<CatalogOffer | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const body: CatalogOfferInput = {
      code: String(form.get("code")).trim(),
      name: String(form.get("name")).trim(),
      description: String(form.get("description")).trim(),
      type,
      suggestedPrice: decimal(String(form.get("suggestedPrice"))),
      active: form.get("active") === "true",
      items: items.map((item, index) => ({
        ...(item.id ? { id: item.id } : {}),
        order: index + 1,
        description: item.description.trim(),
        type: item.type,
        quantity: decimal(item.quantity),
        unitPrice: decimal(item.unitPrice),
        unitCost: decimal(item.unitCost),
        supplierId: item.supplierId ?? null,
      })),
    };
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setDuplicate(null);
    try {
      const matches = await catalogApi.duplicates(
        body.code,
        offer?.id,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (matches.items[0]) {
        setDuplicate(matches.items[0]);
        setError("Ya existe una oferta con ese código. Recuperá sus datos.");
        return;
      }
      const saved = offer
        ? await catalogApi.update(offer.id, body, controller.signal)
        : await catalogApi.create(body, controller.signal);
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
  function move(index: number, direction: -1 | 1) {
    setItems((current) => {
      const selected = current[index];
      const neighbor = current[index + direction];
      if (!selected || !neighbor) return current;
      const next = [...current];
      next[index] = neighbor;
      next[index + direction] = selected;
      return next;
    });
  }
  return (
    <section
      className="panel panel-padding editor-panel"
      aria-labelledby="catalog-editor-title"
    >
      <h2 id="catalog-editor-title">
        {offer ? "Editar oferta" : "Nueva oferta"}
      </h2>
      <form onSubmit={(event) => void save(event)} aria-busy={pending}>
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Código
            <input
              name="code"
              required
              maxLength={40}
              defaultValue={offer?.code ?? ""}
            />
          </label>
          <label className="field">
            Nombre
            <input
              name="name"
              required
              maxLength={140}
              defaultValue={offer?.name ?? ""}
            />
          </label>
          <label className="field">
            Descripción
            <textarea
              name="description"
              required
              defaultValue={offer?.description ?? ""}
            />
          </label>
          <label className="field">
            Tipo de oferta
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ServiceType)}
            >
              {Object.entries(serviceTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Precio sugerido (ARS)
            <input
              name="suggestedPrice"
              inputMode="decimal"
              pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
              required
              defaultValue={offer?.suggestedPrice ?? ""}
            />
          </label>
          <label className="field">
            Estado de la oferta
            <select name="active" defaultValue={String(offer?.active ?? true)}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </label>
        </fieldset>
        <div className="section-title">
          <h3>Composición propuesta</h3>
          <button
            type="button"
            className="secondary"
            disabled={pending || items.length >= 100}
            onClick={() => setItems((current) => [...current, newItem()])}
          >
            Agregar ítem
          </button>
        </div>
        {(type === "REVISION_ANUAL" || type === "REVISION_QUINQUENAL") && (
          <div className="notice notice-info">
            <p>
              {type === "REVISION_QUINQUENAL"
                ? "La revisión quinquenal propone revisión anual, oblea nueva, PH y reemplazo de válvulas ajustable por cilindro. Ajustá cantidades y conceptos a la oferta habitual; conservar una válvula no genera recambio ni costo."
                : "La revisión anual propone inspección y oblea nueva. Revisá los importes y la composición."}
            </p>
            <button
              className="secondary"
              type="button"
              disabled={pending || items.length > 0}
              onClick={() => setItems(usualComposition(type))}
            >
              Usar propuesta habitual
            </button>
          </div>
        )}
        <p className="records-description">
          Los costos propuestos no crean obligaciones ni pagos. El trabajo
          concreto conservará sus propios datos.
        </p>
        {items.map((item, index) => (
          <CatalogItemEditor
            key={item.key}
            item={item}
            index={index}
            count={items.length}
            disabled={pending}
            onSessionLost={onSessionLost}
            onChange={(updated) =>
              setItems((current) =>
                current.map((entry) =>
                  entry.key === item.key ? updated : entry,
                ),
              )
            }
            onRemove={() =>
              setItems((current) =>
                current.filter((entry) => entry.key !== item.key),
              )
            }
            onMove={(direction) => move(index, direction)}
          />
        ))}
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {duplicate && (
          <button
            className="text-button"
            type="button"
            onClick={() => onExisting(duplicate)}
          >
            Usar oferta existente
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
            {pending ? "Guardando…" : offer ? "Guardar oferta" : "Crear oferta"}
          </button>
        </div>
      </form>
    </section>
  );
}
