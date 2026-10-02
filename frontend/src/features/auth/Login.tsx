import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { SessionUser } from "@cilgas/contracts";
import { authApi, ApiError } from "../../shared/api";
import { Brand, ErrorNotice, Icon } from "../../shared/ui";

interface LoginProps {
  onLogin: (user: SessionUser) => void;
  notice?: string;
  themeControl: ReactNode;
}

export function Login({ onLogin, notice, themeControl }: LoginProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");
    try {
      const result = await authApi.login(
        {
          email: String(form.get("email")).trim(),
          password: String(form.get("password")),
        },
        controller.signal,
      );
      if (!controller.signal.aborted) onLogin(result.user);
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(
        failure instanceof ApiError && failure.status === 401
          ? "No pudimos iniciar sesión. Revisá tu correo y contraseña."
          : failure instanceof ApiError && failure.status === 429
            ? "Hubo demasiados intentos. Esperá unos minutos e intentá nuevamente."
            : "No pudimos iniciar sesión. Intentá nuevamente en unos momentos.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
        activeRequest.current = null;
      }
    }
  }

  return (
    <main className="login">
      <aside className="login-story" aria-label="CILGAS">
        <Brand />
        <div>
          <p className="eyebrow">El taller, conectado</p>
          <h1>
            La confianza empieza
            <br />
            con cada <span>detalle.</span>
          </h1>
          <p>
            Un espacio compartido para trabajar con claridad y cuidar la
            historia de cada atención.
          </p>
        </div>
        <span className="login-footnote">CILGAS · EQUIPOS DE GNC</span>
      </aside>
      <section className="login-main" aria-labelledby="login-title">
        {themeControl}
        <div className="login-card">
          <span className="eyebrow">Bienvenido a tu espacio</span>
          <h2 id="login-title">Ingresá a CILGAS</h2>
          <p className="muted">Usá tu cuenta del taller para continuar.</p>
          {notice && (
            <div className="notice notice-info" role="status">
              {notice}
            </div>
          )}
          {error && <ErrorNotice>{error}</ErrorNotice>}
          <form
            className="form-stack"
            onSubmit={(event) => void submit(event)}
            aria-busy={pending}
          >
            <label className="field">
              Correo electrónico
              <input
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                disabled={pending}
                placeholder="nombre@correo.com"
              />
            </label>
            <label className="field">
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
                disabled={pending}
              />
            </label>
            <button className="primary" disabled={pending} type="submit">
              {pending ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
          <div className="login-note">
            <Icon name="shield" />
            <span>
              Acceso exclusivo para el equipo de CILGAS.
              <br />
              Si necesitás ayuda con tu cuenta, contactá al administrador.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
