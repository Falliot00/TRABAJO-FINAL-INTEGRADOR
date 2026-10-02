import { useEffect, useState } from "react";
import type { ConfirmedService, ServiceSheet } from "@cilgas/contracts";
import { servicesApi } from "../../shared/services-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { Loading, RetryNotice } from "../../shared/ui";
import { SnapshotDetails } from "./SnapshotDetails";
import { ServiceSavedDetails } from "./ServiceSavedDetails";
import { ServiceObligations } from "./ServiceObligations";

export function ConfirmedServiceDetails({
  id,
  canViewCosts,
  onSessionLost,
  onClose,
}: {
  id: string;
  canViewCosts: boolean;
  onSessionLost: () => void;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<{
    service: ConfirmedService;
    sheet: ServiceSheet;
  } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      servicesApi.detail(id, controller.signal),
      servicesApi.sheet(id, controller.signal),
    ])
      .then(([service, sheet]) => {
        if (!controller.signal.aborted) setDetails({ service, sheet });
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [id, revision, onSessionLost]);
  if (error)
    return (
      <RetryNotice
        message={error}
        onRetry={() => {
          setError("");
          setRevision((value) => value + 1);
        }}
      />
    );
  if (!details) return <Loading />;
  return (
    <section
      className="panel panel-padding records-section"
      aria-label={`Ficha confirmada ${details.sheet.id}`}
    >
      <div className="section-title">
        <h2>Ficha confirmada {details.sheet.id}</h2>
        <button className="secondary" onClick={onClose}>
          Cerrar ficha
        </button>
      </div>
      <p>
        Servicio {details.service.id} · {details.service.description} ·{" "}
        {details.service.serviceDate}
      </p>
      <p>
        Versión {details.sheet.version} · Sólo lectura. Los datos conservan el
        momento de la confirmación.
      </p>
      <p>PDF pendiente de generación.</p>
      <SnapshotDetails value={details.sheet.content} />
      <details className="records-section">
        <summary>Detalle comercial del servicio</summary>
        <ServiceSavedDetails
          service={details.service}
          canViewCosts={canViewCosts}
        />
      </details>
      {canViewCosts && (
        <ServiceObligations id={id} onSessionLost={onSessionLost} />
      )}
    </section>
  );
}
