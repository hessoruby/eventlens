import { z } from "zod";

export const nameSchema = z.object({ name: z.string().trim().min(1).max(80) }).strict();
export const endpointCreateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
}).strict();

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function apiData<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) return apiError(error.code, error.message, error.status);
  console.error("EventLens API error", error);
  return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

export async function readLimitedBody(request: Request, maximumBytes: number): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maximumBytes) {
    throw new ApiError("PAYLOAD_TOO_LARGE", `Payload exceeds ${maximumBytes} bytes`, 413);
  }

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        throw new ApiError("PAYLOAD_TOO_LARGE", `Payload exceeds ${maximumBytes} bytes`, 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function parseJsonBody<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  const bytes = await readLimitedBody(request, 16 * 1024);
  let parsed: unknown;
  try {
    parsed = bytes.length === 0 ? {} : JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ApiError("INVALID_INPUT", result.error.issues[0]?.message ?? "Invalid input", 400);
  }
  return result.data;
}

export function checkSameOrigin(request: Request): void {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError("FORBIDDEN_ORIGIN", "Cross-site request rejected", 403);
  }
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  let actualOrigin: string;
  try {
    actualOrigin = new URL(origin).origin;
  } catch {
    throw new ApiError("FORBIDDEN_ORIGIN", "Request origin is not allowed", 403);
  }
  if (actualOrigin !== new URL(expected).origin) {
    throw new ApiError("FORBIDDEN_ORIGIN", "Request origin is not allowed", 403);
  }
}
