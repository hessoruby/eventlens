import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, replays, webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { apiData, apiError, handleApiError } from "@/lib/webhook-api";
import { requireOwnedProject } from "@/lib/webhook-projects";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId } = await params;
    await requireOwnedProject(projectId, user.id);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);

    const [summaryRows, daily, contentTypes, endpoints, replayRows] = await Promise.all([
      db.select({
        totalEvents: sql<number>`count(*)::int`,
        receivedEvents: sql<number>`count(*) filter (where ${events.source} = 'received')::int`,
        replayedEvents: sql<number>`count(*) filter (where ${events.source} = 'replay')::int`,
        eventsLast24Hours: sql<number>`count(*) filter (where ${events.receivedAt} >= ${dayAgo.toISOString()}::timestamptz)::int`,
        averageSizeBytes: sql<number>`coalesce(round(avg(${events.sizeBytes})), 0)::int`,
        maxSizeBytes: sql<number>`coalesce(max(${events.sizeBytes}), 0)::int`,
        totalBytes: sql<number>`coalesce(sum(${events.sizeBytes}), 0)::bigint`,
      }).from(events).where(eq(events.projectId, projectId)),
      db.select({
        date: sql<string>`to_char(${events.receivedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      }).from(events).where(and(eq(events.projectId, projectId), gte(events.receivedAt, twoWeeksAgo)))
        .groupBy(sql`to_char(${events.receivedAt} at time zone 'UTC', 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${events.receivedAt} at time zone 'UTC', 'YYYY-MM-DD')`),
      db.select({
        contentType: sql<string>`coalesce(${events.contentType}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      }).from(events).where(eq(events.projectId, projectId))
        .groupBy(sql`coalesce(${events.contentType}, 'unknown')`).orderBy(desc(sql`count(*)`)),
      db.select({
        endpointId: webhookEndpoints.id,
        name: webhookEndpoints.name,
        count: sql<number>`count(${events.id})::int`,
      }).from(webhookEndpoints).leftJoin(events, eq(events.endpointId, webhookEndpoints.id))
        .where(eq(webhookEndpoints.projectId, projectId))
        .groupBy(webhookEndpoints.id, webhookEndpoints.name)
        .orderBy(desc(sql`count(${events.id})`)),
      db.select({
        replaySuccesses: sql<number>`count(*) filter (where ${replays.status} = 'success')::int`,
        replayFailures: sql<number>`count(*) filter (where ${replays.status} = 'failed')::int`,
      }).from(replays).where(eq(replays.projectId, projectId)),
    ]);

    return apiData({
      ...summaryRows[0],
      totalBytes: Number(summaryRows[0]?.totalBytes ?? 0),
      daily,
      contentTypes,
      endpoints,
      replaySuccesses: replayRows[0]?.replaySuccesses ?? 0,
      replayFailures: replayRows[0]?.replayFailures ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
