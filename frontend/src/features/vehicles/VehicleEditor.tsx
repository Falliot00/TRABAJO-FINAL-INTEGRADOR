import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Vehicle, VehicleInput, VehicleType } from "@cilgas/contracts";
import { ApiError, errorMessage, isSessionLost } from "../../shared/api";
import { vehiclesApi } from "../../shared/people-api";
import { ErrorNotice } from "../../shared/ui";

interface VehicleEditorProps {
  vehicle: Vehicle | null;
  onSaved: (vehicle: Vehicle) => void;
  onCancel: () => void;
  onSessionLost: () => void;
  onSelect: (vehicle: Vehicle) => void;
}

export function VehicleEditor({
  vehicle,
  onSaved,
  onCancel,
  onSessionLost,
  onSelect,
}: VehicleEditorProps) {
  const [type, setType] = useState(vehicle?.type ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Vehicle[]>([]);
  const activeRequest = useRef<AbortController | null>(null);
  const plateInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    plateInput.current?.focus();
    return () => activeRequest.current?.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const optional = (name: string) =>
      String(form.get(name) ?? "").trim() || null;
    const body: VehicleInput = {
      plate: String(form.get("plate")).trim(),
      brand: String(form.get("brand")).trim(),
      model: String(form.get("model")).trim(),
      year: Number(form.get("year")),
      engineNumber: optional("engineNumber"),
      chassisNumber: optional("chassisNumber"),
      type: (type || null) as VehicleType | null,
      otherTypeDetail: type === "OTROS" ? optional("otherTypeDetail") : null,
      usage: optional("usage"),
      injection:
        form.get("injection") === "" ? null : form.get("injection") === "true",
      active: form.get("active") === "true",
    };
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    setMatches([]);
    try {
      const duplicates = await vehiclesApi.duplicates(
        body.plate,
        vehicle?.id,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (duplicates.items.length > 0) {
        setMatches(duplicates.items);
        return;
      }
      const saved = vehicle
        ? await vehiclesApi.update(vehicle.id, body, controller.signal)
        : await vehiclesApi.create(body, controller.signal);
      if (!controller.signal.aborted) onSaved(saved);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else {
        setError(errorMessage(failure));
        if (failure instanceof ApiError && failure.status === 409) {
          try {
            const duplicates = await vehiclesApi.duplicates(
              body.plate,
              vehicle?.id,
              controller.signal,
            );
            if (!controller.signal.aborted) setMatches(duplicates.items);
          } catch (retryFailure) {
            if (!controller.signal.aborted && isSessionLost(retryFailure))
              onSessionLost();
          }
        }
      }
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
      aria-labelledby="vehicle-editor-title"
    >
      <h2 id="vehicle-editor-title">
        {vehicle ? "Editar vehículo" : "Nuevo vehículo"}
      </h2>
      <p className="records-description">
        Dominio, marca, modelo y año son obligatorios. Los demás datos pueden
        quedar sin informar.
      </p>
      <form
        onSubmit={(event) => void submit(event)}
        onChange={() => setMatches([])}
        aria-busy={pending}
      >
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Dominio
            <input
              ref={plateInput}
              name="plate"
              defaultValue={vehicle?.plate}
              required
              maxLength={15}
            />
          </label>
          <label className="field">
            Marca
            <input
              name="brand"
              defaultValue={vehicle?.brand}
              required
              maxLength={80}
            />
          </label>
          <label className="field">
            Modelo
            <input
              name="model"
              defaultValue={vehicle?.model}
              required
              maxLength={100}
            />
          </label>
          <label className="field">
            Año
            <input
              name="year"
              type="number"
              defaultValue={vehicle?.year}
              required
              min={1900}
              max={2200}
            />
          </label>
          <label className="field">
            Número de motor
            <input
              name="engineNumber"
              defaultValue={vehicle?.engineNumber ?? ""}
              maxLength={80}
            />
          </label>
          <label className="field">
            Número de chasis
            <input
              name="chassisNumber"
              defaultValue={vehicle?.chassisNumber ?? ""}
              maxLength={80}
            />
          </label>
          <label className="field">
            Tipo de vehículo
            <select
              name="type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as VehicleType | "")
              }
            >
              <option value="">Sin informar</option>
              <option value="TAXI">Taxi</option>
              <option value="PICKUP">Pick-up</option>
              <option value="PARTICULAR">Particular</option>
              <option value="BUS">Bus</option>
              <option value="OFICIAL">Oficial</option>
              <option value="OTROS">Otros</option>
            </select>
          </label>
          {type === "OTROS" && (
            <label className="field">
              Detalle de otro tipo
              <input
                name="otherTypeDetail"
                defaultValue={vehicle?.otherTypeDetail ?? ""}
                maxLength={100}
                required
              />
            </label>
          )}
          <label className="field">
            Uso
            <input
              name="usage"
              defaultValue={vehicle?.usage ?? ""}
              maxLength={60}
            />
          </label>
          <label className="field">
            Inyección
            <select
              name="injection"
              defaultValue={
                vehicle?.injection == null ? "" : String(vehicle.injection)
              }
            >
              <option value="">Sin informar</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="field">
            Estado del vehículo
            <select
              name="active"
              defaultValue={String(vehicle?.active ?? true)}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {matches.length > 0 && (
          <section
            className="notice notice-info records-matches"
            aria-label="Vehículos coincidentes"
          >
            <strong>
              Ese dominio ya está registrado. Recuperá el vehículo existente.
            </strong>
            <ul>
              {matches.map((match) => (
                <li key={match.id}>
                  <span>
                    {match.plate} · {match.brand} {match.model} ·{" "}
                    {match.active ? "Activo" : "Inactivo"}
                  </span>
                  <button
                    className="secondary"
                    type="button"
                    disabled={pending}
                    onClick={() => onSelect(match)}
                  >
                    Usar {match.plate}
                  </button>
                </li>
              ))}
            </ul>
          </section>
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
              : vehicle
                ? "Guardar vehículo"
                : "Crear vehículo"}
          </button>
        </div>
      </form>
    </section>
  );
}
