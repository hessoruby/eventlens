import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, projects, replays, webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { apiData, apiError, checkSameOrigin, handleApiError } from "@/lib/webhook-api";
import { captureWebhookEvent, checkEndpointRateLimit } from "@/lib/webhook-events";

export const runtime = "nodejs";

type Context = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    checkSameOrigin(request);
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { eventId } = await params;
    const [row] = await db.select({ event: events, endpoint: webhookEndpoints })
      .from(events)
      .innerJoin(projects, eq(events.projectId, projects.id))
      .innerJoin(webhookEndpoints, eq(events.endpointId, webhookEndpoints.id))
      .where(and(eq(events.id, eventId), eq(projects.ownerId, user.id))).limit(1);
    if (!row) return apiError("NOT_FOUND", "Event not found", 404);
    const [record] = await db.insert(replays).values({
      id: randomUUID(),
      projectId: row.event.projectId,
      originalEventId: row.event.id,
      status: "pending",
    }).returning();
    try {
      await checkEndpointRateLimit(row.endpoint.id);
      const headers = { ...row.event.headers, "x-eventlens-replay": "true" };
      const event = await captureWebhookEvent({
        endpoint: row.endpoint,
        headers,
        body: Buffer.from(row.event.bodyBase64, "base64"),
        source: "replay",
        replayedFromEventId: row.event.id,
      });
      const [replay] = await db.update(replays).set({ status: "success", responseStatus: 202, replayedEventId: event.id })
        .where(eq(replays.id, record.id)).returning();
      return apiData({ replay, event: { ...event, endpointName: row.endpoint.name } }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Replay failed";
      await db.update(replays).set({ status: "failed", errorMessage: message })
        .where(eq(replays.id, record.id));
      return handleApiError(error);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
