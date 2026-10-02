import type {
  ComponentModel,
  ComponentModelInput,
  Page,
  RegulatoryActor,
  RegulatoryActorInput,
  Workshop,
  WorkshopInput,
} from "@cilgas/contracts";
import { mutate, request } from "./api";

export const settingsApi = {
  workshop: (signal?: AbortSignal) =>
    request<Workshop | null>("/workshop", { signal }),
  saveWorkshop: (body: WorkshopInput, signal?: AbortSignal) =>
    mutate<Workshop>("/workshop", "PATCH", body, signal),
  actors: (query: URLSearchParams, signal?: AbortSignal) =>
    request<Page<RegulatoryActor>>(`/regulatory-actors?${query.toString()}`, {
      signal,
    }),
  async workshopActors(signal?: AbortSignal): Promise<RegulatoryActor[]> {
    const items: RegulatoryActor[] = [];
    const query = new URLSearchParams({ type: "TDM", limit: "100" });
    let cursor: string | null = null;
    do {
      if (cursor) query.set("cursor", cursor);
      const page = await settingsApi.actors(query, signal);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  },
  createActor: (body: RegulatoryActorInput, signal?: AbortSignal) =>
    mutate<RegulatoryActor>("/regulatory-actors", "POST", body, signal),
  updateActor: (id: string, body: RegulatoryActorInput, signal?: AbortSignal) =>
    mutate<RegulatoryActor>(
      `/regulatory-actors/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
  models: (query: URLSearchParams, signal?: AbortSignal) =>
    request<Page<ComponentModel>>(`/component-models?${query.toString()}`, {
      signal,
    }),
  createModel: (body: ComponentModelInput, signal?: AbortSignal) =>
    mutate<ComponentModel>("/component-models", "POST", body, signal),
  updateModel: (id: string, body: ComponentModelInput, signal?: AbortSignal) =>
    mutate<ComponentModel>(
      `/component-models/${encodeURIComponent(id)}`,
      "PATCH",
      body,
      signal,
    ),
};
