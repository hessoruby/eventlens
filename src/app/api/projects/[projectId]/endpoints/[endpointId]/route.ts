import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { apiData, apiError, checkSameOrigin, handleApiError, nameSchema, parseJsonBody } from "@/lib/webhook-api";
import { endpointUrl, requireOwnedProject } from "@/lib/webhook-projects";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string; endpointId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    checkSameOrigin(request);
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId, endpointId } = await params;
    await requireOwnedProject(projectId, user.id);
    const { name } = await parseJsonBody(request, nameSchema);
    const [endpoint] = await db.update(webhookEndpoints).set({ name, updatedAt: new Date() })
      .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.projectId, projectId))).returning();
    if (!endpoint) return apiError("NOT_FOUND", "Endpoint not found", 404);
    return apiData({ ...endpoint, url: endpointUrl(request, endpoint.token) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    checkSameOrigin(request);
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId, endpointId } = await params;
    await requireOwnedProject(projectId, user.id);
    const [endpoint] = await db.delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.projectId, projectId))).returning({ id: webhookEndpoints.id });
    if (!endpoint) return apiError("NOT_FOUND", "Endpoint not found", 404);
    return apiData({ deleted: true, id: endpoint.id });
  } catch (error) {
    return handleApiError(error);
  }
}
