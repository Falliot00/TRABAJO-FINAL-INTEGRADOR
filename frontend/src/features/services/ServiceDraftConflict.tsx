import { useState } from "react";

export function ServiceDraftConflict({
  pending,
  onReload,
}: {
  pending: boolean;
  onReload: () => void;
}) {
  const [confirmReload, setConfirmReload] = useState(false);
  return (
    <div className="notice notice-info">
      <p>
        Tus cambios siguen en este formulario. Recargá la versión compartida
        para continuar.
      </p>
      {confirmReload ? (
        <>
          <p>
            Al recargar se descartarán los cambios que todavía no guardaste.
          </p>
          <div className="records-actions">
            <button
              type="button"
              className="secondary"
              disabled={pending}
              onClick={() => setConfirmReload(false)}
            >
              Conservar mi edición
            </button>
            <button
              type="button"
              className="primary"
              disabled={pending}
              onClick={onReload}
            >
              Descartar mis cambios y recargar
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={() => setConfirmReload(true)}
        >
          Recargar borrador
        </button>
      )}
    </div>
  );
}
