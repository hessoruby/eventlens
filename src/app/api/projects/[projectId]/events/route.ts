import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { events, webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { ApiError, apiData, apiError, handleApiError } from "@/lib/webhook-api";
import { requireOwnedProject } from "@/lib/webhook-projects";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

function pageNumber(value: string | null, fallback: number, maximum: number): number {
  if (value === null) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw new ApiError("INVALID_INPUT", "Invalid pagination parameter", 400);
  }
  return number;
}

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId } = await params;
    await requireOwnedProject(projectId, user.id);

    const url = new URL(request.url);
    const page = pageNumber(url.searchParams.get("page"), 1, 10_000);
    const limit = pageNumber(url.searchParams.get("limit"), 25, 50);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const endpointId = url.searchParams.get("endpointId");
    const contentType = url.searchParams.get("contentType");
    const source = url.searchParams.get("source");
    if (q.length > 200 || (contentType && contentType.length > 120)) {
      throw new ApiError("INVALID_INPUT", "Filter is too long", 400);
    }
    if (source && source !== "received" && source !== "replay") {
      throw new ApiError("INVALID_INPUT", "Invalid event source", 400);
    }

    const conditions: SQL[] = [eq(events.projectId, projectId)];
    if (endpointId) conditions.push(eq(events.endpointId, endpointId));
    if (contentType) conditions.push(eq(events.contentType, contentType.toLowerCase()));
    if (source) conditions.push(eq(events.source, source));
    if (q) conditions.push(or(
      sql<boolean>`position(lower(${q}) in lower(${events.id})) > 0`,
      sql<boolean>`position(lower(${q}) in lower(coalesce(${events.bodyText}, ''))) > 0`,
      sql<boolean>`position(lower(${q}) in lower(coalesce(${events.contentType}, ''))) > 0`,
      sql<boolean>`position(lower(${q}) in lower(${events.headers}::text)) > 0`,
    )!);
    const where = and(...conditions);
    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(events).where(where);
    const items = await db.select({
      id: events.id,
      projectId: events.projectId,
      endpointId: events.endpointId,
      endpointName: webhookEndpoints.name,
      source: events.source,
      replayedFromEventId: events.replayedFromEventId,
      method: events.method,
      contentType: events.contentType,
      headers: events.headers,
      bodyText: events.bodyText,
      bodyJson: events.bodyJson,
      sizeBytes: events.sizeBytes,
      receivedAt: events.receivedAt,
    }).from(events).innerJoin(webhookEndpoints, eq(events.endpointId, webhookEndpoints.id))
      .where(where).orderBy(desc(events.receivedAt), desc(events.id))
      .limit(limit).offset((page - 1) * limit);
    const total = countRow?.count ?? 0;
    return apiData({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return handleApiError(error);
  }
}
