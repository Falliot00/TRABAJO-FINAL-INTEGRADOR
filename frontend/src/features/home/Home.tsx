import type { SessionUser } from "@cilgas/contracts";
import { roleName } from "../../shared/format";
import { Icon } from "../../shared/ui";

interface HomeProps {
  user: SessionUser;
  onNavigate: (
    page: "users" | "audit" | "people" | "vehicles" | "settings",
  ) => void;
}

export function Home({ user, onNavigate }: HomeProps) {
  const canManage = user.permissions.includes("usuarios.administrar");
  const canAudit = user.permissions.includes("auditoria.consultar");
  const canAttend = user.permissions.includes("personas.gestionar");
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Tu espacio de trabajo</span>
          <h1>Hola, {user.name.trim().split(/\s+/)[0]}</h1>
          <p>Bienvenido a CILGAS. Todo empieza con un equipo conectado.</p>
        </div>
      </header>
      <section className="panel welcome-panel" aria-labelledby="welcome-title">
        <div>
          <span className="badge">
            <span className="badge-dot" />
            Sesión activa
          </span>
          <h2 id="welcome-title">Un lugar para trabajar juntos.</h2>
          <p>
            Estás en el espacio del taller. Tu cuenta identifica las acciones
            que realizás y te da acceso según tu responsabilidad.
          </p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <Icon name="workshop" />
        </div>
      </section>
      <div className="home-grid">
        <section
          className="panel panel-padding"
          aria-labelledby="identity-title"
        >
          <h2 id="identity-title">Tu cuenta</h2>
          <p className="muted">Tu identidad dentro del taller.</p>
          <dl className="identity-list">
            <div>
              <dt>Nombre</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Correo electrónico</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{roleName(user.role)}</dd>
            </div>
          </dl>
        </section>
        <section
          className="panel panel-padding"
          aria-labelledby="actions-title"
        >
          <h2 id="actions-title">
            {canManage || canAudit || canAttend
              ? "Accesos del taller"
              : "Trabajá con tu cuenta"}
          </h2>
          <p className="muted">
            {canManage || canAudit || canAttend
              ? "Buscá datos del taller y accedé a las acciones de tu rol."
              : "Cada persona del equipo utiliza su propio acceso para conservar la autoría de sus acciones."}
          </p>
          <div className="quick-actions">
            {canAttend && (
              <>
                <button
                  className="action-card"
                  onClick={() => onNavigate("people")}
                >
                  <Icon name="users" />
                  <span>
                    <strong>Buscar personas</strong>
                    <small>Datos de contacto y vehículos relacionados</small>
                  </span>
                  <Icon name="arrow" />
                </button>
                <button
                  className="action-card"
                  onClick={() => onNavigate("vehicles")}
                >
                  <Icon name="workshop" />
                  <span>
                    <strong>Buscar vehículos</strong>
                    <small>Dominios, titulares e historia de vínculos</small>
                  </span>
                  <Icon name="arrow" />
                </button>
              </>
            )}
            {canManage && (
              <button
                className="action-card"
                onClick={() => onNavigate("users")}
              >
                <Icon name="users" />
                <span>
                  <strong>Administrar usuarios</strong>
                  <small>Cuentas, roles y acceso al taller</small>
                </span>
                <Icon name="arrow" />
              </button>
            )}
            {canAudit && (
              <button
                className="action-card"
                onClick={() => onNavigate("audit")}
              >
                <Icon name="audit" />
                <span>
                  <strong>Consultar auditoría</strong>
                  <small>Quién hizo qué y cuándo</small>
                </span>
                <Icon name="arrow" />
              </button>
            )}
            {!canManage && !canAudit && !canAttend && (
              <div className="notice notice-info">
                Al terminar de trabajar, cerrá tu sesión si compartís este
                dispositivo.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
