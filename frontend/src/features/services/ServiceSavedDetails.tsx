import type { ConfirmedService, ServiceDraft } from "@cilgas/contracts";
import { SnapshotDetails } from "./SnapshotDetails";

export function ServiceSavedDetails({
  service,
  canViewCosts,
}: {
  service: ServiceDraft | ConfirmedService;
  canViewCosts: boolean;
}) {
  return (
    <>
      <p>
        <strong>{service.description}</strong> · {service.vehicle.plate} ·{" "}
        {service.serviceDate}
      </p>
      <p>
        Versión {service.version} · Total acordado: {service.totalAmount} ARS
      </p>
      <div className="records-section">
        <h3>Personas del servicio</h3>
        {service.people.length === 0 ? (
          <p>Sin personas informadas.</p>
        ) : (
          <ul>
            {service.people.map((entry) => (
              <li key={entry.role}>
                {entry.role}: {entry.person.name} · {entry.person.documentType}{" "}
                {entry.person.documentNumber}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="records-section">
        <h3>Trabajo acordado</h3>
        <ul>
          {service.items.map((item) => (
            <li key={item.id}>
              {item.description} · Cantidad {item.quantity} · {item.amount} ARS
              {item.action && (
                <>
                  {" "}
                  · {item.action} · Componente {item.componentId}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="records-section">
        <h3>Preparación documental</h3>
        <SnapshotDetails
          value={{
            ...service.preparation,
            sheetOperation: service.sheetOperation,
            includesPh: service.includesPh,
          }}
        />
      </div>
      {service.interventions.length > 0 && (
        <div className="records-section">
          <h3>Intervenciones y resultados</h3>
          <SnapshotDetails
            value={service.interventions.map((entry) => ({ ...entry }))}
          />
        </div>
      )}
      {service.notes && <p>Observaciones: {service.notes}</p>}
      {canViewCosts && (
        <section
          className="records-section"
          aria-label={
            service.status === "CONFIRMADO"
              ? "Costos del servicio confirmado"
              : "Costos del borrador"
          }
        >
          <h3>Costos</h3>
          {service.items.map((item) => (
            <div key={item.id}>
              {item.costs?.map((cost) => (
                <p key={JSON.stringify(cost)}>
                  {cost.concept} · {cost.amount} ARS ·{" "}
                  {cost.treatment === "ABSORBIDO"
                    ? "Absorbido por el taller"
                    : `Proveedor ${cost.supplierId}`}
                </p>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
