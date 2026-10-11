# Security review

EventLens was reviewed against its main trust boundaries and exercised with live browser and HTTP tests. A signed-in user can access only their own project resources; a second account receives `404` for another user's project, event, and replay routes. State-changing private routes check the request origin. Capture endpoints use 32 random bytes as bearer tokens, enforce a 256 KiB streaming body limit, and redact sensitive header values before persistence. Replay accepts no destination URL and reuses the original endpoint internally, so a saved event cannot turn it into an arbitrary outbound request. The Ethereum route accepts only a transaction hash and uses a server-configured RPC URL.

Passwords and sessions are managed by Better Auth. The production configuration must use HTTPS, a unique auth secret, and a managed PostgreSQL connection. Application SQL uses Drizzle parameters rather than interpolating user input into query text. The UI renders untrusted event content as text/React nodes. Basic response headers restrict framing and content sniffing.

## Remaining operational risks

- Request bodies are stored without redaction because inspection and replay need the original bytes. Operators must decide retention, backups, and access controls for the payloads they receive.
- A capture URL lets anyone who knows it submit events. Delete and recreate an endpoint to rotate a disclosed token. The database-backed 120-events-per-minute check is best effort under concurrency; add upstream abuse controls for public, high-traffic deployments.
- The default public Ethereum RPC can be unavailable or rate limited. Production operators should configure a reliable mainnet provider.
- As of 2026-10-11, `npm audit` reports five high advisories in the ESLint/Next lint-tool dependency chain and four moderate advisories in the Drizzle migration-tool/esbuild dependency chain. `npm audit --omit=dev` still reports the four moderate Drizzle findings because Better Auth declares an optional peer dependency on `drizzle-kit`. The available automatic fixes propose incompatible package downgrades, so they were not applied. These tools are not imported by request handlers, but the Docker image includes them to run migrations at startup. Recheck upstream releases and advisories before production deployment.

This review is not a penetration test. Re-run dependency and authorization checks after changes to authentication, API routes, or dependencies.
