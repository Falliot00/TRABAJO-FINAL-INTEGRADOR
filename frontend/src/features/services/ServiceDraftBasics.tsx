import type { ServiceDraft } from "@cilgas/contracts";
import { vehiclesApi } from "../../shared/people-api";
import { RecordPicker } from "../../shared/RecordPicker";
import { serviceTypes } from "../catalog/catalog-fields";

export function ServiceDraftBasics({
  draft,
  vehicle,
  pending,
  setVehicle,
  serviceDate,
  onServiceDateChange,
  onSessionLost,
}: {
  draft: ServiceDraft;
  vehicle: ServiceDraft["vehicle"];
  pending: boolean;
  setVehicle: (vehicle: ServiceDraft["vehicle"]) => void;
  serviceDate: string;
  onServiceDateChange: (value: string) => void;
  onSessionLost: () => void;
}) {
  return (
    <>
      {" "}
      <RecordPicker
        label="Buscar vehículo del servicio"
        searchLabel="Buscar vehículos"
        load={(q, cursor, signal) =>
          vehiclesApi.list({ q, cursor, active: "true" }, signal)
        }
        describe={(item) => `${item.plate} · ${item.brand} ${item.model}`}
        selectLabel={(item) => item.plate}
        onSelect={setVehicle}
        onSessionLost={onSessionLost}
        disabled={pending}
      />
      {vehicle.id !== draft.vehicleId && (
        <p className="notice notice-info">
          Al cambiar el vehículo se conservan las personas y la preparación del
          borrador. Revisalas antes de guardar.
        </p>
      )}
      <div className="form-grid">
        <label className="field">
          Descripción del servicio
          <input
            name="description"
            defaultValue={draft.description}
            required
            maxLength={180}
          />
        </label>
        <label className="field">
          Fecha del servicio
          <input
            name="serviceDate"
            type="date"
            required
            value={serviceDate}
            onChange={(event) => onServiceDateChange(event.target.value)}
          />
        </label>
        <label className="field">
          Tipo de servicio
          <select name="type" defaultValue={draft.type}>
            {Object.entries(serviceTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Total acordado (ARS)
          <input
            name="totalAmount"
            inputMode="decimal"
            pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
            required
            defaultValue={draft.totalAmount}
          />
        </label>
        <label className="field field-wide">
          Observaciones del servicio
          <textarea
            name="notes"
            defaultValue={draft.notes ?? ""}
            maxLength={4000}
          />
        </label>
      </div>
      <p className="records-description">
        El vehículo necesita marca, modelo, año, dominio, inyección y tipo antes
        de confirmar. Completá los faltantes en Vehículos.
      </p>
    </>
  );
}
