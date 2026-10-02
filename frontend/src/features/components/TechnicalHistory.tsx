import { useEffect, useState } from "react";
import { componentsApi } from "../../shared/components-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { Loading, RetryNotice } from "../../shared/ui";

export function TechnicalHistory({
  id,
  kind,
  onSessionLost,
  onClose,
}: {
  id: string;
  kind: "component" | "vehicle";
  onSessionLost: () => void;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load =
      kind === "component"
        ? componentsApi.history
        : componentsApi.configurations;
    void load(id, controller.signal)
      .then((history) => {
        if (!controller.signal.aborted) setMessage(history.message);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [id, kind, revision, onSessionLost]);
  return (
    <section
      className="panel panel-padding records-section"
      aria-label="Historia técnica"
    >
      <div className="section-title">
        <h2>
          {kind === "component"
            ? "Historia del componente"
            : "Configuraciones del equipo"}
        </h2>
        <button className="secondary" onClick={onClose}>
          Cerrar historia
        </button>
      </div>
      {error ? (
        <RetryNotice
          message={error}
          onRetry={() => {
            setError("");
            setRevision((value) => value + 1);
          }}
        />
      ) : message ? (
        <p className="notice notice-info">{message}</p>
      ) : (
        <Loading />
      )}
    </section>
  );
}
