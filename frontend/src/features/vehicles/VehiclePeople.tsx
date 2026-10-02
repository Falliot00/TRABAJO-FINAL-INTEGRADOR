import { useEffect, useState } from "react";
import type {
  Person,
  VehicleDetail,
  VehicleRelationship,
} from "@cilgas/contracts";
import { errorMessage, isSessionLost } from "../../shared/api";
import { vehiclesApi } from "../../shared/people-api";
import { Loading, RetryNotice } from "../../shared/ui";
import { RelationshipEditor } from "./RelationshipEditor";
import { CloseRelationship } from "./CloseRelationship";

const calendarDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

interface VehiclePeopleProps {
  vehicleId: string;
  initialPerson?: Person;
  onSessionLost: () => void;
  onClose: () => void;
  onChanged: () => void;
}

export function VehiclePeople({
  vehicleId,
  initialPerson,
  onSessionLost,
  onClose,
  onChanged,
}: VehiclePeopleProps) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState("");
  const [closing, setClosing] = useState<VehicleRelationship | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void vehiclesApi
      .detail(vehicleId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setVehicle(detail);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else setError(errorMessage(failure));
      });
    return () => controller.abort();
  }, [vehicleId, retry, onSessionLost]);

  const today = calendarDate.format(new Date());

  return (
    <section
      className="panel panel-padding editor-panel"
      aria-label="Personas e historia del vehículo"
    >
      <div className="editor-header">
        <h2>
          {vehicle ? `Personas de ${vehicle.plate}` : "Personas del vehículo"}
        </h2>
        <button className="secondary" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
      {error && (
        <RetryNotice
          message={error}
          onRetry={() => {
            setError("");
            setRetry((value) => value + 1);
          }}
        />
      )}
      {!vehicle && !error ? (
        <Loading />
      ) : (
        vehicle && (
          <>
            <p className="records-description">
              Titularidad y contacto conservan sus fechas. Hasta es la primera
              fecha en que la relación deja de estar vigente.
            </p>
            {notice && (
              <div className="notice notice-success" role="status">
                {notice}
              </div>
            )}
            {vehicle.relationships.length === 0 ? (
              <p className="empty-state">
                Todavía no hay personas relacionadas.
              </p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Persona</th>
                      <th scope="col">Relación</th>
                      <th scope="col">Desde</th>
                      <th scope="col">Hasta (exclusivo)</th>
                      <th scope="col">Vigencia</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicle.relationships.map((relationship) => (
                      <tr key={relationship.id}>
                        <td>
                          <strong>{relationship.person.name}</strong>
                          <div className="records-description">
                            {relationship.person.documentType}{" "}
                            {relationship.person.documentNumber}
                          </div>
                        </td>
                        <td>
                          {relationship.role === "TITULAR"
                            ? "Titular"
                            : "Contacto"}
                        </td>
                        <td>{relationship.from}</td>
                        <td>{relationship.until ?? "Sin cierre"}</td>
                        <td>
                          {relationship.from > today
                            ? "Programada"
                            : relationship.until && relationship.until <= today
                              ? "Finalizada"
                              : "Vigente"}
                        </td>
                        <td>
                          {relationship.until === null && (
                            <button
                              className="secondary table-action"
                              disabled={closing !== null}
                              aria-label={`Cerrar relación con ${relationship.person.name}`}
                              onClick={() => {
                                setClosing(relationship);
                                setNotice("");
                              }}
                            >
                              Cerrar relación
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {closing ? (
              <CloseRelationship
                relationship={closing}
                onSessionLost={onSessionLost}
                onCancel={() => setClosing(null)}
                onSaved={(detail) => {
                  setVehicle(detail);
                  setClosing(null);
                  setNotice("La relación se cerró conservando su historia.");
                  onChanged();
                }}
              />
            ) : vehicle.active ? (
              <RelationshipEditor
                vehicle={vehicle}
                initialPerson={initialPerson}
                onSessionLost={onSessionLost}
                onSaved={(detail) => {
                  setVehicle(detail);
                  setNotice(
                    "La relación se guardó conservando la historia del vehículo.",
                  );
                  onChanged();
                }}
              />
            ) : (
              <p className="records-description">
                Reactivá el vehículo para agregar relaciones.
              </p>
            )}
          </>
        )
      )}
    </section>
  );
}
