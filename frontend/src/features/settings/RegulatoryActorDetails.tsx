import type { RegulatoryActor } from "@cilgas/contracts";

const fields = [
  ["type", "Tipo"],
  ["code", "Código o matrícula"],
  ["cuit", "CUIT"],
  ["address", "Domicilio"],
  ["locality", "Localidad"],
  ["phone", "Teléfono"],
  ["technicalResponsible", "Responsable técnico"],
  ["responsibleLicense", "Matrícula del responsable"],
] as const;

export function RegulatoryActorDetails({
  actor,
  onClose,
}: {
  actor: RegulatoryActor;
  onClose: () => void;
}) {
  return (
    <section
      className="panel panel-padding editor-panel"
      aria-labelledby="actor-detail-title"
    >
      <div className="editor-header">
        <h2 id="actor-detail-title">{actor.name}</h2>
        <button className="secondary" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
      <dl className="identity-list">
        {fields.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{actor[key] ?? "Sin informar"}</dd>
          </div>
        ))}
        <div>
          <dt>Estado</dt>
          <dd>{actor.active ? "Activo" : "Inactivo"}</dd>
        </div>
      </dl>
    </section>
  );
}
