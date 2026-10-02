import { useEffect, useState } from "react";
import type {
  ComponentHistory,
  VehicleConfigurations,
} from "@cilgas/contracts";
import { componentsApi } from "../../shared/components-api";
import { errorMessage, isSessionLost } from "../../shared/api";
import { Loading, RetryNotice } from "../../shared/ui";
import { workshopInstant } from "../../shared/format";

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
  const [history, setHistory] = useState<
    ComponentHistory | VehicleConfigurations | null
  >(null);
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
        if (!controller.signal.aborted) setHistory(history);
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
      ) : history ? (
        <>
          <p className="notice notice-info">{history.message}</p>
          {"movements" in history && <ComponentEvents history={history} />}
          {"configurations" in history && (
            <EquipmentConfigurations history={history} />
          )}
        </>
      ) : (
        <Loading />
      )}
    </section>
  );
}

const componentLabels = {
  CILINDRO: "Cilindro",
  VALVULA: "Válvula",
  REGULADOR: "Regulador",
};

function EquipmentConfigurations({
  history,
}: {
  history: VehicleConfigurations;
}) {
  return (
    <>
      {history.configurations.map((configuration) => (
        <section
          key={configuration.id}
          className="records-section"
          aria-label={`Configuración ${configuration.id} ${configuration.id === history.currentConfigurationId ? "vigente" : "histórica"}`}
        >
          <h3>
            Configuración {configuration.id} ·{" "}
            {configuration.id === history.currentConfigurationId
              ? "Vigente"
              : "Histórica"}
          </h3>
          <p>
            Desde {workshopInstant(configuration.validFrom)}
            {configuration.validUntil
              ? ` hasta ${workshopInstant(configuration.validUntil)}`
              : " · Sin cierre registrado"}{" "}
            · Servicio {configuration.serviceId ?? "Sin informar"}
          </p>
          {configuration.components.length === 0 ? (
            <p>Esta configuración no contiene componentes.</p>
          ) : (
            <ul>
              {configuration.components.map((component) => (
                <li key={component.componentId}>
                  {componentLabels[component.type]} · Componente{" "}
                  {component.componentId} · Posición {component.position}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

const movementLabels: Record<string, string> = {
  INSTALAR: "Instalación",
  RETIRAR: "Retiro",
  BAJA: "Baja",
  INSPECCIONAR: "Inspección",
  ENSAYAR: "Ensayo",
  MANTENER: "Permanencia",
};

function ComponentEvents({ history }: { history: ComponentHistory }) {
  return (
    <>
      <h3>Movimientos confirmados</h3>
      {history.movements.length === 0 ? (
        <p>Sin movimientos registrados.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Acción</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {history.movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{movement.serviceId}</td>
                  <td>{movementLabels[movement.action] ?? movement.action}</td>
                  <td>{movement.origin}</td>
                  <td>{movement.destination}</td>
                  <td>{workshopInstant(movement.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ComponentActivities activities={history.activities} />
      <h3>Resultados de PH</h3>
      {history.revisions.length === 0 ? (
        <p>Sin ensayos registrados.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Fecha de ensayo</th>
                <th>Resultado</th>
                <th>Certificado</th>
                <th>CRPC</th>
                <th>Vencimiento informado</th>
              </tr>
            </thead>
            <tbody>
              {history.revisions.map((revision) => (
                <tr key={revision.id}>
                  <td>{revision.serviceId}</td>
                  <td>{revision.testDate}</td>
                  <td>
                    {revision.result === "APROBADO" ? "Aprobado" : "Rechazado"}
                  </td>
                  <td>{revision.certificateNumber ?? "Sin informar"}</td>
                  <td>{revision.crpcId}</td>
                  <td>{revision.expiresOn ?? "Sin informar"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ComponentActivities({
  activities,
}: {
  activities: ComponentHistory["activities"];
}) {
  return (
    <>
      <h3>Intervenciones confirmadas</h3>
      {activities.length === 0 ? (
        <p>Sin intervenciones registradas.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Acción</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.serviceId}</td>
                  <td>{movementLabels[activity.action]}</td>
                  <td>{activity.description}</td>
                  <td>{workshopInstant(activity.occurredAt)}</td>
                  <td>{activity.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
