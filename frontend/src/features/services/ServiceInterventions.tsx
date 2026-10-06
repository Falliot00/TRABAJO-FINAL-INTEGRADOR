import { ServiceInterventionPh } from "./ServiceInterventionPh";
import type { ServiceInterventionInput } from "@cilgas/contracts";
import { ServiceComponentPicker } from "./ServiceReferences";

export interface EditableIntervention extends Omit<
  ServiceInterventionInput,
  "row"
> {
  key: string;
  row: number | "";
}
const textFields = [
  ["homologationCode", "Código de homologación documental", 50],
  ["serialNumber", "Número de serie documental", 80],
  ["condition", "Condición", 30],
  ["description", "Descripción de la intervención", 180],
] as const;
const months = [
  ["manufactureMonth", "Mes de fabricación"],
  ["revisionMonth", "Mes de revisión"],
] as const;

function InterventionEditor({
  intervention,
  index,
  disabled,
  onChange,
  onRemove,
  onSessionLost,
}: {
  intervention: EditableIntervention;
  index: number;
  disabled: boolean;
  onChange: (next: EditableIntervention) => void;
  onRemove: () => void;
  onSessionLost: () => void;
}) {
  return (
    <fieldset className="catalog-item" disabled={disabled}>
      <legend>Intervención {index + 1}</legend>
      <div className="form-grid">
        <label className="field">
          Sección técnica
          <select
            value={intervention.type}
            onChange={(event) =>
              onChange({
                ...intervention,
                type: event.target.value as ServiceInterventionInput["type"],
                componentId: null,
                cylinderId: null,
                finalPosition: null,
                action: null,
                performsPh: false,
              })
            }
          >
            <option value="CILINDRO">Cilindro</option>
            <option value="VALVULA">Válvula</option>
            <option value="REGULADOR">Regulador</option>
            <option value="ACCESORIO">Accesorio</option>
          </select>
        </label>
        <label className="field">
          Renglón documental
          <input
            type="number"
            min={1}
            max={
              intervention.type === "REGULADOR"
                ? 3
                : intervention.type === "ACCESORIO"
                  ? 100
                  : intervention.type === "VALVULA"
                    ? 8
                    : 4
            }
            required
            value={intervention.row}
            onChange={(event) => {
              if (event.target.value === "") {
                onChange({ ...intervention, row: "" });
                return;
              }
              const row = event.target.valueAsNumber;
              if (Number.isInteger(row) && row > 0)
                onChange({ ...intervention, row });
            }}
          />
        </label>
        <label className="field">
          Marca documental
          <select
            value={intervention.action ?? ""}
            onChange={(event) =>
              onChange({
                ...intervention,
                action:
                  (event.target.value as ServiceInterventionInput["action"]) ||
                  null,
              })
            }
          >
            <option value="">Sin informar</option>
            <option value="M">M</option>
            {intervention.type !== "REGULADOR" && <option value="S">S</option>}
            <option value="D">D</option>
            <option value="B">B</option>
          </select>
        </label>
        {intervention.type !== "ACCESORIO" && (
          <label className="field">
            Posición final propuesta
            <select
              value={intervention.finalPosition ?? ""}
              onChange={(event) =>
                onChange({
                  ...intervention,
                  finalPosition: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
            >
              <option value="">Sin posición final</option>
              {(intervention.type === "REGULADOR" ? [1] : [1, 2, 3, 4]).map(
                (position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </div>
      {intervention.type !== "ACCESORIO" && (
        <ServiceComponentPicker
          componentId={intervention.componentId ?? null}
          type={intervention.type}
          disabled={disabled}
          onSelect={(component) =>
            onChange({
              ...intervention,
              componentId: component.id,
              homologationCode: component.model.homologationCode,
              serialNumber: component.serialNumber,
              manufactureMonth: component.manufactureMonth,
            })
          }
          onClear={() => onChange({ ...intervention, componentId: null })}
          onSessionLost={onSessionLost}
        />
      )}
      {intervention.type === "VALVULA" && (
        <fieldset className="catalog-item" disabled={disabled}>
          <legend>Cilindro de la válvula</legend>
          <p className="records-description">
            Elegí el cilindro tanto para la válvula resultante como para la
            retirada. La saliente se conservará en Observaciones con su código,
            serie y marca D/B.
          </p>
          <ServiceComponentPicker
            componentId={intervention.cylinderId ?? null}
            type="CILINDRO"
            disabled={disabled}
            onSelect={(component) =>
              onChange({ ...intervention, cylinderId: component.id })
            }
            onClear={() => onChange({ ...intervention, cylinderId: null })}
            onSessionLost={onSessionLost}
          />
        </fieldset>
      )}
      <div className="form-grid">
        {textFields.map(([field, label, maxLength]) => (
          <label className="field" key={field}>
            {label}
            <input
              maxLength={maxLength}
              value={intervention[field] ?? ""}
              onChange={(event) =>
                onChange({
                  ...intervention,
                  [field]: event.target.value || null,
                })
              }
            />
          </label>
        ))}
        {months.map(([field, label]) => (
          <label className="field" key={field}>
            {field === "revisionMonth" && intervention.performsPh
              ? "Última PH anterior (si se conoce)"
              : label}
            <input
              type="month"
              value={intervention[field] ?? ""}
              onChange={(event) =>
                onChange({
                  ...intervention,
                  [field]: event.target.value || null,
                })
              }
            />
          </label>
        ))}
      </div>
      {intervention.type === "CILINDRO" && (
        <ServiceInterventionPh
          intervention={intervention}
          disabled={disabled}
          onChange={onChange}
          onSessionLost={onSessionLost}
        />
      )}
      <button type="button" className="text-button" onClick={onRemove}>
        Quitar intervención
      </button>
    </fieldset>
  );
}

export function ServiceInterventions({
  interventions,
  disabled,
  onChange,
  onSessionLost,
}: {
  interventions: EditableIntervention[];
  disabled: boolean;
  onChange: (next: EditableIntervention[]) => void;
  onSessionLost: () => void;
}) {
  return (
    <section aria-label="Intervenciones propuestas">
      <h3>Intervenciones propuestas</h3>
      <p className="records-description">
        Los renglones documentales y las posiciones finales se preparan por
        separado. Cada válvula se vincula explícitamente con su cilindro. Podés
        preparar hasta cuatro recambios conservando las ocho válvulas. Los
        componentes se conservan sin cambios al guardar.
      </p>
      {interventions.map((intervention, index) => (
        <InterventionEditor
          key={intervention.key}
          intervention={intervention}
          index={index}
          disabled={disabled}
          onChange={(next) =>
            onChange(
              interventions.map((entry) =>
                entry.key === intervention.key ? next : entry,
              ),
            )
          }
          onRemove={() =>
            onChange(
              interventions.filter((entry) => entry.key !== intervention.key),
            )
          }
          onSessionLost={onSessionLost}
        />
      ))}
      <button
        type="button"
        className="secondary"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...interventions,
            {
              key: crypto.randomUUID(),
              type: "CILINDRO",
              row:
                [1, 2, 3, 4].find(
                  (row) =>
                    !interventions.some(
                      (entry) => entry.type === "CILINDRO" && entry.row === row,
                    ),
                ) ?? 1,
              performsPh: false,
              phResult: null,
            },
          ])
        }
      >
        Agregar intervención
      </button>
    </section>
  );
}
