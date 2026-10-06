import type { ServiceInterventionInput } from "@cilgas/contracts";
import type { EditableIntervention } from "./ServiceInterventions";
import { ServiceActorPicker } from "./ServiceReferences";
import { useState } from "react";
import { expirationAtMonthEnd } from "./service-dates";

export function ServiceInterventionPh({
  intervention,
  disabled,
  onChange,
  onSessionLost,
}: {
  intervention: EditableIntervention;
  disabled: boolean;
  onChange: (value: EditableIntervention) => void;
  onSessionLost: () => void;
}) {
  const [precision, setPrecision] = useState(
    intervention.testDate?.length === 10 ? "date" : "month",
  );
  return (
    <>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={intervention.performsPh}
          onChange={(event) =>
            onChange({ ...intervention, performsPh: event.target.checked })
          }
        />
        Preparar ensayo PH
      </label>
      <div className="form-grid">
        <label className="field">
          Precisión de fecha del ensayo
          <select
            value={precision}
            onChange={(event) => {
              const value = event.target.value;
              setPrecision(value);
              onChange({
                ...intervention,
                testDate:
                  value === "month"
                    ? intervention.testDate?.slice(0, 7) || null
                    : null,
              });
            }}
          >
            <option value="month">Mes y año conocidos</option>
            <option value="date">Día conocido</option>
          </select>
        </label>
        <label className="field">
          Fecha del ensayo preparada
          <input
            type={precision}
            value={intervention.testDate ?? ""}
            onChange={(event) =>
              onChange({
                ...intervention,
                testDate: event.target.value || null,
              })
            }
          />
        </label>
        <label className="field">
          Vencimiento de revisión preparado
          <input
            type="date"
            value={
              expirationAtMonthEnd(
                intervention.performsPh
                  ? intervention.testDate
                  : intervention.revisionMonth,
                5,
              ) ?? ""
            }
            readOnly
          />
        </label>
        <label className="field">
          Resultado PH preparado
          <select
            value={intervention.phResult ?? ""}
            onChange={(event) =>
              onChange({
                ...intervention,
                phResult:
                  (event.target
                    .value as ServiceInterventionInput["phResult"]) || null,
              })
            }
          >
            <option value="">Pendiente</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </label>
        <label className="field">
          Número de certificado preparado (opcional)
          <input
            maxLength={80}
            value={intervention.certificateNumber ?? ""}
            onChange={(event) =>
              onChange({
                ...intervention,
                certificateNumber: event.target.value || null,
              })
            }
          />
        </label>
      </div>
      <p className="records-description">
        Fabricación y ensayo son fechas distintas. Conservá la precisión
        conocida; la PH vence al cierre del mismo mes, cinco años después. El
        resultado real y el CRPC son obligatorios al confirmar PH.
      </p>
      <ServiceActorPicker
        actorId={intervention.crpcId ?? null}
        type="CRPC"
        disabled={disabled}
        onChange={(crpcId) => onChange({ ...intervention, crpcId })}
        onSessionLost={onSessionLost}
      />
    </>
  );
}
