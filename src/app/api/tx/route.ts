import { getCurrentUser } from "@/lib/auth-session";
import { EthereumInspectionError, inspectTransaction, isTransactionHash } from "@/lib/ethereum";
import { apiError, handleApiError } from "@/lib/webhook-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser(request);
    if (!user) return apiError("UNAUTHORIZED", "Sign in required", 401);

    const hash = new URL(request.url).searchParams.get("hash") ?? "";
    if (!isTransactionHash(hash)) {
      return apiError("INVALID_HASH", "Enter a 0x-prefixed, 32-byte transaction hash.", 400);
    }

    const transaction = await inspectTransaction(hash);
    return Response.json({ transaction }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof EthereumInspectionError) {
      const status = error.code === "NOT_FOUND" ? 404 : 502;
      return apiError(error.code, error.message, status);
    }
    return handleApiError(error);
  }
}
