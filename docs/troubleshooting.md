# Troubleshooting

**Migrations cannot connect.** Confirm PostgreSQL is running and `DATABASE_URL` points to the correct host, port, database, and user. For local npm commands, `drizzle.config.ts` reads `.env`; editing only `.env.local` will not configure migrations. For Docker Compose, set `POSTGRES_PASSWORD` in `.env` and let Compose construct the app's container URL with host `db`.

**Registration or sign-in fails.** Apply migrations first, confirm `BETTER_AUTH_SECRET` is at least 32 characters, and use the same origin in `BETTER_AUTH_URL` and the browser address. In production use HTTPS and redeploy after changing environment variables. If a session expires, sign in again.

**Webhook returns 404.** Copy the endpoint URL from the project after creating it. A deleted endpoint or edited token will not match. Capture tokens are bearer secrets; a new endpoint gets a new URL.

**Webhook returns 413.** The body is larger than 256 KiB. Reduce the payload. The limit applies even if the sender omits `Content-Length`.

**Webhook returns 429.** That endpoint has reached 120 saved events in the last minute. Wait for the window to roll over or reduce sender traffic.

**A captured JSON body is shown as text.** The payload did not parse as JSON or the sender used a different content type. The raw body is still saved and can be inspected or replayed. Send `Content-Type: application/json` with valid JSON to get structured display.

**Ethereum inspector returns 400, 404, or 502.** `400` means the hash is not `0x` plus 64 hex characters. `404` means the mainnet RPC cannot find it. `502` means the configured RPC is unavailable or connected to a different chain. Check `ETHEREUM_RPC_URL`, provider quotas, and network access. Pending transactions may have no receipt, block number, gas used, or logs yet.

**Vercel build succeeds but requests fail.** Confirm the managed PostgreSQL integration supplied `DATABASE_URL`, production migrations were applied, and `BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL` match the deployed HTTPS origin. A local Docker database is not reachable from Vercel.
