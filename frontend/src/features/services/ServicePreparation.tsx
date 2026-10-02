import type { ServicePreparationInput } from "@cilgas/contracts";
import { ServiceActorPicker } from "./ServiceReferences";

export function ServicePreparation({
  preparation,
  disabled,
  onChange,
  onSessionLost,
}: {
  preparation: ServicePreparationInput;
  disabled: boolean;
  onChange: (value: ServicePreparationInput) => void;
  onSessionLost: () => void;
}) {
  return (
    <section aria-label="Preparación de la ficha">
      <h3>Preparación de la ficha</h3>
      <p className="records-description">
        Podés dejar datos pendientes y completarlos en otra edición.
      </p>
      <div className="form-grid">
        <label className="field">
          Oblea anterior
          <input
            value={preparation.previousSticker ?? ""}
            maxLength={40}
            onChange={(event) =>
              onChange({
                ...preparation,
                previousSticker: event.target.value || null,
              })
            }
          />
        </label>
        <label className="field">
          Oblea nueva preparada
          <input
            value={preparation.newSticker ?? ""}
            maxLength={40}
            onChange={(event) =>
              onChange({
                ...preparation,
                newSticker: event.target.value || null,
              })
            }
          />
        </label>
        <label className="field">
          Fecha de habilitación preparada
          <input
            type="date"
            value={preparation.enabledOn ?? ""}
            onChange={(event) =>
              onChange({
                ...preparation,
                enabledOn: event.target.value || null,
              })
            }
          />
        </label>
        <label className="field">
          Vencimiento de oblea preparado
          <input
            type="date"
            value={preparation.expiresOn ?? ""}
            onChange={(event) =>
              onChange({
                ...preparation,
                expiresOn: event.target.value || null,
              })
            }
          />
        </label>
        <label className="field field-wide">
          Observaciones de la ficha
          <textarea
            value={preparation.notes ?? ""}
            maxLength={4000}
            onChange={(event) =>
              onChange({ ...preparation, notes: event.target.value || null })
            }
          />
        </label>
      </div>
      <div className="form-grid">
        <ServiceActorPicker
          actorId={preparation.pecId ?? null}
          type="PEC"
          disabled={disabled}
          onChange={(pecId) => onChange({ ...preparation, pecId })}
          onSessionLost={onSessionLost}
        />
        <ServiceActorPicker
          actorId={preparation.tdmId ?? null}
          type="TDM"
          disabled={disabled}
          onChange={(tdmId) => onChange({ ...preparation, tdmId })}
          onSessionLost={onSessionLost}
        />
      </div>
    </section>
  );
}
