import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CatalogOffer, ServiceDraft, Vehicle } from "@cilgas/contracts";
import { RecordPicker } from "../../shared/RecordPicker";
import { vehiclesApi } from "../../shared/people-api";
import { catalogApi } from "../../shared/catalog-api";
import { serviceDraftsApi } from "../../shared/service-drafts-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { ErrorNotice } from "../../shared/ui";

function loadVehicles(
  q: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  return vehiclesApi.list({ q, cursor, active: "true" }, signal);
}
function loadOffers(
  q: string,
  cursor: string | undefined,
  signal: AbortSignal,
) {
  return catalogApi.list({ q, cursor, active: "true" }, signal);
}
const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
});
const today = () => dateFormat.format(new Date());

export function NewServiceDraft({
  onCreated,
  onCancel,
  onSessionLost,
}: {
  onCreated: (draft: ServiceDraft) => void;
  onCancel: () => void;
  onSessionLost: () => void;
}) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [offer, setOffer] = useState<CatalogOffer | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle || !offer || activeRequest.current) return;
    const serviceDate = String(
      new FormData(event.currentTarget).get("serviceDate"),
    );
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const saved = await serviceDraftsApi.create(
        { vehicleId: vehicle.id, catalogOfferId: offer.id, serviceDate },
        controller.signal,
      );
      if (!controller.signal.aborted) onCreated(saved);
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
      aria-labelledby="new-draft-title"
    >
      <h2 id="new-draft-title">Nuevo borrador</h2>
      <p className="records-description">
        Seleccioná el vehículo y la oferta. Se copiarán la propuesta comercial y
        las personas vinculadas al vehículo para que puedas ajustarlas.
      </p>
      <form onSubmit={(event) => void submit(event)} aria-busy={pending}>
        <fieldset disabled={pending}>
          {vehicle && (
            <p className="notice notice-info">
              Vehículo:{" "}
              <strong>
                {vehicle.plate} · {vehicle.brand} {vehicle.model}
              </strong>
            </p>
          )}
          <RecordPicker
            label="Buscar vehículo del servicio"
            searchLabel="Buscar vehículos"
            load={loadVehicles}
            describe={(item) => `${item.plate} · ${item.brand} ${item.model}`}
            selectLabel={(item) => item.plate}
            onSelect={setVehicle}
            onSessionLost={onSessionLost}
            disabled={pending}
          />
          {offer && (
            <p className="notice notice-info">
              Oferta: <strong>{offer.name}</strong> · Precio sugerido:{" "}
              {offer.suggestedPrice} ARS
            </p>
          )}
          <RecordPicker
            label="Buscar oferta del servicio"
            searchLabel="Buscar ofertas"
            load={loadOffers}
            describe={(item) =>
              `${item.code} · ${item.name} · ${item.suggestedPrice} ARS`
            }
            selectLabel={(item) => item.name}
            onSelect={setOffer}
            onSessionLost={onSessionLost}
            disabled={pending}
          />
          <label className="field">
            Fecha del servicio
            <input
              name="serviceDate"
              type="date"
              required
              defaultValue={today()}
            />
          </label>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="primary"
            disabled={pending || !vehicle || !offer}
          >
            {pending ? "Creando…" : "Crear borrador"}
          </button>
        </div>
      </form>
    </section>
  );
}
