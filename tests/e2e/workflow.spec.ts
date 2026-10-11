import "dotenv/config";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

let primaryAccount: { email: string; password: string } | null = null;

test("a user captures, searches, replays, and inspects real events", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `playwright-${stamp}@example.test`;
  const password = `Secure-${stamp}-password`;
  const projectName = `Integration ${stamp}`;
  const endpointName = `Orders ${stamp}`;
  const payload = { type: "checkout.completed", orderId: stamp, amount: 4200 };

  expect((await request.get("/api/projects")).status()).toBe(401);

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Playwright Owner");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  primaryAccount = { email, password };

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("dialog").getByLabel("Project name").fill(projectName);
  await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
  await page.getByRole("link", { name: projectName, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/]+$/);

  const projectsResponse = await page.request.get("/api/projects");
  expect(projectsResponse.status()).toBe(200);
  const project = (await projectsResponse.json()).data.find((item: { name: string }) => item.name === projectName);
  expect(project?.id).toBeTruthy();

  await page.getByRole("button", { name: "Create endpoint" }).first().click();
  await page.getByRole("dialog").getByLabel("Endpoint name").fill(endpointName);
  await page.getByRole("dialog").getByRole("button", { name: "Create endpoint" }).click();
  const endpointInput = page.getByRole("textbox", { name: `${endpointName} webhook URL` });
  await expect(endpointInput).toHaveValue(/\/api\/hooks\/[A-Za-z0-9_-]{43}$/);
  const endpointUrl = await endpointInput.inputValue();

  const receive = await page.request.post(endpointUrl, {
    data: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer do-not-persist",
      "x-eventlens-test": stamp,
    },
  });
  expect(receive.status()).toBe(202);
  const receivedId = (await receive.json()).data.id as string;

  const databaseUrl = process.env.DATABASE_URL;
  expect(databaseUrl).toBeTruthy();
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const saved = await sql`select id, project_id, headers, body_json, size_bytes from events where id = ${receivedId}`;
    expect(saved).toHaveLength(1);
    expect(saved[0].project_id).toBe(project.id);
    expect(saved[0].body_json).toEqual(payload);
    expect(saved[0].headers.authorization).toBe("[REDACTED]");
    expect(saved[0].headers["x-eventlens-test"]).toBe(stamp);
    expect(saved[0].size_bytes).toBe(Buffer.byteLength(JSON.stringify(payload)));
  } finally {
    await sql.end();
  }

  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByRole("link", { name: "checkout.completed" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search events" }).fill(stamp);
  await expect(page.getByRole("link", { name: "checkout.completed" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search events" }).fill("no-such-webhook-event");
  await expect(page.getByText("No matching events")).toBeVisible();
  await page.getByRole("textbox", { name: "Search events" }).fill("");
  await expect(page.getByRole("link", { name: "checkout.completed" })).toBeVisible();

  const eventPage1 = await page.request.get(`/api/projects/${project.id}/events?limit=1&page=1`);
  expect(eventPage1.status()).toBe(200);
  expect((await eventPage1.json()).data.total).toBe(1);

  await page.getByRole("link", { name: "checkout.completed" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${receivedId}$`));
  await expect(page.getByText(stamp).first()).toBeVisible();
  await page.getByRole("tab", { name: /Headers/ }).click();
  await expect(page.getByText("[REDACTED]").first()).toBeVisible();
  await page.getByRole("button", { name: "Replay event" }).first().click();
  await expect(page.getByText("Replay success")).toBeVisible();

  const replayListResponse = await page.request.get(`/api/projects/${project.id}/events?source=replay`);
  expect(replayListResponse.status()).toBe(200);
  const replayList = (await replayListResponse.json()).data;
  expect(replayList.total).toBe(1);
  expect(replayList.items[0].replayedFromEventId).toBe(receivedId);
  expect(replayList.items[0].endpointId).toBe((await page.request.get(`/api/projects/${project.id}/endpoints`).then((response) => response.json())).data[0].id);

  const analyticsResponse = await page.request.get(`/api/projects/${project.id}/analytics`);
  expect(analyticsResponse.status()).toBe(200);
  const analytics = (await analyticsResponse.json()).data;
  expect(analytics.totalEvents).toBe(2);
  expect(analytics.receivedEvents).toBe(1);
  expect(analytics.replayedEvents).toBe(1);
  expect(analytics.contentTypes).toEqual(expect.arrayContaining([{ contentType: "application/json", count: 2 }]));
  expect(analytics.totalBytes).toBe(2 * Buffer.byteLength(JSON.stringify(payload)));

  const paginated = await page.request.get(`/api/projects/${project.id}/events?limit=1&page=2`);
  expect(paginated.status()).toBe(200);
  expect((await paginated.json()).data.items).toHaveLength(1);
  expect((await page.request.get(`/api/projects/${project.id}/events?source=received`)).status()).toBe(200);

  const oversized = await request.post(endpointUrl, {
    data: Buffer.alloc(256 * 1024 + 1, 65),
    headers: { "content-type": "application/octet-stream" },
  });
  expect(oversized.status()).toBe(413);
  const badProject = await page.request.post("/api/projects", { data: { name: "" } });
  expect(badProject.status()).toBe(400);
  expect((await page.request.get("/api/tx?hash=invalid")).status()).toBe(400);

  await page.goto("/dashboard/ethereum");
  await page.getByLabel("Transaction hash").fill("invalid");
  await page.getByRole("button", { name: "Inspect transaction" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "64 hexadecimal characters" })).toBeVisible();
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  try {
    await otherPage.goto(new URL("/sign-up", page.url()).toString());
    await otherPage.getByLabel("Name").fill("Playwright Other");
    await otherPage.getByLabel("Email address").fill(`other-${stamp}@example.test`);
    await otherPage.getByLabel("Password").fill(password);
    await otherPage.getByRole("button", { name: "Create account" }).click();
    await expect(otherPage).toHaveURL(/\/dashboard$/);
    expect((await otherPage.request.get(`/api/projects/${project.id}`)).status()).toBe(404);
    expect((await otherPage.request.get(`/api/projects/${project.id}/events`)).status()).toBe(404);
    expect((await otherPage.request.get(`/api/events/${receivedId}`)).status()).toBe(404);
    expect((await otherPage.request.post(`/api/events/${receivedId}/replay`)).status()).toBe(404);
  } finally {
    await otherContext.close();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/dashboard/projects/${project.id}`);
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const createEndpointBounds = await page.getByRole("button", { name: "Create endpoint" }).first().boundingBox();
  expect(createEndpointBounds).not.toBeNull();
  expect(createEndpointBounds!.x + createEndpointBounds!.width).toBeLessThanOrEqual(391);

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto(`/dashboard/projects/${project.id}`);
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("documentation remains readable on narrow screens", async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: "Build with EventLens" })).toBeVisible();
    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      links: [...document.querySelectorAll('nav[aria-label="Documentation sections"] a')].map((link) => {
        const rect = link.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }),
    }));
    expect(geometry.documentWidth, `docs overflow at ${width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(geometry.links.length).toBe(5);
    for (const link of geometry.links) {
      expect(link.left, `docs navigation clipped at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(link.right, `docs navigation clipped at ${width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
    }
  }
});

test("project and endpoint management works through the browser", async ({ page, request }) => {
  const stamp = Date.now();
  const originalName = `Manage ${stamp}`;
  const renamedName = `Managed ${stamp}`;
  if (primaryAccount) {
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(primaryAccount.email);
    await page.getByLabel("Password").fill(primaryAccount.password);
    await page.getByRole("button", { name: "Sign in" }).click();
  } else {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Workspace Manager");
    await page.getByLabel("Email address").fill(`manager-${stamp}@example.test`);
    await page.getByLabel("Password").fill(`Secure-${stamp}-password`);
    await page.getByRole("button", { name: "Create account" }).click();
  }
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("dialog").getByLabel("Project name").fill(originalName);
  await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
  await page.getByRole("link", { name: originalName, exact: true }).click();
  const projectId = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.getByRole("button", { name: "Rename project" }).click();
  await page.getByRole("dialog").getByLabel("Project name").fill(renamedName);
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: renamedName })).toBeVisible();

  await page.getByRole("button", { name: "Create endpoint" }).first().click();
  await page.getByRole("dialog").getByLabel("Endpoint name").fill("Original endpoint");
  await page.getByRole("dialog").getByRole("button", { name: "Create endpoint" }).click();
  const endpointInput = page.getByRole("textbox", { name: "Original endpoint webhook URL" });
  await expect(endpointInput).toBeVisible();
  const endpointUrl = await endpointInput.inputValue();

  await page.getByRole("button", { name: "Rename Original endpoint" }).click();
  await page.getByRole("dialog").getByLabel("Endpoint name").fill("Renamed endpoint");
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("textbox", { name: "Renamed endpoint webhook URL" })).toHaveValue(endpointUrl);

  await page.getByRole("button", { name: "Delete Renamed endpoint" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete endpoint" }).click();
  await expect(page.getByText("No endpoints yet")).toBeVisible();
  expect((await request.post(endpointUrl, { data: { deleted: true } })).status()).toBe(404);

  await page.getByRole("button", { name: "Delete project" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete project" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await page.request.get(`/api/projects/${projectId}`)).status()).toBe(404);
});

test("the browser inspects a confirmed Ethereum mainnet transaction", async ({ page }) => {
  test.skip(Boolean(process.env.CI), "Live public RPC availability is verified locally, outside deterministic CI.");
  test.setTimeout(180_000);
  const stamp = Date.now();
  if (primaryAccount) {
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(primaryAccount.email);
    await page.getByLabel("Password").fill(primaryAccount.password);
    await page.getByRole("button", { name: "Sign in" }).click();
  } else {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Ethereum Inspector");
    await page.getByLabel("Email address").fill(`ethereum-${stamp}@example.test`);
    await page.getByLabel("Password").fill(`Secure-${stamp}-password`);
    await page.getByRole("button", { name: "Create account" }).click();
  }
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/dashboard/ethereum");
  const confirmedHash = "0xa9de95262d4cc0d6983b2c0b423dd51ba5a09703eb274f507018db807d767197";
  await page.getByLabel("Transaction hash").fill(confirmedHash);
  let status = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/tx?hash="), { timeout: 65_000 });
    await page.getByRole("button", { name: "Inspect transaction" }).click();
    const response = await responsePromise;
    status = response.status();
    if (status === 200) break;
  }
  expect(status, "The configured mainnet RPC must return a real transaction").toBe(200);
  await expect(page.getByText(confirmedHash)).toBeVisible();
  await expect(page.getByText("success", { exact: true })).toBeVisible();
  await expect(page.getByText("8 decoded")).toBeVisible();
});
