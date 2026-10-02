import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@cilgas/contracts";
import { authApi, isSessionLost } from "../shared/api";
import { Icon, Loading } from "../shared/ui";
import { useTheme } from "../shared/use-theme";
import { Login } from "../features/auth/Login";
import { Workspace } from "./Workspace";

type SessionState =
  | { status: "loading" }
  | { status: "anonymous"; notice?: string }
  | { status: "error" }
  | { status: "authenticated"; user: SessionUser };

export function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const onSessionLost = useCallback(
    () =>
      setSession({
        status: "anonymous",
        notice: "Tu sesión finalizó o fue revocada. Ingresá nuevamente.",
      }),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    void authApi
      .session(controller.signal)
      .then(({ user }) => {
        if (!controller.signal.aborted)
          setSession({ status: "authenticated", user });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setSession(
            isSessionLost(error)
              ? { status: "anonymous" }
              : { status: "error" },
          );
      });
    return () => controller.abort();
  }, [retry]);

  const themeControl = (
    <button
      className="theme-button"
      onClick={toggleTheme}
      aria-label={`Usar tema ${theme === "light" ? "oscuro" : "claro"}`}
      title={`Usar tema ${theme === "light" ? "oscuro" : "claro"}`}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} />
    </button>
  );
  if (session.status === "loading") return <Loading full />;
  if (session.status === "error")
    return (
      <main className="load-state loading-full">
        <div>
          <p>No pudimos verificar tu sesión.</p>
          <button
            className="primary"
            onClick={() => {
              setSession({ status: "loading" });
              setRetry((value) => value + 1);
            }}
          >
            Intentar nuevamente
          </button>
        </div>
      </main>
    );
  if (session.status === "anonymous")
    return (
      <Login
        notice={session.notice}
        themeControl={themeControl}
        onLogin={(user) => setSession({ status: "authenticated", user })}
      />
    );
  return (
    <Workspace
      user={session.user}
      themeControl={themeControl}
      onSessionLost={onSessionLost}
      onUserUpdated={(user) => setSession({ status: "authenticated", user })}
      onLogout={(expired) => {
        if (expired) onSessionLost();
        else
          setSession({
            status: "anonymous",
            notice: "Cerraste tu sesión correctamente.",
          });
      }}
    />
  );
}
