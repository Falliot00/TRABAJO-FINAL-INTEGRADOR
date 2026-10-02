import type {
  CatalogOffer,
  CatalogOfferInput,
  Page,
  Supplier,
  SupplierInput,
} from "@cilgas/contracts";
import { mutate, request } from "./api";

export type RecordQuery = Record<string, string | undefined>;
export function recordQuery(query: RecordQuery = {}) {
  const params = new URLSearchParams({ limit: "25" });
  for (const [key, value] of Object.entries(query))
    if (value) params.set(key, value);
  return params.toString();
}
export const suppliersApi = {
  detail: (id: string, signal?: AbortSignal) =>
    request<Supplier>(`/suppliers/${encodeURIComponent(id)}`, { signal }),
  list: (query: RecordQuery = {}, signal?: AbortSignal) =>
    request<Page<Supplier>>(`/suppliers?${recordQuery(query)}`, { signal }),
  duplicates: (cuit: string, excludeId?: string, signal?: AbortSignal) =>
    request<Page<Supplier>>(
      `/suppliers/duplicates?${new URLSearchParams({ cuit, ...(excludeId ? { excludeId } : {}) })}`,
      { signal },
    ),
  create: (body: SupplierInput, signal?: AbortSignal) =>
    mutate<Supplier>("/suppliers", "POST", body, signal),
  update: (id: string, body: SupplierInput, signal?: AbortSignal) =>
    mutate<Supplier>(
      `/suppliers/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
};
export const catalogApi = {
  list: (query: RecordQuery = {}, signal?: AbortSignal) =>
    request<Page<CatalogOffer>>(`/catalog-services?${recordQuery(query)}`, {
      signal,
    }),
  duplicates: (code: string, excludeId?: string, signal?: AbortSignal) =>
    request<Page<CatalogOffer>>(
      `/catalog-services/duplicates?${new URLSearchParams({ code, ...(excludeId ? { excludeId } : {}) })}`,
      { signal },
    ),
  create: (body: CatalogOfferInput, signal?: AbortSignal) =>
    mutate<CatalogOffer>("/catalog-services", "POST", body, signal),
  update: (id: string, body: CatalogOfferInput, signal?: AbortSignal) =>
    mutate<CatalogOffer>(
      `/catalog-services/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
};
