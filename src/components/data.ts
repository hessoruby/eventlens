export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  endpointCount?: number;
  eventCount?: number;
};

export type WebhookEndpoint = {
  id: string;
  projectId: string;
  name: string;
  token: string;
  url: string;
  createdAt: string;
};

export type CapturedEvent = {
  id: string;
  projectId: string;
  endpointId: string;
  endpointName?: string;
  source: "received" | "replay" | string;
  replayedFromEventId: string | null;
  method: string;
  contentType: string | null;
  headers: Record<string, string>;
  bodyText: string | null;
  bodyJson: unknown;
  sizeBytes: number;
  receivedAt: string;
};

export type ReplayRecord = {
  id: string;
  originalEventId: string;
  replayedEventId: string | null;
  status: string;
  responseStatus: number | null;
  errorMessage: string | null;
  createdAt: string;
};

export type EventDetail = CapturedEvent & { bodyBase64: string; replays: ReplayRecord[] };

export type EventPage = {
  items: CapturedEvent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Analytics = {
  totalEvents: number;
  receivedEvents: number;
  replayedEvents: number;
  eventsLast24Hours: number;
  averageSizeBytes: number;
  maxSizeBytes: number;
  totalBytes: number;
  contentTypes: { contentType: string; count: number }[];
  daily: { date: string; count: number }[];
  endpoints: { endpointId: string; name: string; count: number }[];
  replaySuccesses: number;
  replayFailures: number;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload ? payload.error : null;
    const parsed = typeof error === "object" && error !== null ? error as { message?: string; code?: string } : null;
    throw new ApiError(parsed?.message || `Request failed (${response.status})`, response.status, parsed?.code);
  }
  if (typeof payload !== "object" || payload === null || !("data" in payload)) throw new ApiError("Unexpected server response", response.status);
  return payload.data as T;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function formatRelative(date: string) {
  const delta = Date.now() - new Date(date).getTime();
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return formatDate(date);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function eventPreview(event: CapturedEvent) {
  if (event.bodyJson !== null && event.bodyJson !== undefined) {
    const body = event.bodyJson as Record<string, unknown>;
    if (typeof body === "object" && !Array.isArray(body)) {
      const label = body.type ?? body.event ?? body.action ?? body.name;
      if (typeof label === "string") return label;
    }
  }
  if (event.bodyText?.trim()) return event.bodyText.replace(/\s+/g, " ").slice(0, 80);
  return "Empty body";
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}
