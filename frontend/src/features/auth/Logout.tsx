import { useEffect, useRef, useState } from "react";
import { authApi, isSessionLost } from "../../shared/api";
import { ErrorNotice, Icon } from "../../shared/ui";

export function Logout({ onLogout }: { onLogout: (expired: boolean) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function logout() {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError(false);
    try {
      await authApi.logout(controller.signal);
      if (!controller.signal.aborted) onLogout(false);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (isSessionLost(failure)) onLogout(true);
      else setError(true);
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
        activeRequest.current = null;
      }
    }
  }

  return (
    <>
      {error && (
        <ErrorNotice>
          No se pudo cerrar la sesión. Intentá nuevamente.
        </ErrorNotice>
      )}
      <button
        className="logout"
        disabled={pending}
        onClick={() => void logout()}
      >
        <Icon name="logout" />
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </>
  );
}
