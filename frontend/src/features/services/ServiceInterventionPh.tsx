import type { ServiceInterventionInput } from "@cilgas/contracts";
import type { EditableIntervention } from "./ServiceInterventions";
import { ServiceActorPicker } from "./ServiceReferences";

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
          Fecha del ensayo preparada
          <input
            type="date"
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
            value={intervention.revisionExpiresOn ?? ""}
            onChange={(event) =>
              onChange({
                ...intervention,
                revisionExpiresOn: event.target.value || null,
              })
            }
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
          Número de certificado preparado
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
