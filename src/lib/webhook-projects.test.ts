import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { db } = await import("@/db");
const { user, projects } = await import("@/db/schema");
const { requireOwnedProject } = await import("@/lib/webhook-projects");
const { eq } = await import("drizzle-orm");

describe("project isolation in PostgreSQL", () => {
  const ownerId = randomUUID();
  const otherId = randomUUID();
  const projectId = randomUUID();

  beforeAll(async () => {
    await db.insert(user).values([
      { id: ownerId, name: "Test owner", email: `${ownerId}@example.invalid` },
      { id: otherId, name: "Other user", email: `${otherId}@example.invalid` },
    ]);
    await db.insert(projects).values({ id: projectId, ownerId, name: "Isolation test" });
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, ownerId));
    await db.delete(user).where(eq(user.id, otherId));
  });

  it("returns owned projects and conceals another user's project", async () => {
    await expect(requireOwnedProject(projectId, ownerId)).resolves.toMatchObject({ id: projectId });
    await expect(requireOwnedProject(projectId, otherId)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
