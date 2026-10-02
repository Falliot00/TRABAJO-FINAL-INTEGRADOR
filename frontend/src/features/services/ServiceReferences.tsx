import { useEffect, useState } from "react";
import type {
  Component,
  ComponentType,
  RegulatoryActor,
  RegulatoryActorType,
} from "@cilgas/contracts";
import { RecordPicker } from "../../shared/RecordPicker";
import { componentsApi } from "../../shared/components-api";
import { settingsApi } from "../../shared/settings-api";
import { errorMessage, isSessionLost, request } from "../../shared/api";
import { RetryNotice } from "../../shared/ui";

function ReferenceName({
  path,
  kind,
  onSessionLost,
}: {
  path: string;
  kind: "component" | "actor";
  onSessionLost: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void request<Component | RegulatoryActor>(path, {
      signal: controller.signal,
    })
      .then((record) => {
        if (controller.signal.aborted) return;
        setName(
          "serialNumber" in record
            ? `${record.serialNumber} · ${record.model.homologationCode}${record.model.active ? "" : " · Modelo inactivo"}`
            : `${record.name} · ${record.code}${record.active ? "" : " · Inactivo"}`,
        );
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [path, revision, onSessionLost]);
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
  return (
    <strong>
      {name ||
        (kind === "component" ? "Cargando componente…" : "Cargando actor…")}
    </strong>
  );
}

export function ServiceComponentPicker({
  componentId,
  type,
  disabled,
  onSelect,
  onClear,
  onSessionLost,
}: {
  componentId: string | null;
  type?: ComponentType;
  disabled: boolean;
  onSelect: (component: Component) => void;
  onClear: () => void;
  onSessionLost: () => void;
}) {
  return (
    <div>
      {componentId && (
        <div className="notice notice-info">
          <ReferenceName
            key={componentId}
            path={`/components/${encodeURIComponent(componentId)}`}
            kind="component"
            onSessionLost={onSessionLost}
          />
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={onClear}
          >
            Quitar componente
          </button>
        </div>
      )}
      <RecordPicker
        key={type ?? "all"}
        label="Buscar componente existente"
        searchLabel="Buscar componentes"
        load={(q, cursor, signal) =>
          componentsApi.list({ q, cursor, type }, signal)
        }
        describe={(component) =>
          `${component.serialNumber} · ${component.type} · ${component.model.homologationCode}`
        }
        selectLabel={(component) => component.serialNumber}
        onSelect={onSelect}
        onSessionLost={onSessionLost}
        disabled={disabled}
      />
    </div>
  );
}

export function ServiceActorPicker({
  actorId,
  type,
  disabled,
  onChange,
  onSessionLost,
}: {
  actorId: string | null;
  type: RegulatoryActorType;
  disabled: boolean;
  onChange: (id: string | null) => void;
  onSessionLost: () => void;
}) {
  return (
    <fieldset className="catalog-item" disabled={disabled}>
      <legend>{type}</legend>
      {actorId && (
        <div className="notice notice-info">
          <ReferenceName
            key={actorId}
            path={`/regulatory-actors/${encodeURIComponent(actorId)}`}
            kind="actor"
            onSessionLost={onSessionLost}
          />
          <button
            type="button"
            className="text-button"
            onClick={() => onChange(null)}
          >
            Quitar {type}
          </button>
        </div>
      )}
      <RecordPicker
        label={`Buscar ${type}`}
        searchLabel={`Buscar actores ${type}`}
        load={(q, cursor, signal) =>
          settingsApi.actors(
            new URLSearchParams({
              q,
              type,
              active: "true",
              limit: "25",
              ...(cursor ? { cursor } : {}),
            }),
            signal,
          )
        }
        describe={(actor) => `${actor.name} · ${actor.code}`}
        selectLabel={(actor) => actor.name}
        onSelect={(actor) => onChange(actor.id)}
        onSessionLost={onSessionLost}
        disabled={disabled}
      />
    </fieldset>
  );
}
