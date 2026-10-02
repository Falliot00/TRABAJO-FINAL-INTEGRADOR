import { useEffect, useRef, useState } from "react";
import type { ConfirmedService, ServiceDraft } from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { serviceDraftsApi } from "../../shared/service-drafts-api";
import { useRecords } from "../../shared/use-records";
import { RetryNotice } from "../../shared/ui";
import "../people/people.css";
import { NewServiceDraft } from "./NewServiceDraft";
import { ServiceDraftEditor } from "./ServiceDraftEditor";
import { ServiceDraftList } from "./ServiceDraftList";
import { ServiceConfirmation } from "./ServiceConfirmation";
import { ConfirmedServices } from "./ConfirmedServices";
import { ConfirmedServiceResult } from "./ConfirmedServiceResult";
import "./services.css";

export function Services({
  canViewCosts,
  canViewSheets = true,
  onSessionLost,
}: {
  canViewCosts: boolean;
  canViewSheets?: boolean;
  onSessionLost: () => void;
}) {
  const records = useRecords(serviceDraftsApi.list, onSessionLost);
  const [editing, setEditing] = useState<ServiceDraft | "new" | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedService | null>(null);
  const [showConfirmed, setShowConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [retrieving, setRetrieving] = useState(false);
  const [retrievalError, setRetrievalError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const busy = editing !== null || reviewing !== null || retrieving;
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function open(id: string) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setRetrieving(true);
    setRetrievalError(null);
    setNotice("");
    try {
      const draft = await serviceDraftsApi.detail(id, controller.signal);
      if (!controller.signal.aborted) setEditing(draft);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else setRetrievalError({ id, message: errorMessage(failure) });
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setRetrieving(false);
      }
    }
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Trabajo compartido del taller</span>
          <h1>Servicios</h1>
          <p>Prepará y continuá los borradores del equipo.</p>
        </div>
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            setEditing("new");
            setNotice("");
          }}
        >
          Nuevo borrador
        </button>
      </header>
      {canViewSheets && (
        <button
          className="secondary"
          onClick={() => setShowConfirmed((value) => !value)}
        >
          {showConfirmed
            ? "Ocultar servicios confirmados"
            : "Ver servicios confirmados"}
        </button>
      )}
      {showConfirmed && canViewSheets && (
        <ConfirmedServices
          canViewCosts={canViewCosts}
          onSessionLost={onSessionLost}
        />
      )}
      {notice && (
        <div role="status" className="notice notice-success page-notice">
          {notice}
        </div>
      )}
      {editing === "new" && (
        <NewServiceDraft
          onCreated={(draft) => {
            records.upsert(draft);
            setEditing(draft);
          }}
          onCancel={() => setEditing(null)}
          onSessionLost={onSessionLost}
        />
      )}
      {reviewing && (
        <ServiceConfirmation
          key={reviewing}
          id={reviewing}
          canViewCosts={canViewCosts}
          onClose={() => setReviewing(null)}
          onConfirmed={(service) => {
            setConfirmed(service);
            setReviewing(null);
            records.search({});
            setNotice(
              "Servicio confirmado. La ficha y sus efectos quedaron registrados.",
            );
          }}
          onSessionLost={onSessionLost}
        />
      )}
      {confirmed && (
        <ConfirmedServiceResult
          key={confirmed.id}
          service={confirmed}
          canViewSheets={canViewSheets}
          canViewCosts={canViewCosts}
          onSessionLost={onSessionLost}
        />
      )}
      {editing && editing !== "new" && (
        <ServiceDraftEditor
          key={`${editing.id}-${editing.version}`}
          draft={editing}
          canViewCosts={canViewCosts}
          onReloaded={(draft) => {
            records.upsert(draft);
            setEditing(draft);
          }}
          onSaved={(draft) => {
            records.upsert(draft);
            setEditing(null);
            setNotice("Borrador guardado correctamente.");
          }}
          onCancel={() => setEditing(null)}
          onSessionLost={onSessionLost}
        />
      )}
      {retrievalError && (
        <RetryNotice
          message={retrievalError.message}
          onRetry={() => void open(retrievalError.id)}
        />
      )}
      <ServiceDraftList
        records={records}
        busy={busy}
        onEdit={(id) => void open(id)}
        onReview={(id) => {
          setReviewing(id);
          setNotice("");
        }}
      />
    </>
  );
}
