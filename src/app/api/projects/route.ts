import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, projects, webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { apiData, apiError, checkSameOrigin, handleApiError, nameSchema, parseJsonBody } from "@/lib/webhook-api";

export const runtime = "nodejs";

const counts = {
  endpointCount: sql<number>`(select count(*)::int from ${webhookEndpoints} where ${webhookEndpoints.projectId} = ${projects.id})`,
  eventCount: sql<number>`(select count(*)::int from ${events} where ${events.projectId} = ${projects.id})`,
};

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const rows = await db.select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      ...counts,
    }).from(projects).where(eq(projects.ownerId, user.id)).orderBy(desc(projects.createdAt));
    return apiData(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { name } = await parseJsonBody(request, nameSchema);
    const [project] = await db.insert(projects).values({ id: randomUUID(), ownerId: user.id, name }).returning();
    return apiData({ ...project, endpointCount: 0, eventCount: 0 }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
