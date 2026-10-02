import type {
  AuditPage,
  CreateUserRequest,
  CsrfResponse,
  LoginRequest,
  SessionResponse,
  UpdateUserRequest,
  UserSummary,
} from "@cilgas/contracts";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "message" in body
        ? body.message
        : null;
    throw new ApiError(
      response.status,
      typeof message === "string"
        ? message
        : "No se pudo completar la acción. Intentá nuevamente.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function csrf(signal?: AbortSignal) {
  return request<CsrfResponse>("/auth/csrf", { signal });
}

export async function mutate<T>(
  path: string,
  method: "POST" | "PATCH",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const { csrfToken } = await csrf(signal);
  return request<T>(path, {
    method,
    signal,
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export const authApi = {
  session: (signal?: AbortSignal) =>
    request<SessionResponse>("/auth/session", { signal }),
  logout: (signal?: AbortSignal) =>
    mutate<void>("/auth/logout", "POST", undefined, signal),
  async login(body: LoginRequest, signal?: AbortSignal) {
    const session = await mutate<SessionResponse>(
      "/auth/login",
      "POST",
      body,
      signal,
    );
    await csrf(signal);
    return session;
  },
};

export const usersApi = {
  list: (signal?: AbortSignal) => request<UserSummary[]>("/users", { signal }),
  create: (body: CreateUserRequest, signal?: AbortSignal) =>
    mutate<UserSummary>("/users", "POST", body, signal),
  update: (id: string, body: UpdateUserRequest, signal?: AbortSignal) =>
    mutate<UserSummary>(
      `/users/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
  revokeSessions: (id: string, signal?: AbortSignal) =>
    mutate<void>(
      `/users/${encodeURIComponent(id)}/revoke-sessions`,
      "POST",
      undefined,
      signal,
    ),
};

export const auditApi = {
  list(cursor: string | null, signal?: AbortSignal) {
    const query = new URLSearchParams({ limit: "25" });
    if (cursor) query.set("cursor", cursor);
    return request<AuditPage>(`/audit?${query.toString()}`, { signal });
  },
};

export function isSessionLost(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.";
}
