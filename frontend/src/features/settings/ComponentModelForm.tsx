import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ComponentModel,
  ComponentModelInput,
  ComponentType,
} from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { settingsApi } from "../../shared/settings-api";
import { ErrorNotice } from "../../shared/ui";

export function ComponentModelForm({
  model,
  onSessionLost,
  onCancel,
  onSaved,
  onExisting,
}: {
  model: ComponentModel | null;
  onSessionLost: () => void;
  onCancel: () => void;
  onSaved: () => void;
  onExisting: (model: ComponentModel) => void;
}) {
  const [type, setType] = useState<ComponentType | "">(model?.type ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<ComponentModel | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const firstInput = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    firstInput.current?.focus();
    return () => activeRequest.current?.abort();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current || !type) return;
    const form = new FormData(event.currentTarget);
    const body: ComponentModelInput = {
      type,
      homologationCode: String(form.get("homologationCode")).trim(),
      brand: String(form.get("brand") ?? "").trim() || null,
      model: String(form.get("model") ?? "").trim() || null,
      capacityLiters:
        type === "CILINDRO"
          ? String(form.get("capacityLiters") ?? "")
              .trim()
              .replace(",", ".") || null
          : null,
      active: form.get("active") === "true",
    };
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setDuplicate(null);
    try {
      const query = new URLSearchParams({
        q: body.homologationCode.toUpperCase(),
        type,
        limit: "100",
      });
      let cursor: string | null = null;
      do {
        if (cursor) query.set("cursor", cursor);
        const page = await settingsApi.models(query, controller.signal);
        const existing = page.items.find(
          (item) =>
            item.type === type &&
            item.homologationCode.toUpperCase() ===
              body.homologationCode.toUpperCase() &&
            item.id !== model?.id,
        );
        if (existing) {
          setDuplicate(existing);
          setError(
            `Ya existe ${existing.homologationCode} para ese tipo de componente.`,
          );
          return;
        }
        cursor = page.nextCursor;
      } while (cursor);
      if (model)
        await settingsApi.updateModel(model.id, body, controller.signal);
      else await settingsApi.createModel(body, controller.signal);
      if (!controller.signal.aborted) onSaved();
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
      aria-labelledby="model-form-title"
    >
      <h2 id="model-form-title">
        {model ? "Editar modelo de componente" : "Nuevo modelo de componente"}
      </h2>
      <form onSubmit={(event) => void save(event)} aria-busy={pending}>
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Tipo de componente
            <select
              name="type"
              ref={firstInput}
              value={type}
              onChange={(event) => setType(event.target.value as ComponentType)}
              required
            >
              <option value="" disabled>
                Seleccionar tipo
              </option>
              <option value="CILINDRO">Cilindro</option>
              <option value="VALVULA">Válvula</option>
              <option value="REGULADOR">Regulador</option>
            </select>
          </label>
          <label className="field">
            Código de homologación
            <input
              name="homologationCode"
              required
              defaultValue={model?.homologationCode ?? ""}
              maxLength={50}
            />
          </label>
          <label className="field">
            Marca
            <input
              name="brand"
              defaultValue={model?.brand ?? ""}
              maxLength={100}
            />
          </label>
          <label className="field">
            Modelo
            <input
              name="model"
              defaultValue={model?.model ?? ""}
              maxLength={100}
            />
          </label>
          {type === "CILINDRO" && (
            <label className="field">
              Capacidad en litros
              <input
                name="capacityLiters"
                inputMode="decimal"
                pattern="[0-9]{1,5}([.,][0-9]{1,2})?"
                defaultValue={model?.capacityLiters ?? ""}
              />
            </label>
          )}
          <label className="field">
            Estado
            <select name="active" defaultValue={String(model?.active ?? true)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {duplicate && (
          <button
            className="text-button"
            type="button"
            onClick={() => onExisting(duplicate)}
          >
            Usar modelo existente
          </button>
        )}
        <div className="form-actions">
          <button
            className="secondary"
            type="button"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button className="primary" type="submit" disabled={pending}>
            {pending ? "Guardando…" : model ? "Guardar modelo" : "Crear modelo"}
          </button>
        </div>
      </form>
    </section>
  );
}
