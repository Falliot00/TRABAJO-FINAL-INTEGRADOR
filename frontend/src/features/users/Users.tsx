import { useEffect, useState } from "react";
import type { SessionUser, UserSummary } from "@cilgas/contracts";
import { errorMessage, isSessionLost, usersApi } from "../../shared/api";
import { initials, roleName } from "../../shared/format";
import { Icon, Loading, RetryNotice } from "../../shared/ui";
import { NewUser } from "./NewUser";
import { EditUser } from "./EditUser";

interface UsersProps {
  currentUser: SessionUser;
  onUserUpdated: (user: SessionUser) => void;
  onSessionLost: () => void;
}

export function Users({
  currentUser,
  onUserUpdated,
  onSessionLost,
}: UsersProps) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void usersApi
      .list(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setUsers(result);
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
  }, [onSessionLost, retry]);

  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">Administración</span>
          <h1>Usuarios</h1>
          <p>Gestioná las cuentas y los permisos de acceso de tu equipo.</p>
        </div>
        <button
          className="primary button-content"
          disabled={loading || creating || editing !== null}
          onClick={() => {
            setCreating(true);
            setNotice("");
          }}
        >
          <Icon name="plus" />
          Nuevo usuario
        </button>
      </header>
      {notice && (
        <div className="notice notice-success page-notice" role="status">
          {notice}
        </div>
      )}
      {creating && (
        <NewUser
          onSessionLost={onSessionLost}
          onCancel={() => setCreating(false)}
          onCreated={(created) => {
            setUsers((current) => [...current, created]);
            setCreating(false);
            setNotice("La cuenta se creó correctamente.");
          }}
        />
      )}
      {editing && (
        <EditUser
          key={editing.id}
          user={editing}
          onSessionLost={onSessionLost}
          onCancel={() => setEditing(null)}
          onSaved={(updated) => {
            if (updated.id === currentUser.id) {
              if (!updated.active || updated.role !== currentUser.role) {
                onSessionLost();
                return;
              }
              onUserUpdated(updated);
            }
            setUsers((current) =>
              current.map((entry) =>
                entry.id === updated.id ? updated : entry,
              ),
            );
            setEditing(null);
            setNotice("Los cambios se guardaron correctamente.");
          }}
          onRevoked={() => {
            if (editing.id === currentUser.id) {
              onSessionLost();
              return;
            }
            setNotice(`Se cerraron todas las sesiones de ${editing.name}.`);
            setEditing(null);
          }}
        />
      )}
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
      <section className="panel" aria-label="Cuentas del taller">
        <div className="section-title">
          <h2>Equipo del taller</h2>
          <small>
            {!loading &&
              `${users.length} ${users.length === 1 ? "cuenta" : "cuentas"}`}
          </small>
        </div>
        {loading ? (
          <Loading />
        ) : users.length === 0 ? (
          <div className="empty-state">No hay cuentas para mostrar.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Cuenta</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar" aria-hidden="true">
                          {initials(user.name)}
                        </span>
                        <div>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{roleName(user.role)}</td>
                    <td>
                      <span
                        className={`status${user.active ? "" : " status-inactive"}`}
                      >
                        {user.active ? "Activa" : "Desactivada"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary table-action"
                        disabled={creating || editing !== null}
                        aria-label={`Editar ${user.name}`}
                        onClick={() => {
                          setEditing(user);
                          setNotice("");
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
