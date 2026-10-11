# API reference

Private routes require an authenticated Better Auth session cookie. Authentication is available through the sign-up and sign-in UI at `/sign-up` and `/sign-in`. State-changing private routes require a same-origin request. Webhook capture routes use the endpoint token in the URL instead of a session cookie.

Most routes return `{ "data": ... }` on success and `{ "error": { "code": "...", "message": "..." } }` on failure. The Ethereum inspector returns `{ "transaction": ... }` on success. Timestamps are serialized as ISO 8601 strings. IDs are opaque; clients should not infer structure from them.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/projects` | List only the signed-in user's projects, with endpoint and event counts. |
| `POST` | `/api/projects` | Create a project with `{ "name": "..." }` (1–80 characters after trimming). |
| `GET` | `/api/projects/:projectId` | Read one owned project. |
| `PATCH` | `/api/projects/:projectId` | Rename an owned project with `{ "name": "..." }`. |
| `DELETE` | `/api/projects/:projectId` | Delete an owned project and its endpoints/events. |
| `GET` | `/api/projects/:projectId/endpoints` | List endpoints and capture URLs. |
| `POST` | `/api/projects/:projectId/endpoints` | Create an endpoint with optional `{ "name": "..." }`. |
| `PATCH` | `/api/projects/:projectId/endpoints/:endpointId` | Rename an owned endpoint with `{ "name": "..." }`. |
| `DELETE` | `/api/projects/:projectId/endpoints/:endpointId` | Delete an owned endpoint and its captured events. |
| `POST` | `/api/hooks/:token` | Capture an HTTP request. Returns `202` after persistence. |
| `GET` | `/api/projects/:projectId/events` | Search and paginate captured events. |
| `GET` | `/api/events/:eventId` | Inspect an owned event and its replay history. |
| `POST` | `/api/events/:eventId/replay` | Re-ingest an event into its original endpoint's capture pipeline. |
| `GET` | `/api/projects/:projectId/analytics` | Read database-backed project metrics. |
| `GET` | `/api/tx?hash=0x…` | Inspect an Ethereum mainnet transaction. |

## Capture request

Create an endpoint in the UI or via `POST /api/projects/:projectId/endpoints`, then use its returned `url`:

```bash
curl -i -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -H 'X-Trace-Id: example-42' \
  -d '{"event":"payment.succeeded","id":"example-42"}'
```

The request body limit is 256 KiB. `413 PAYLOAD_TOO_LARGE` applies even when `Content-Length` is absent. Endpoint traffic is limited to 120 saved events per minute; excess requests return `429 RATE_LIMITED`. The URL token is 32 random bytes encoded for URLs. Treat the URL as a secret and rotate it by deleting and recreating the endpoint if exposed.

Stored event data includes method, content type, timestamp, size, redacted headers, text body when decodable, parsed JSON when valid, and the original body bytes for replay. Authorization, cookie, token, signature, password, and similar header values are replaced with `[REDACTED]` before persistence. Body fields are not redacted.

## Event search

`GET /api/projects/:projectId/events` accepts:

| Parameter | Meaning |
| --- | --- |
| `page` | 1-based page number; defaults to 1. |
| `limit` | Results per page; defaults to 25 and is capped at 50. |
| `q` | Case-insensitive substring match in event ID, text body, content type, or redacted headers. |
| `endpointId` | Filter by one endpoint in the owned project. |
| `contentType` | Exact normalized content type, such as `application/json`. |
| `source` | `received` or `replay`. |

The response includes `items`, `page`, `limit`, `total`, and `totalPages`. Events are ordered newest first. Ownership is checked before filters are applied.

## Replay and analytics

`POST /api/events/:eventId/replay` accepts no destination URL. It loads the saved bytes and original endpoint from PostgreSQL, calls the same capture service used by the webhook route, then records a new event linked to the original plus a replay record. The stored, redacted headers are reused with `x-eventlens-replay: true`. The response includes the replay record and new event. Replay does not contact the original sender or a third-party service.

`GET /api/projects/:projectId/analytics` returns totals for received and replayed events, count in the last 24 hours, average/maximum/total request bytes, a 14-day UTC activity series, content-type distribution, endpoint activity, and replay success/failure counts. Every value comes from PostgreSQL queries.

## Ethereum inspector

`GET /api/tx?hash=<0x-prefixed-64-hex-character-hash>` requires a session. The response contains `transaction.hash`, `from`, `to`, `valueEth`, `valueWei`, `blockNumber`, `status`, `gasUsed`, `gasPriceGwei`, raw receipt `logs`, and `erc20Transfers`. Status is `pending`, `success`, or `reverted`. Each decoded transfer contains its token contract, sender, receiver, raw token units, and log index. Token decimals and symbols are not queried.

Invalid hashes return `400 INVALID_HASH`, unknown hashes return `404 NOT_FOUND`, and unavailable or non-mainnet RPC endpoints return `502`. The RPC destination is fixed by `ETHEREUM_RPC_URL`; request parameters cannot change it. No private keys are accepted and no transactions are sent.
