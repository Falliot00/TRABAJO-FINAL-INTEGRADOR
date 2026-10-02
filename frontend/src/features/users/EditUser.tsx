import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  RoleCode,
  UpdateUserRequest,
  UserSummary,
} from "@cilgas/contracts";
import { errorMessage, isSessionLost, usersApi } from "../../shared/api";
import { roleName } from "../../shared/format";
import { ErrorNotice } from "../../shared/ui";

interface EditUserProps {
  user: UserSummary;
  onSaved: (user: UserSummary) => void;
  onRevoked: () => void;
  onCancel: () => void;
  onSessionLost: () => void;
}

export function EditUser({
  user,
  onSaved,
  onRevoked,
  onCancel,
  onSessionLost,
}: EditUserProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<
    UpdateUserRequest | "revoke" | null
  >(null);
  const activeRequest = useRef<AbortController | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameInput.current?.focus();
    return () => activeRequest.current?.abort();
  }, []);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setConfirmation({
      name: String(form.get("name")).trim(),
      role: form.get("role") as RoleCode,
      active: form.get("active") === "true",
    });
  }

  async function confirm() {
    if (!confirmation || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      if (confirmation === "revoke") {
        await usersApi.revokeSessions(user.id, controller.signal);
        if (!controller.signal.aborted) onRevoked();
      } else {
        const updated = await usersApi.update(
          user.id,
          confirmation,
          controller.signal,
        );
        if (!controller.signal.aborted) onSaved(updated);
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onSessionLost();
      else setError(errorMessage(failure));
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
        activeRequest.current = null;
      }
    }
  }

  return (
    <section
      className="panel panel-padding editor-panel"
      aria-labelledby="edit-user-title"
    >
      <h2 id="edit-user-title">Editar cuenta</h2>
      <p className="muted">{user.email}</p>
      <form onSubmit={prepare} aria-busy={pending}>
        <fieldset
          className="form-grid"
          disabled={pending || confirmation !== null}
        >
          <label className="field">
            Nombre
            <input
              ref={nameInput}
              name="name"
              defaultValue={user.name}
              required
              maxLength={120}
            />
          </label>
          <label className="field">
            Rol
            <select name="role" defaultValue={user.role}>
              <option value="OPERADOR">Operador</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </label>
          <label className="field">
            Estado de la cuenta
            <select name="active" defaultValue={String(user.active)}>
              <option value="true">Activa</option>
              <option value="false">Desactivada</option>
            </select>
          </label>
        </fieldset>
        {confirmation === null && (
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="primary">
              Guardar cambios
            </button>
          </div>
        )}
      </form>
      {confirmation && (
        <div
          className="notice notice-info"
          role="region"
          aria-label="Confirmación de la acción"
        >
          {confirmation === "revoke" ? (
            <>
              <strong>¿Cerrar todas las sesiones de {user.name}?</strong>
              <p>
                La cuenta permanecerá activa si ya lo estaba. Deberá ingresar
                nuevamente para continuar.
              </p>
            </>
          ) : (
            <>
              <strong>Confirmá los cambios de esta cuenta</strong>
              <p>
                {confirmation.name} · {roleName(confirmation.role ?? user.role)}{" "}
                · {confirmation.active ? "Activa" : "Desactivada"}
              </p>
              <p>
                El cambio de rol o la desactivación cerrará todas las sesiones
                vigentes de esta persona.
              </p>
            </>
          )}
          <div className="confirm-actions">
            <button
              className="secondary"
              disabled={pending}
              onClick={() => setConfirmation(null)}
            >
              Volver
            </button>
            <button
              className="primary"
              disabled={pending}
              onClick={() => void confirm()}
            >
              {pending
                ? "Aplicando…"
                : confirmation === "revoke"
                  ? "Revocar ahora"
                  : "Confirmar cambios"}
            </button>
          </div>
        </div>
      )}
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <div className="security-actions">
        <div>
          <h3>Sesiones de la cuenta</h3>
          <p>Cerrá los accesos abiertos en todos sus dispositivos.</p>
        </div>
        <button
          className="secondary"
          disabled={pending || confirmation !== null}
          onClick={() => {
            setError("");
            setConfirmation("revoke");
          }}
        >
          Revocar sesiones
        </button>
      </div>
    </section>
  );
}
