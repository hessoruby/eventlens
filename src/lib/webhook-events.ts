import { randomUUID } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, webhookEndpoints } from "@/db/schema";
import { ApiError } from "@/lib/webhook-api";

export const MAX_WEBHOOK_BYTES = 256 * 1024;
export const MAX_WEBHOOKS_PER_MINUTE = 120;

const sensitiveHeader = /(^authorization$|^proxy-authorization$|cookie|api[-_]?key|token|secret|password|credential|signature)/i;

export function redactHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const entries = headers instanceof Headers ? headers.entries() : Object.entries(headers);
  return Object.fromEntries(
    Array.from(entries, ([name, value]) => [name.toLowerCase(), sensitiveHeader.test(name) ? "[REDACTED]" : value]),
  );
}

export function inspectPayload(bytes: Uint8Array, contentType: string | null): { bodyText: string | null; bodyJson: unknown | null } {
  const mime = contentType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const textual = mime.startsWith("text/") || mime.includes("json") || mime.includes("xml") || mime === "application/x-www-form-urlencoded" || mime === "application/graphql";
  if (!textual && bytes.length > 0) return { bodyText: null, bodyJson: null };
  const bodyText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!mime.includes("json") || !bodyText.trim()) return { bodyText, bodyJson: null };
  try {
    return { bodyText, bodyJson: JSON.parse(bodyText) };
  } catch {
    return { bodyText, bodyJson: null };
  }
}

export async function checkEndpointRateLimit(endpointId: string): Promise<void> {
  const since = new Date(Date.now() - 60_000);
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(eq(events.endpointId, endpointId), gte(events.receivedAt, since)));
  if ((row?.count ?? 0) >= MAX_WEBHOOKS_PER_MINUTE) {
    throw new ApiError("RATE_LIMITED", "Endpoint request limit exceeded; retry in a minute", 429);
  }
}

export type CaptureInput = {
  endpoint: typeof webhookEndpoints.$inferSelect;
  headers: Headers | Record<string, string>;
  body: Uint8Array;
  source?: "received" | "replay";
  replayedFromEventId?: string;
};

export async function captureWebhookEvent(input: CaptureInput) {
  if (input.body.byteLength > MAX_WEBHOOK_BYTES) {
    throw new ApiError("PAYLOAD_TOO_LARGE", `Payload exceeds ${MAX_WEBHOOK_BYTES} bytes`, 413);
  }
  const rawContentType = input.headers instanceof Headers
    ? input.headers.get("content-type")
    : Object.entries(input.headers).find(([key]) => key.toLowerCase() === "content-type")?.[1] ?? null;
  const contentType = rawContentType?.split(";", 1)[0]?.trim().toLowerCase() || null;
  const { bodyText, bodyJson } = inspectPayload(input.body, rawContentType);
  const [event] = await db.insert(events).values({
    id: randomUUID(),
    projectId: input.endpoint.projectId,
    endpointId: input.endpoint.id,
    source: input.source ?? "received",
    replayedFromEventId: input.replayedFromEventId,
    method: "POST",
    contentType,
    headers: redactHeaders(input.headers),
    bodyText,
    bodyJson,
    bodyBase64: Buffer.from(input.body).toString("base64"),
    sizeBytes: input.body.byteLength,
  }).returning();
  return event;
}
