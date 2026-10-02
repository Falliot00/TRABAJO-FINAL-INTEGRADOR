import { useEffect, useState } from "react";
import type {
  ConfirmedService,
  ServiceConfirmationCheck,
  ServiceDraft,
} from "@cilgas/contracts";
import { serviceDraftsApi } from "../../shared/service-drafts-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { Loading, RetryNotice } from "../../shared/ui";
import { ServiceConfirmationReview } from "./ServiceConfirmationReview";

export function ServiceConfirmation({
  id,
  canViewCosts,
  onClose,
  onConfirmed,
  onSessionLost,
}: {
  id: string;
  canViewCosts: boolean;
  onClose: () => void;
  onConfirmed: (service: ConfirmedService) => void;
  onSessionLost: () => void;
}) {
  const [review, setReview] = useState<{
    draft: ServiceDraft;
    check: ServiceConfirmationCheck;
  } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  function reload() {
    setReview(null);
    setError("");
    setRevision((value) => value + 1);
  }
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      serviceDraftsApi.detail(id, controller.signal),
      serviceDraftsApi.check(id, controller.signal),
    ])
      .then(([draft, check]) => {
        if (!controller.signal.aborted) setReview({ draft, check });
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [id, revision, onSessionLost]);
  return (
    <section
      className="panel panel-padding editor-panel"
      aria-label={`Revisar confirmación del servicio ${id}`}
    >
      <h2>Revisar confirmación del servicio {id}</h2>
      <p>Revisá los datos guardados antes de confirmar el trabajo realizado.</p>
      {error ? (
        <RetryNotice message={error} onRetry={reload} />
      ) : review ? (
        <ServiceConfirmationReview
          key={revision}
          draft={review.draft}
          check={review.check}
          canViewCosts={canViewCosts}
          onReload={reload}
          onClose={onClose}
          onConfirmed={onConfirmed}
          onSessionLost={onSessionLost}
        />
      ) : (
        <Loading />
      )}
      {!review && (
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cerrar revisión
          </button>
        </div>
      )}
    </section>
  );
}
