import { getGraphToken } from "./authClient";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getGraphToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph ${init?.method ?? "GET"} ${path} -> ${res.status}: ${body}`);
  }
  return res;
}

export async function graphGet<T>(path: string): Promise<T> {
  const res = await graphFetch(path, { method: "GET" });
  return (await res.json()) as T;
}

export async function graphPost<T>(path: string, body: unknown): Promise<T> {
  const res = await graphFetch(path, { method: "POST", body: JSON.stringify(body) });
  return (await res.json()) as T;
}

export async function graphPatch(path: string, body: unknown): Promise<void> {
  await graphFetch(path, { method: "PATCH", body: JSON.stringify(body) });
}

export interface GraphListItem<TFields> {
  id: string;
  fields: TFields;
}

export interface GraphListItemsResponse<TFields> {
  value: GraphListItem<TFields>[];
  "@odata.nextLink"?: string;
}

/** Sigue @odata.nextLink hasta `maxItems` para no traer listas completas a memoria de golpe. */
export async function graphGetAllItems<TFields>(
  path: string,
  maxItems = 2000
): Promise<GraphListItem<TFields>[]> {
  let next: string | null = `${GRAPH_BASE}${path}`;
  const items: GraphListItem<TFields>[] = [];
  const token = await getGraphToken();

  while (next && items.length < maxItems) {
    const res: Response = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Graph GET ${next} -> ${res.status}: ${body}`);
    }
    const page = (await res.json()) as GraphListItemsResponse<TFields>;
    items.push(...page.value);
    next = page["@odata.nextLink"] ?? null;
  }
  return items.slice(0, maxItems);
}
