import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { webhookEndpoints } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { apiData, apiError, checkSameOrigin, endpointCreateSchema, handleApiError, parseJsonBody } from "@/lib/webhook-api";
import { endpointUrl, requireOwnedProject } from "@/lib/webhook-projects";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId } = await params;
    await requireOwnedProject(projectId, user.id);
    const rows = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.projectId, projectId));
    return apiData(rows.map((row) => ({ ...row, url: endpointUrl(request, row.token) })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    checkSameOrigin(request);
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);
    const { projectId } = await params;
    await requireOwnedProject(projectId, user.id);
    const { name = "Inbound webhook" } = await parseJsonBody(request, endpointCreateSchema);
    const [endpoint] = await db.insert(webhookEndpoints).values({
      id: randomUUID(),
      projectId,
      name,
      token: randomBytes(32).toString("base64url"),
    }).returning();
    return apiData({ ...endpoint, url: endpointUrl(request, endpoint.token) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
