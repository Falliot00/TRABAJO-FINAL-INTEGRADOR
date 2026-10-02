import type {
  ConfirmedService,
  Page,
  ServiceSheet,
  SupplierObligation,
} from "@cilgas/contracts";
import { request } from "./api";
import { recordQuery, type RecordQuery } from "./catalog-api";

export const servicesApi = {
  list: (query: RecordQuery = {}, signal?: AbortSignal) =>
    request<Page<ConfirmedService>>(`/services?${recordQuery(query)}`, {
      signal,
    }),
  detail: (id: string, signal?: AbortSignal) =>
    request<ConfirmedService>(`/services/${encodeURIComponent(id)}`, {
      signal,
    }),
  sheet: (id: string, signal?: AbortSignal) =>
    request<ServiceSheet>(`/services/${encodeURIComponent(id)}/sheet`, {
      signal,
    }),
  obligations: (id: string, signal?: AbortSignal) =>
    request<Page<SupplierObligation>>(
      `/services/${encodeURIComponent(id)}/obligations`,
      { signal },
    ),
};
