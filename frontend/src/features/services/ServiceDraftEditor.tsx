import { ServiceDraftConflict } from "./ServiceDraftConflict";
import { ServiceDraftBasics } from "./ServiceDraftBasics";
import { ServiceDraftProposal } from "./ServiceDraftProposal";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ServiceDraft,
  ServicePreparationInput,
  ServiceType,
  UpdateServiceDraftRequest,
} from "@cilgas/contracts";
import { serviceDraftsApi } from "../../shared/service-drafts-api";
import { ApiError, errorMessage, isSessionLost } from "../../shared/api";
import { ErrorNotice } from "../../shared/ui";
import { decimal } from "../catalog/catalog-fields";
import type { EditableItem } from "./ServiceItemEditor";
import { ServicePeople } from "./ServicePeople";
import { ServicePreparation } from "./ServicePreparation";
import { expirationAtMonthEnd } from "./service-dates";
import {
  ServiceInterventions,
  type EditableIntervention,
} from "./ServiceInterventions";

export function ServiceDraftEditor({
  draft,
  canViewCosts,
  onSaved,
  onReloaded,
  onCancel,
  onSessionLost,
}: {
  draft: ServiceDraft;
  canViewCosts: boolean;
  onSaved: (draft: ServiceDraft) => void;
  onReloaded: (draft: ServiceDraft) => void;
  onCancel: () => void;
  onSessionLost: () => void;
}) {
  const [vehicle, setVehicle] = useState(draft.vehicle);
  const [serviceDate, setServiceDate] = useState(draft.serviceDate);
  const [items, setItems] = useState<EditableItem[]>(() =>
    draft.items.map((item) => ({
      ...item,
      key: item.id,
      costs: item.costs?.map((cost) => ({ ...cost, key: crypto.randomUUID() })),
    })),
  );
  const [people, setPeople] = useState(draft.people);
  const [preparation, setPreparation] = useState<ServicePreparationInput>(
    () => ({
      previousSticker: null,
      newSticker: null,
      enabledOn: null,
      expiresOn: null,
      notes: null,
      pecId: null,
      tdmId: null,
      ...draft.preparation,
    }),
  );
  const [interventions, setInterventions] = useState<EditableIntervention[]>(
    () =>
      draft.interventions.map((entry) => ({
        ...entry,
        key: crypto.randomUUID(),
      })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);

  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function reload() {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const current = await serviceDraftsApi.detail(
        draft.id,
        controller.signal,
      );
      if (!controller.signal.aborted) onReloaded(current);
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const body: UpdateServiceDraftRequest = {
      version: draft.version,
      vehicleId: vehicle.id,
      serviceDate: String(form.get("serviceDate")),
      description: String(form.get("description")).trim(),
      type: String(form.get("type")) as ServiceType,
      totalAmount: decimal(String(form.get("totalAmount"))),
      notes: String(form.get("notes")).trim() || null,
      people: people.map(({ role, personId }) => ({ role, personId })),
      preparation: {
        ...preparation,
        enabledOn: serviceDate || null,
        expiresOn: preparation.newSticker
          ? expirationAtMonthEnd(serviceDate, 1)
          : null,
      },
      interventions: interventions.map(({ key, ...entry }) => {
        void key;
        return {
          ...entry,
          row: Number(entry.row),
          ...(entry.type === "CILINDRO"
            ? {
                revisionExpiresOn:
                  entry.performsPh && entry.phResult === "RECHAZADO"
                    ? null
                    : expirationAtMonthEnd(
                        entry.performsPh ? entry.testDate : entry.revisionMonth,
                        5,
                      ),
              }
            : {}),
        };
      }),
      sheetOperation:
        (String(
          form.get("sheetOperation"),
        ) as ServiceDraft["sheetOperation"]) || null,
      includesPh: form.get("includesPh") === "on",
      phReason:
        (String(form.get("phReason")) as ServiceDraft["phReason"]) || null,
      items: items.map((item, index) => ({
        ...(item.id ? { id: item.id } : {}),
        order: index + 1,
        description: item.description.trim(),
        type: item.type,
        componentId: item.componentId ?? null,
        action: item.action ?? null,
        quantity: decimal(item.quantity),
        unitPrice: decimal(item.unitPrice),
        discount: decimal(item.discount),
        ...(canViewCosts && item.costs
          ? {
              costs: item.costs.map((cost) => ({
                concept: cost.concept.trim(),
                supplierId: cost.supplierId ?? null,
                treatment: cost.treatment,
                amount: decimal(cost.amount),
              })),
            }
          : {}),
      })),
    };
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const saved = await serviceDraftsApi.update(
        draft.id,
        body,
        controller.signal,
      );
      if (!controller.signal.aborted) onSaved(saved);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else {
        setError(errorMessage(failure));
        if (failure instanceof ApiError && failure.status === 409)
          setConflict(true);
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
      className="panel panel-padding editor-panel service-editor"
      aria-labelledby="draft-editor-title"
    >
      <h2 id="draft-editor-title">Editar borrador {draft.id}</h2>
      <p>
        <strong>{vehicle.plate}</strong> · {vehicle.brand} {vehicle.model}
      </p>
      <p className="records-description">
        Creado por {draft.createdByName} · Versión {draft.version}
      </p>
      <p className="records-description">
        Guardá la preparación mientras completás el trabajo. El borrador no
        emite documentos ni cambia el equipo o genera movimientos financieros.
      </p>
      <form onSubmit={(event) => void submit(event)} aria-busy={pending}>
        <fieldset disabled={pending}>
          <ServiceDraftBasics
            draft={draft}
            vehicle={vehicle}
            pending={pending}
            setVehicle={setVehicle}
            serviceDate={serviceDate}
            onServiceDateChange={setServiceDate}
            onSessionLost={onSessionLost}
          />
          <ServicePeople
            people={people}
            disabled={pending}
            onChange={setPeople}
            onSessionLost={onSessionLost}
          />
          <ServiceDraftProposal
            items={items}
            setItems={setItems}
            canViewCosts={canViewCosts}
            pending={pending}
            onSessionLost={onSessionLost}
          />
          <ServicePreparation
            preparation={preparation}
            serviceDate={serviceDate}
            disabled={pending}
            onChange={setPreparation}
            onSessionLost={onSessionLost}
          />
          <div className="form-grid">
            <label className="field">
              Operación de ficha
              <select
                name="sheetOperation"
                defaultValue={draft.sheetOperation ?? ""}
              >
                <option value="">Sin informar</option>
                <option value="C">C · Conversión</option>
                <option value="M">M · Modificación</option>
                <option value="R">R · Revisión</option>
                <option value="D">D · Desmontaje</option>
                <option value="B">B · Baja</option>
              </select>
            </label>
            <label className="field">
              Motivo de PH
              <select name="phReason" defaultValue={draft.phReason ?? ""}>
                <option value="">Sin informar</option>
                <option value="VENCIMIENTO">Vencimiento de la última PH</option>
                <option value="SERVICIO_PH">Servicio de PH</option>
                <option value="MODIFICACION">
                  Modificación con PH antes del vencimiento
                </option>
                <option value="CONVERSION">Conversión</option>
              </select>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="includesPh"
                defaultChecked={draft.includesPh}
              />
              El servicio incluye PH
            </label>
          </div>
          <p className="records-description">
            PH por vencimiento o servicio de PH: R. Conversión: C con PH.
            Modificación con oblea vigente: M. Estos trabajos requieren oblea
            nueva, aunque la anterior siga vigente. Completá el resultado real y
            el CRPC de cada ensayo antes de confirmar.
          </p>
          <ServiceInterventions
            interventions={interventions}
            disabled={pending}
            onChange={setInterventions}
            onSessionLost={onSessionLost}
          />
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {conflict && (
          <ServiceDraftConflict
            pending={pending}
            onReload={() => void reload()}
          />
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cerrar edición
          </button>
          <button type="submit" className="primary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar borrador"}
          </button>
        </div>
      </form>
    </section>
  );
}
