import type {
  ComponentHistory,
  InitialEquipmentSurvey,
  KnownPhAntecedent,
} from "@cilgas/contracts";
import { workshopInstant } from "../../shared/format";

export function KnownPhDetails({ ph }: { ph: KnownPhAntecedent | null }) {
  if (!ph) return <p>Antecedente de PH desconocido.</p>;
  return (
    <section
      className="records-section"
      aria-label="Antecedente conocido de PH"
    >
      <h5>Antecedente conocido de PH</h5>
      <p>Fecha conocida: {ph.testDate ?? "Sin informar"}</p>
      <p>Vencimiento informado: {ph.expiresOn ?? "Sin informar"}</p>
      <p>
        Resultado:{" "}
        {ph.result === "APROBADO"
          ? "Aprobado"
          : ph.result === "RECHAZADO"
            ? "Rechazado"
            : "Sin informar"}
      </p>
      <p>CRPC: {ph.crpcId ?? "Sin informar"}</p>
      <p>Certificado: {ph.certificateNumber ?? "Sin informar"}</p>
    </section>
  );
}

export function InitialSurveyDetails({
  survey,
}: {
  survey: InitialEquipmentSurvey;
}) {
  return (
    <section
      className="records-section"
      aria-label="Datos del relevamiento inicial"
    >
      <h4>Datos del relevamiento inicial</h4>
      <p>
        Registrado por {survey.recordedBy} ·{" "}
        {workshopInstant(survey.recordedAt)}
      </p>
      <p>
        Los antecedentes describen información conocida al relevar el equipo; no
        acreditan servicios, ensayos ni emisiones del taller.
      </p>
      {survey.pairs.map((pair) => (
        <div key={pair.cylinderId} className="records-section">
          <p>
            <strong>Pareja {pair.position}</strong> · Cilindro {pair.cylinderId}{" "}
            · Válvula {pair.valveId}
          </p>
          <KnownPhDetails ph={pair.ph} />
        </div>
      ))}
      {survey.sticker ? (
        <section
          className="records-section"
          aria-label="Antecedente conocido de oblea"
        >
          <h5>Antecedente conocido de oblea</h5>
          <p>Número: {survey.sticker.number ?? "Sin informar"}</p>
          <p>Habilitación: {survey.sticker.enabledOn ?? "Sin informar"}</p>
          <p>
            Vencimiento informado: {survey.sticker.expiresOn ?? "Sin informar"}
          </p>
        </section>
      ) : (
        <p>Antecedente de oblea desconocido.</p>
      )}
      {survey.notes && <p>Observaciones: {survey.notes}</p>}
    </section>
  );
}

export function ComponentInitialSurveys({
  surveys,
}: {
  surveys: NonNullable<ComponentHistory["initialSurveys"]>;
}) {
  if (surveys.length === 0) return null;
  return (
    <>
      <h3>Relevamientos iniciales</h3>
      <p>
        Presencia registrada en equipos existentes, sin acreditar servicios ni
        movimientos anteriores.
      </p>
      {surveys.map((survey) => (
        <section
          key={survey.configurationId}
          className="records-section"
          aria-label={`Relevamiento inicial de configuración ${survey.configurationId}`}
        >
          <h4>
            Configuración {survey.configurationId} · Vehículo {survey.vehicleId}
          </h4>
          <p>
            Registrado por {survey.recordedBy} ·{" "}
            {workshopInstant(survey.recordedAt)}
          </p>
          {survey.ph && <KnownPhDetails ph={survey.ph} />}
        </section>
      ))}
    </>
  );
}
