import type {
  Page,
  Person,
  PersonInput,
  Vehicle,
  VehicleDetail,
  VehicleInput,
  VehicleRelationshipInput,
} from "@cilgas/contracts";
import { mutate, request } from "./api";

export interface PeopleQuery {
  q?: string;
  active?: string;
  cursor?: string | null;
}

function queryString(values: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

export const peopleApi = {
  list: (query: PeopleQuery = {}, signal?: AbortSignal) =>
    request<Page<Person>>(`/people?${queryString({ ...query })}`, { signal }),
  duplicates: (body: PersonInput, excludeId?: string, signal?: AbortSignal) =>
    request<Page<Person>>(
      `/people/duplicates?${queryString({ name: body.name, documentType: body.documentType, documentNumber: body.documentNumber, excludeId })}`,
      { signal },
    ),
  create: (body: PersonInput, signal?: AbortSignal) =>
    mutate<Person>("/people", "POST", body, signal),
  update: (id: string, body: PersonInput, signal?: AbortSignal) =>
    mutate<Person>(`/people/${encodeURIComponent(id)}`, "PATCH", body, signal),
};

export interface VehiclesQuery extends PeopleQuery {
  personId?: string;
}

export const vehiclesApi = {
  detail: (id: string, signal?: AbortSignal) =>
    request<VehicleDetail>(`/vehicles/${encodeURIComponent(id)}`, { signal }),
  list: (query: VehiclesQuery = {}, signal?: AbortSignal) =>
    request<Page<Vehicle>>(`/vehicles?${queryString({ ...query })}`, {
      signal,
    }),
  duplicates: (plate: string, excludeId?: string, signal?: AbortSignal) =>
    request<Page<Vehicle>>(
      `/vehicles/duplicates?${queryString({ plate, excludeId })}`,
      { signal },
    ),
  create: (body: VehicleInput, signal?: AbortSignal) =>
    mutate<Vehicle>("/vehicles", "POST", body, signal),
  update: (id: string, body: VehicleInput, signal?: AbortSignal) =>
    mutate<Vehicle>(
      `/vehicles/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
  relate: (id: string, body: VehicleRelationshipInput, signal?: AbortSignal) =>
    mutate<VehicleDetail>(
      `/vehicles/${encodeURIComponent(id)}/relationships`,
      "POST",
      body,
      signal,
    ),
  closeRelationship: (
    vehicleId: string,
    relationshipId: string,
    until: string,
    signal?: AbortSignal,
  ) =>
    mutate<VehicleDetail>(
      `/vehicles/${encodeURIComponent(vehicleId)}/relationships/${encodeURIComponent(relationshipId)}`,
      "PATCH",
      { until },
      signal,
    ),
};
