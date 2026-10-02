import type {
  CatalogItemType,
  ServiceDraftItemInput,
  ServiceItemAction,
} from "@cilgas/contracts";
import { itemTypes } from "../catalog/catalog-fields";
import { ServiceComponentPicker } from "./ServiceReferences";
import { ServiceCosts, type EditableCost } from "./ServiceCosts";

export interface EditableItem extends Omit<ServiceDraftItemInput, "costs"> {
  key: string;
  costs?: EditableCost[];
}
export function ServiceItemEditor({
  item,
  index,
  disabled,
  canViewCosts,
  onChange,
  onRemove,
  onSessionLost,
}: {
  item: EditableItem;
  index: number;
  onChange: (item: EditableItem) => void;
  onRemove: () => void;
  disabled: boolean;
  canViewCosts: boolean;
  onSessionLost: () => void;
}) {
  return (
    <fieldset className="catalog-item">
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
          Descuento (ARS)
          <input
            inputMode="decimal"
            pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
            required
            value={item.discount}
            onChange={(event) =>
              onChange({ ...item, discount: event.target.value })
            }
          />
        </label>
        <label className="field">
          Acción sobre componente
          <select
            value={item.action ?? ""}
            required={Boolean(item.componentId)}
            onChange={(event) =>
              onChange({
                ...item,
                action: (event.target.value as ServiceItemAction) || null,
              })
            }
          >
            <option value="">Sin informar</option>
            <option value="INSTALAR">Instalar</option>
            <option value="RETIRAR">Retirar</option>
            <option value="INSPECCIONAR">Inspeccionar</option>
            <option value="ENSAYAR">Ensayar</option>
            <option value="MANTENER">Mantener</option>
          </select>
        </label>
      </div>
      <ServiceComponentPicker
        componentId={item.componentId ?? null}
        disabled={disabled}
        onSelect={(component) =>
          onChange({ ...item, componentId: component.id })
        }
        onClear={() => onChange({ ...item, componentId: null, action: null })}
        onSessionLost={onSessionLost}
      />
      {canViewCosts && (
        <ServiceCosts
          costs={item.costs ?? []}
          disabled={disabled}
          onChange={(costs) => onChange({ ...item, costs })}
          onSessionLost={onSessionLost}
        />
      )}
      <button className="text-button" type="button" onClick={onRemove}>
        Quitar ítem
      </button>
    </fieldset>
  );
}
