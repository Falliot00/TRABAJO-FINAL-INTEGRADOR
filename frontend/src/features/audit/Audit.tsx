import { useEffect, useState } from "react";
import type { AuditPage, SessionUser } from "@cilgas/contracts";
import { auditApi, errorMessage, isSessionLost } from "../../shared/api";
import { Loading, RetryNotice } from "../../shared/ui";

const actions: Record<string, string> = {
  USUARIO_INICIAL_CREADO: "Cuenta inicial creada",
  SESION_INICIADA: "Inicio de sesión",
  SESION_CERRADA: "Cierre de sesión",
  ACCESO_RECHAZADO: "Acceso rechazado",
  ACCESO_DENEGADO: "Acceso denegado",
  USUARIO_CREADO: "Cuenta creada",
  USUARIO_ACTUALIZADO: "Cuenta actualizada",
  SESIONES_REVOCADAS: "Sesiones revocadas",
  TALLER_ACTUALIZADO: "Datos del taller actualizados",
  ACTOR_REGULATORIO_CREADO: "Actor regulatorio creado",
  ACTOR_REGULATORIO_ACTUALIZADO: "Actor regulatorio actualizado",
  MODELO_COMPONENTE_CREADO: "Modelo de componente creado",
  MODELO_COMPONENTE_ACTUALIZADO: "Modelo de componente actualizado",
  PERSONA_CREADA: "Persona registrada",
  PERSONA_ACTUALIZADA: "Persona actualizada",
  VEHICULO_CREADO: "Vehículo registrado",
  VEHICULO_ACTUALIZADO: "Vehículo actualizado",
  VINCULO_VEHICULO_CREADO: "Persona vinculada al vehículo",
  VINCULO_VEHICULO_CERRADO: "Vigencia del vínculo cerrada",
};
const entities: Record<string, string> = {
  usuarios: "Cuenta",
  configuracion_taller: "Taller",
  actores_regulatorios: "Actor regulatorio",
  modelos_componentes: "Modelo de componente",
  personas: "Persona",
  vehiculos: "Vehículo",
  vehiculo_personas: "Vínculo con vehículo",
};
const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
const timeFormat = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function Audit({
  currentUser,
  onSessionLost,
}: {
  currentUser: SessionUser;
  onSessionLost: () => void;
}) {
  const [page, setPage] = useState<AuditPage>({ items: [], nextCursor: null });
  const [history, setHistory] = useState<(string | null)[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void auditApi
      .list(cursor, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setPage(result);
          setLoading(false);
        }
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isSessionLost(failure)) onSessionLost();
        else {
          setError(errorMessage(failure));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [cursor, retry, onSessionLost]);

  function navigate(older: boolean) {
    setLoading(true);
    setError("");
    if (older) {
      setHistory((current) => [...current, cursor]);
      setCursor(page.nextCursor);
    } else {
      setCursor(history.at(-1) ?? null);
      setHistory((current) => current.slice(0, -1));
    }
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Trazabilidad</span>
          <h1>Auditoría</h1>
          <p>
            Consultá los accesos y los cambios registrados en los datos del
            taller.
          </p>
        </div>
      </header>
      {error && (
        <RetryNotice
          message={error}
          onRetry={() => {
            setLoading(true);
            setError("");
            setRetry((value) => value + 1);
          }}
        />
      )}
      <section className="panel" aria-label="Registro de actividad">
        <div className="section-title">
          <h2>Actividad registrada</h2>
          <small>Hora de Argentina</small>
        </div>
        {loading ? (
          <Loading />
        ) : error ? null : page.items.length === 0 ? (
          <div className="empty-state">No hay actividad para mostrar.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Autor</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((event) => (
                  <tr key={event.id}>
                    <td className="audit-date">
                      <time dateTime={event.occurredAt}>
                        {dateFormat.format(new Date(event.occurredAt))}
                        <small>
                          {timeFormat.format(new Date(event.occurredAt))}
                        </small>
                      </time>
                    </td>
                    <td>
                      <div className="audit-action">
                        {actions[event.action] ?? event.action}
                      </div>
                      <div className="audit-detail">
                        {entities[event.entity] ?? event.entity}
                        {event.entityId ? ` #${event.entityId}` : ""}
                        {event.detail && (
                          <>
                            <br />
                            {event.detail}
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      {event.actorId === currentUser.id
                        ? currentUser.name
                        : event.actorId
                          ? `Usuario #${event.actorId}`
                          : "Sin usuario identificado"}
                    </td>
                    <td>
                      <span
                        className={`status${event.result === "RECHAZADO" ? " status-rejected" : ""}`}
                      >
                        {event.result === "EXITO" ? "Realizada" : "Rechazada"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <button
            className="secondary"
            disabled={loading || history.length === 0}
            onClick={() => navigate(false)}
          >
            Más recientes
          </button>
          <small>Página {history.length + 1}</small>
          <button
            className="secondary"
            disabled={loading || !!error || page.nextCursor === null}
            onClick={() => navigate(true)}
          >
            Más antiguos
          </button>
        </div>
      </section>
    </>
  );
}
