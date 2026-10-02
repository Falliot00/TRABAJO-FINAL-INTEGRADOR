import type { ServiceDraftCostInput } from "@cilgas/contracts";
import { SupplierPicker } from "../catalog/SupplierPicker";

export interface EditableCost extends ServiceDraftCostInput {
  key: string;
}
export function ServiceCosts({
  costs,
  disabled,
  onChange,
  onSessionLost,
}: {
  costs: EditableCost[];
  disabled: boolean;
  onChange: (costs: EditableCost[]) => void;
  onSessionLost: () => void;
}) {
  function update(key: string, next: EditableCost) {
    onChange(costs.map((cost) => (cost.key === key ? next : cost)));
  }
  return (
    <div>
      <h4>Costos propuestos del ítem</h4>
      {costs.map((cost, index) => (
        <fieldset className="catalog-item" key={cost.key} disabled={disabled}>
          <legend>Costo {index + 1}</legend>
          <div className="form-grid">
            <label className="field">
              Concepto del costo
              <input
                required
                maxLength={180}
                value={cost.concept}
                onChange={(event) =>
                  update(cost.key, { ...cost, concept: event.target.value })
                }
              />
            </label>
            <label className="field">
              Tratamiento del costo
              <select
                value={cost.treatment}
                onChange={(event) =>
                  update(cost.key, {
                    ...cost,
                    treatment: event.target
                      .value as ServiceDraftCostInput["treatment"],
                    supplierId: null,
                  })
                }
              >
                <option value="ABSORBIDO">Absorbido por el taller</option>
                <option value="PROVEEDOR">Atribuido a proveedor</option>
              </select>
            </label>
            <label className="field">
              Importe del costo (ARS)
              <input
                required
                inputMode="decimal"
                pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
                value={cost.amount}
                onChange={(event) =>
                  update(cost.key, { ...cost, amount: event.target.value })
                }
              />
            </label>
          </div>
          {cost.treatment === "PROVEEDOR" && (
            <SupplierPicker
              supplierId={cost.supplierId ?? null}
              disabled={disabled}
              onChange={(supplierId) =>
                update(cost.key, { ...cost, supplierId })
              }
              onSessionLost={onSessionLost}
            />
          )}
          <button
            type="button"
            className="text-button"
            onClick={() =>
              onChange(costs.filter((entry) => entry.key !== cost.key))
            }
          >
            Quitar costo
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...costs,
            {
              key: crypto.randomUUID(),
              concept: "",
              treatment: "ABSORBIDO",
              supplierId: null,
              amount: "",
            },
          ])
        }
      >
        Agregar costo
      </button>
    </div>
  );
}
