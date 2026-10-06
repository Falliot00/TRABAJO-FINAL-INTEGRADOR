import {
  ServiceActorPicker,
  ServiceComponentPicker,
} from "../services/ServiceReferences";

export interface SurveyPairDraft {
  key: number;
  cylinderId: string | null;
  valveId: string | null;
  knownPh: boolean;
  crpcId: string | null;
}

export function InitialSurveyPair({
  pair,
  position,
  disabled,
  canRemove,
  onChange,
  onRemove,
  onSessionLost,
}: {
  pair: SurveyPairDraft;
  position: number;
  disabled: boolean;
  canRemove: boolean;
  onChange: (change: Partial<SurveyPairDraft>) => void;
  onRemove: () => void;
  onSessionLost: () => void;
}) {
  return (
    <fieldset className="catalog-item" disabled={disabled}>
      <legend>Pareja {position}</legend>
      <fieldset className="catalog-item">
        <legend>Cilindro de pareja {position}</legend>
        <ServiceComponentPicker
          componentId={pair.cylinderId}
          type="CILINDRO"
          disabled={disabled}
          onSelect={(component) => onChange({ cylinderId: component.id })}
          onClear={() => onChange({ cylinderId: null })}
          onSessionLost={onSessionLost}
        />
      </fieldset>
      <fieldset className="catalog-item">
        <legend>Válvula de pareja {position}</legend>
        <ServiceComponentPicker
          componentId={pair.valveId}
          type="VALVULA"
          disabled={disabled}
          onSelect={(component) => onChange({ valveId: component.id })}
          onClear={() => onChange({ valveId: null })}
          onSessionLost={onSessionLost}
        />
      </fieldset>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={pair.knownPh}
          onChange={(event) => onChange({ knownPh: event.target.checked })}
        />
        Registrar antecedente conocido de PH
      </label>
      {pair.knownPh ? (
        <>
          <p className="records-description">
            Completá únicamente los datos conocidos de la última PH de este
            cilindro. Dejá los demás sin informar; esto no registra un ensayo
            realizado por el taller.
          </p>
          <div className="form-grid">
            <label className="field">
              Fecha conocida de PH (mes o día)
              <input
                name={`phTestDate-${pair.key}`}
                placeholder="AAAA-MM o AAAA-MM-DD"
                pattern="[0-9]{4}-[0-9]{2}(-[0-9]{2})?"
                maxLength={10}
              />
            </label>
            <label className="field">
              Vencimiento conocido de PH
              <input name={`phExpiresOn-${pair.key}`} type="date" />
            </label>
            <label className="field">
              Resultado conocido de PH
              <select name={`phResult-${pair.key}`} defaultValue="">
                <option value="">Sin informar</option>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </label>
            <label className="field">
              Certificado conocido de PH
              <input name={`phCertificate-${pair.key}`} maxLength={80} />
            </label>
          </div>
          <ServiceActorPicker
            actorId={pair.crpcId}
            type="CRPC"
            disabled={disabled}
            onChange={(crpcId) => onChange({ crpcId })}
            onSessionLost={onSessionLost}
          />
        </>
      ) : (
        <p className="records-description">Antecedente de PH desconocido.</p>
      )}
      <button
        type="button"
        className="text-button"
        disabled={disabled || !canRemove}
        onClick={onRemove}
      >
        Quitar pareja {position}
      </button>
    </fieldset>
  );
}
