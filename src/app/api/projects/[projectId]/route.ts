import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, projects, webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { apiData, apiError, checkSameOrigin, handleApiError, nameSchema, parseJsonBody } from "@/lib/webhook-api";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId } = await params;
    const [project] = await db.select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      endpointCount: sql<number>`(select count(*)::int from ${webhookEndpoints} where ${webhookEndpoints.projectId} = ${projects.id})`,
      eventCount: sql<number>`(select count(*)::int from ${events} where ${events.projectId} = ${projects.id})`,
    }).from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id))).limit(1);
    if (!project) return apiError("NOT_FOUND", "Project not found", 404);
    return apiData(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    checkSameOrigin(request);
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId } = await params;
    const { name } = await parseJsonBody(request, nameSchema);
    const [project] = await db.update(projects).set({ name, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id))).returning();
    if (!project) return apiError("NOT_FOUND", "Project not found", 404);
    return apiData(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    checkSameOrigin(request);
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId } = await params;
    const [project] = await db.delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id))).returning({ id: projects.id });
    if (!project) return apiError("NOT_FOUND", "Project not found", 404);
    return apiData({ deleted: true, id: project.id });
  } catch (error) {
    return handleApiError(error);
  }
}
