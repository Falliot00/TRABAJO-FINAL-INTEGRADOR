import type {
  Component,
  ComponentHistory,
  ComponentInput,
  Page,
  VehicleConfigurations,
} from "@cilgas/contracts";
import { mutate, request } from "./api";
import { recordQuery, type RecordQuery } from "./catalog-api";

export const componentsApi = {
  list: (query: RecordQuery = {}, signal?: AbortSignal) =>
    request<Page<Component>>(`/components?${recordQuery(query)}`, { signal }),
  duplicates: (
    modelId: string,
    serialNumber: string,
    excludeId?: string,
    signal?: AbortSignal,
  ) =>
    request<Page<Component>>(
      `/components/duplicates?${new URLSearchParams({ modelId, serialNumber, ...(excludeId ? { excludeId } : {}) })}`,
      { signal },
    ),
  create: (body: ComponentInput, signal?: AbortSignal) =>
    mutate<Component>("/components", "POST", body, signal),
  update: (id: string, body: ComponentInput, signal?: AbortSignal) =>
    mutate<Component>(
      `/components/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
  history: (id: string, signal?: AbortSignal) =>
    request<ComponentHistory>(`/components/${encodeURIComponent(id)}/history`, {
      signal,
    }),
  configurations: (id: string, signal?: AbortSignal) =>
    request<VehicleConfigurations>(
      `/vehicles/${encodeURIComponent(id)}/configurations`,
      { signal },
    ),
};
