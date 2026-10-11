# Deployment

EventLens can run as a local Docker Compose stack or as a Next.js application on Vercel with managed PostgreSQL. The application requires a persistent PostgreSQL database; a Vercel deployment cannot use the local Compose database.

## Docker Compose

Copy `.env.example` to `.env`, set `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET` to different random values, then run `docker compose up --build`. Compose starts PostgreSQL 17, waits for its health check, applies Drizzle migrations, and starts the app on `127.0.0.1:3000`. Use a URL-safe database password such as one produced by `openssl rand -hex 24`, because Compose constructs a connection URL from that value. PostgreSQL data persists in the `postgres_data` named volume.

## Vercel and managed PostgreSQL

1. Push the repository to GitHub and import it as a new Next.js project in Vercel. Confirm the selected repository and owner before connecting it.
2. Provision a PostgreSQL database through Vercel Marketplace (for example Neon) and connect it to this new project. Choose a region near the app's serverless functions and enable TLS.
3. Set `DATABASE_URL` to the provider's PostgreSQL connection URL. Some integrations use a differently named variable; map that value to `DATABASE_URL`. Use a pooled runtime URL if the provider recommends one.
4. Generate a unique `BETTER_AUTH_SECRET` (at least 32 characters), and set both `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the exact production HTTPS origin. Set `ETHEREUM_RPC_URL` to a mainnet RPC endpoint with adequate capacity, or accept the public default.
5. Apply migrations from a trusted shell before opening the deployment to users: `npm ci && npm run db:migrate` with `DATABASE_URL` pointing to the managed database. Use a direct connection URL for migrations if the provider distinguishes direct and pooled URLs. Do not print or commit the URL.
6. Deploy, then verify account registration, project/endpoint creation, a real curl POST, event inspection, replay, analytics, and a real Ethereum transaction in the deployed app.

Environment variable changes require a new deployment on Vercel. A public webhook URL uses `NEXT_PUBLIC_APP_URL`; set it correctly before sharing capture URLs. Configure managed database backups, request monitoring, and data retention based on the payloads your senders submit.

## CI

GitHub Actions starts a temporary PostgreSQL service, applies migrations, then runs ESLint, strict TypeScript, Vitest, a production build, and Playwright. Its database password and auth secret are disposable CI-only values. Real production secrets belong in the deployment provider's encrypted environment settings, not GitHub source files.
