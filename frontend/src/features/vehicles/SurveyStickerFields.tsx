export function SurveyStickerFields({
  known,
  onChange,
  disabled,
}: {
  known: boolean;
  onChange: (known: boolean) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="catalog-item" disabled={disabled}>
      <legend>Antecedente de oblea</legend>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={known}
          onChange={(event) => onChange(event.target.checked)}
        />
        Registrar antecedente conocido de oblea
      </label>
      {known ? (
        <>
          <p className="records-description">
            Informá sólo los datos que conocés de la oblea anterior. No se emite
            una oblea nueva ni se completan fechas desconocidas.
          </p>
          <div className="form-grid">
            <label className="field">
              Número conocido de oblea
              <input name="stickerNumber" maxLength={40} />
            </label>
            <label className="field">
              Fecha conocida de habilitación
              <input name="stickerEnabledOn" type="date" />
            </label>
            <label className="field">
              Vencimiento conocido de oblea
              <input name="stickerExpiresOn" type="date" />
            </label>
          </div>
        </>
      ) : (
        <p className="records-description">Antecedente de oblea desconocido.</p>
      )}
    </fieldset>
  );
}
