import { useEffect, useRef, useState, type FormEvent } from "react";
import type { RoleCode, UserSummary } from "@cilgas/contracts";
import { errorMessage, isSessionLost, usersApi } from "../../shared/api";
import { ErrorNotice } from "../../shared/ui";

interface NewUserProps {
  onCreated: (user: UserSummary) => void;
  onCancel: () => void;
  onSessionLost: () => void;
}

export function NewUser({ onCreated, onCancel, onSessionLost }: NewUserProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameInput.current?.focus();
    return () => activeRequest.current?.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const data = new FormData(event.currentTarget);
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const created = await usersApi.create(
        {
          name: String(data.get("name")).trim(),
          email: String(data.get("email")).trim(),
          password: String(data.get("password")),
          role: data.get("role") as RoleCode,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) onCreated(created);
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
      aria-labelledby="new-user-title"
    >
      <h2 id="new-user-title">Nueva cuenta del taller</h2>
      <p className="muted">
        Una cuenta individual para cada integrante del equipo.
      </p>
      <form onSubmit={(event) => void submit(event)} aria-busy={pending}>
        <fieldset className="form-grid" disabled={pending}>
          <label className="field">
            Nombre
            <input
              ref={nameInput}
              name="name"
              autoComplete="off"
              required
              maxLength={120}
            />
          </label>
          <label className="field">
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="off"
              required
              maxLength={254}
            />
          </label>
          <div className="field">
            <label htmlFor="new-password">Contraseña inicial</label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              aria-describedby="password-hint"
            />
            <span className="field-hint" id="password-hint">
              Entre 12 y 128 caracteres. Compartila de forma privada.
            </span>
          </div>
          <div className="field">
            <label htmlFor="new-role">Rol</label>
            <select
              id="new-role"
              name="role"
              defaultValue="OPERADOR"
              aria-describedby="role-hint"
            >
              <option value="OPERADOR">Operador</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
            <span className="field-hint" id="role-hint">
              El administrador puede gestionar cuentas y consultar la auditoría
              global.
            </span>
          </div>
        </fieldset>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="form-actions">
          <button
            className="secondary"
            type="button"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button className="primary" type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </form>
    </section>
  );
}
