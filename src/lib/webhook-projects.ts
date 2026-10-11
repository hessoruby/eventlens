import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { ApiError } from "@/lib/webhook-api";

export async function requireOwnedProject(projectId: string, userId: string) {
  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId))).limit(1);
  if (!project) throw new ApiError("NOT_FOUND", "Project not found", 404);
  return project;
}

export function endpointUrl(request: Request, token: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  const base = configured ?? new URL(request.url).origin;
  return new URL(`/api/hooks/${encodeURIComponent(token)}`, base).toString();
}
