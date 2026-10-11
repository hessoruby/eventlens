import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, projects, replays, webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { apiData, apiError, handleApiError } from "@/lib/webhook-api";

export const runtime = "nodejs";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { eventId } = await params;
    const [row] = await db.select({ event: events, endpointName: webhookEndpoints.name })
      .from(events)
      .innerJoin(projects, eq(events.projectId, projects.id))
      .innerJoin(webhookEndpoints, eq(events.endpointId, webhookEndpoints.id))
      .where(and(eq(events.id, eventId), eq(projects.ownerId, user.id))).limit(1);
    if (!row) return apiError("NOT_FOUND", "Event not found", 404);
    const replayRows = await db.select().from(replays)
      .where(eq(replays.originalEventId, eventId)).orderBy(desc(replays.createdAt));
    return apiData({ ...row.event, endpointName: row.endpointName, replays: replayRows });
  } catch (error) {
    return handleApiError(error);
  }
}
