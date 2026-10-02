import type {
  CreateServiceDraftRequest,
  ConfirmedService,
  ConfirmServiceRequest,
  Page,
  ServiceDraft,
  ServiceConfirmationCheck,
  UpdateServiceDraftRequest,
} from "@cilgas/contracts";
import { mutate, request } from "./api";
import { recordQuery, type RecordQuery } from "./catalog-api";

export const serviceDraftsApi = {
  confirm: (id: string, body: ConfirmServiceRequest, signal?: AbortSignal) =>
    mutate<ConfirmedService>(
      `/service-drafts/${encodeURIComponent(id)}/confirm`,
      "POST",
      body,
      signal,
    ),
  check: (id: string, signal?: AbortSignal) =>
    request<ServiceConfirmationCheck>(
      `/service-drafts/${encodeURIComponent(id)}/confirmation-check`,
      { signal },
    ),
  list: (query: RecordQuery = {}, signal?: AbortSignal) =>
    request<Page<ServiceDraft>>(`/service-drafts?${recordQuery(query)}`, {
      signal,
    }),
  detail: (id: string, signal?: AbortSignal) =>
    request<ServiceDraft>(`/service-drafts/${encodeURIComponent(id)}`, {
      signal,
    }),
  create: (body: CreateServiceDraftRequest, signal?: AbortSignal) =>
    mutate<ServiceDraft>("/service-drafts", "POST", body, signal),
  update: (id: string, body: UpdateServiceDraftRequest, signal?: AbortSignal) =>
    mutate<ServiceDraft>(
      `/service-drafts/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
};
