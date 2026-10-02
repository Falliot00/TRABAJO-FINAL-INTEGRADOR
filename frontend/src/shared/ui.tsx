import type { ReactNode } from "react";

type IconName =
  | "home"
  | "users"
  | "audit"
  | "sun"
  | "moon"
  | "logout"
  | "shield"
  | "arrow"
  | "plus"
  | "close"
  | "workshop";

const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" />
    </>
  ),
  audit: (
    <>
      <path d="M8 4H5v17h14V4h-3M9 3h6v4H9zM8 12h8m-8 4h5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  moon: <path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z" />,
  logout: (
    <>
      <path d="M9 4H4v16h5m6-12 4 4-4 4m-6-4h10" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v5c0 5-4 8-8 10-4-2-8-5-8-10V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  workshop: (
    <>
      <path d="m3 9 9-6 9 6v12H3Zm4 12v-9h10v9m-10-6h10m-10 3h10" />
      <path d="M10 7h4" />
    </>
  ),
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="workshop" />
      </span>
      <div>
        <span className="brand-word">CILGAS</span>
        <span className="brand-caption">Gestión del taller</span>
      </div>
    </div>
  );
}

export function Loading({ full = false }: { full?: boolean }) {
  return (
    <div className={`load-state${full ? " loading-full" : ""}`} role="status">
      <span className="spinner" aria-hidden="true" />
      Cargando tu espacio…
    </div>
  );
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div className="notice notice-error" role="alert">
      {children}
    </div>
  );
}

export function RetryNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="page-notice">
      <ErrorNotice>{message}</ErrorNotice>
      <button className="text-button" onClick={onRetry}>
        Intentar nuevamente
      </button>
    </div>
  );
}
