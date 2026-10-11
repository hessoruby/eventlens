import { eq } from "drizzle-orm";
import { db } from "@/db";
import { webhookEndpoints } from "@/db/schema";
import { apiData, apiError, handleApiError, readLimitedBody } from "@/lib/webhook-api";
import { captureWebhookEvent, checkEndpointRateLimit, MAX_WEBHOOK_BYTES } from "@/lib/webhook-events";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { token } = await params;
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return apiError("NOT_FOUND", "Webhook endpoint not found", 404);
    const [endpoint] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.token, token)).limit(1);
    if (!endpoint) return apiError("NOT_FOUND", "Webhook endpoint not found", 404);
    await checkEndpointRateLimit(endpoint.id);
    const body = await readLimitedBody(request, MAX_WEBHOOK_BYTES);
    const event = await captureWebhookEvent({ endpoint, headers: request.headers, body });
    return apiData({ id: event.id, receivedAt: event.receivedAt }, 202);
  } catch (error) {
    return handleApiError(error);
  }
}
