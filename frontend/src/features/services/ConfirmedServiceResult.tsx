import { useState } from "react";
import type { ConfirmedService } from "@cilgas/contracts";
import { ConfirmedServiceDetails } from "./ConfirmedServiceDetails";

export function ConfirmedServiceResult({
  service,
  canViewSheets,
  canViewCosts,
  onSessionLost,
}: {
  service: ConfirmedService;
  canViewSheets: boolean;
  canViewCosts: boolean;
  onSessionLost: () => void;
}) {
  const [showSheet, setShowSheet] = useState(false);
  return (
    <>
      <section className="panel panel-padding" aria-label="Servicio confirmado">
        <h2>Servicio confirmado {service.id}</h2>
        <p>
          {service.description} · {service.vehicle.plate}
        </p>
        <p>Ficha confirmada {service.sheetId}. Sólo lectura.</p>
        <p>PDF pendiente de generación.</p>
        {canViewSheets && (
          <button
            type="button"
            className="secondary"
            onClick={() => setShowSheet(true)}
          >
            Ver ficha confirmada
          </button>
        )}
      </section>
      {showSheet && canViewSheets && (
        <ConfirmedServiceDetails
          id={service.id}
          canViewCosts={canViewCosts}
          onSessionLost={onSessionLost}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  );
}
