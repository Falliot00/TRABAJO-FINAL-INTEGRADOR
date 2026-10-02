import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  Component,
  ComponentInput,
  ComponentModel,
} from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { componentsApi } from "../../shared/components-api";
import { settingsApi } from "../../shared/settings-api";
import { ErrorNotice } from "../../shared/ui";
import { RecordPicker } from "../../shared/RecordPicker";

function loadModels(
  q: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  return settingsApi.models(
    new URLSearchParams({
      q,
      active: "true",
      limit: "25",
      ...(cursor ? { cursor } : {}),
    }),
    signal,
  );
}
export function ComponentEditor({
  component,
  onSaved,
  onCancel,
  onSessionLost,
  onExisting,
}: {
  component: Component | null;
  onSaved: (saved: Component) => void;
  onCancel: () => void;
  onSessionLost: () => void;
  onExisting: (component: Component) => void;
}) {
  const [model, setModel] = useState<ComponentModel | null>(
    component?.model ?? null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<Component | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    if (!model) {
      setError("Seleccioná el modelo del componente.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const body: ComponentInput = {
      modelId: model.id,
      type: model.type,
      serialNumber: String(form.get("serialNumber")).trim(),
      manufactureMonth: String(form.get("manufactureMonth")).trim() || null,
      notes: String(form.get("notes")).trim() || null,
    };
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setDuplicate(null);
    try {
      const matches = await componentsApi.duplicates(
        model.id,
        body.serialNumber,
        component?.id,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (matches.items[0]) {
        setDuplicate(matches.items[0]);
        setError("Ya existe ese número de serie para el modelo seleccionado.");
        return;
      }
      const saved = component
        ? await componentsApi.update(component.id, body, controller.signal)
        : await componentsApi.create(body, controller.signal);
      if (!controller.signal.aborted) onSaved(saved);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else setError(errorMessage(failure));
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }
  return (
    <section
      className="panel panel-padding editor-panel"
      aria-labelledby="component-editor-title"
    >
      <h2 id="component-editor-title">
        {component ? "Editar componente" : "Nuevo componente"}
      </h2>
      <p className="records-description">
        Registrá su identidad individual. La instalación y los retiros se
        registran al confirmar el servicio correspondiente.
      </p>
      <form onSubmit={(event) => void save(event)} aria-busy={pending}>
        {model && (
          <p className="notice notice-info">
            Modelo seleccionado:{" "}
            <strong>
              {model.type} · {model.homologationCode}
            </strong>{" "}
            · {model.brand} {model.model}
            {!model.active && " · Referencia inactiva"}
          </p>
        )}
        <RecordPicker
          label="Buscar modelo para el componente"
          searchLabel="Buscar modelos"
          load={loadModels}
          describe={(item) =>
            `${item.type} · ${item.homologationCode} · ${item.brand ?? ""} ${item.model ?? ""}`
          }
          selectLabel={(item) => item.homologationCode}
          onSelect={setModel}
          onSessionLost={onSessionLost}
          disabled={pending}
        />
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Número de serie
            <input
              name="serialNumber"
              required
              maxLength={80}
              defaultValue={component?.serialNumber ?? ""}
            />
          </label>
          <label className="field">
            Fabricación (mes y año)
            <input
              name="manufactureMonth"
              type="month"
              defaultValue={component?.manufactureMonth ?? ""}
            />
          </label>
          <label className="field">
            Observaciones
            <textarea name="notes" defaultValue={component?.notes ?? ""} />
          </label>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {duplicate && (
          <button
            className="text-button"
            type="button"
            onClick={() => onExisting(duplicate)}
          >
            Usar componente existente
          </button>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={pending}>
            {pending
              ? "Guardando…"
              : component
                ? "Guardar componente"
                : "Crear componente"}
          </button>
        </div>
      </form>
    </section>
  );
}
