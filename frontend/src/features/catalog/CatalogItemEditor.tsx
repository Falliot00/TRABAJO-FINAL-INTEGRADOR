import type { CatalogItemType } from "@cilgas/contracts";
import { itemTypes, type DraftItem } from "./catalog-fields";
import { SupplierPicker } from "./SupplierPicker";

export function CatalogItemEditor({
  item,
  index,
  count,
  disabled,
  onChange,
  onRemove,
  onMove,
  onSessionLost,
}: {
  item: DraftItem;
  index: number;
  count: number;
  disabled: boolean;
  onChange: (item: DraftItem) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onSessionLost: () => void;
}) {
  return (
    <fieldset className="catalog-item" disabled={disabled}>
      <legend>Ítem {index + 1}</legend>
      <div className="form-grid">
        <label className="field">
          Concepto
          <input
            value={item.description}
            required
            maxLength={180}
            onChange={(event) =>
              onChange({ ...item, description: event.target.value })
            }
          />
        </label>
        <label className="field">
          Tipo de ítem
          <select
            value={item.type}
            onChange={(event) =>
              onChange({ ...item, type: event.target.value as CatalogItemType })
            }
          >
            {Object.entries(itemTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Cantidad
          <input
            inputMode="decimal"
            pattern="[0-9]{1,8}([.,][0-9]{1,2})?"
            required
            value={item.quantity}
            onChange={(event) =>
              onChange({ ...item, quantity: event.target.value })
            }
          />
        </label>
        <label className="field">
          Precio unitario (ARS)
          <input
            inputMode="decimal"
            pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
            required
            value={item.unitPrice}
            onChange={(event) =>
              onChange({ ...item, unitPrice: event.target.value })
            }
          />
        </label>
        <label className="field">
          Costo unitario (ARS)
          <input
            inputMode="decimal"
            pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
            required
            value={item.unitCost}
            onChange={(event) =>
              onChange({ ...item, unitCost: event.target.value })
            }
          />
        </label>
      </div>
      <SupplierPicker
        supplierId={item.supplierId ?? null}
        disabled={disabled}
        onChange={(supplierId) => onChange({ ...item, supplierId })}
        onSessionLost={onSessionLost}
      />
      <div className="records-actions">
        <button
          type="button"
          className="secondary"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          Subir ítem
        </button>
        <button
          type="button"
          className="secondary"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          Bajar ítem
        </button>
        <button type="button" className="text-button" onClick={onRemove}>
          Quitar ítem
        </button>
      </div>
    </fieldset>
  );
}
