import { describe, expect, it } from "vitest";
import { ApiError, checkSameOrigin, readLimitedBody } from "@/lib/webhook-api";
import { inspectPayload, redactHeaders } from "@/lib/webhook-events";

describe("webhook capture boundaries", () => {
  it("redacts sensitive headers without losing useful request metadata", () => {
    expect(redactHeaders(new Headers({
      Authorization: "Bearer secret",
      Cookie: "sid=123",
      "X-API-Key": "test-key",
      "Stripe-Signature": "signature",
      "Content-Type": "application/json",
      "X-Request-Id": "request-1",
    }))).toEqual({
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      "x-api-key": "[REDACTED]",
      "stripe-signature": "[REDACTED]",
      "content-type": "application/json",
      "x-request-id": "request-1",
    });
  });

  it("preserves JSON for inspection and leaves invalid JSON visible as text", () => {
    expect(inspectPayload(new TextEncoder().encode('{"ok":true}'), "application/json")).toEqual({
      bodyText: '{"ok":true}',
      bodyJson: { ok: true },
    });
    expect(inspectPayload(new TextEncoder().encode("{invalid"), "application/json")).toEqual({
      bodyText: "{invalid",
      bodyJson: null,
    });
  });

  it("rejects both declared and streamed bodies over the limit", async () => {
    const declared = new Request("http://localhost/api/hooks/token", {
      method: "POST",
      headers: { "content-length": "6" },
      body: "a",
    });
    await expect(readLimitedBody(declared, 5)).rejects.toMatchObject({ status: 413 });
    const streamed = new Request("http://localhost/api/hooks/token", { method: "POST", body: "123456" });
    await expect(readLimitedBody(streamed, 5)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects malformed and foreign origins for private mutations", () => {
    const bad = new Request("http://localhost:3000/api/projects", { method: "POST", headers: { origin: "%%%" } });
    expect(() => checkSameOrigin(bad)).toThrow(ApiError);
    const foreign = new Request("http://localhost:3000/api/projects", { method: "POST", headers: { origin: "https://elsewhere.example" } });
    expect(() => checkSameOrigin(foreign)).toThrow(ApiError);
  });
});
