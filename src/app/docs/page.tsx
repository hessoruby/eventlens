import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Database, LockKeyhole, Webhook } from "lucide-react";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Documentation",
  description: "EventLens quick start, API reference, architecture, and troubleshooting.",
};

const sections = [
  ["quick-start", "Quick start"],
  ["api", "API reference"],
  ["architecture", "Architecture"],
  ["local-setup", "Local setup"],
  ["troubleshooting", "Troubleshooting"],
];

const routes = [
  ["GET /api/projects", "List your projects with endpoint and event counts."],
  ["POST /api/projects", "Create a project with a name (1–80 characters)."],
  ["GET · PATCH · DELETE /api/projects/:id", "Read, rename, or delete an owned project."],
  ["GET · POST /api/projects/:id/endpoints", "List or create capture endpoints."],
  ["PATCH · DELETE /api/projects/:id/endpoints/:endpointId", "Rename or delete an endpoint."],
  ["POST /api/hooks/:token", "Capture an HTTP request. Returns 202 after persistence."],
  ["GET /api/projects/:id/events", "Search and paginate captured events."],
  ["GET /api/events/:eventId", "Inspect an event and its replay history."],
  ["POST /api/events/:eventId/replay", "Re-ingest saved bytes through the original capture pipeline."],
  ["GET /api/projects/:id/analytics", "Read project metrics from PostgreSQL."],
  ["GET /api/tx?hash=0x…", "Inspect a mainnet Ethereum transaction."],
];

const troubleshooting = [
  ["Registration or sign-in fails", "Apply database migrations, use a BETTER_AUTH_SECRET of at least 32 characters, and set BETTER_AUTH_URL to the same origin shown in the browser."],
  ["Webhook returns 404", "Copy the current URL from the project. Deleting an endpoint invalidates its token and URL."],
  ["Webhook returns 413 or 429", "413 means the body exceeds 256 KiB. 429 means the endpoint reached 120 saved events in the past minute."],
  ["JSON appears as text", "Send valid JSON with Content-Type: application/json. Invalid JSON remains available as text and original bytes."],
  ["Ethereum lookup returns 400, 404, or 502", "400 means the hash is malformed; 404 means it was not found; 502 means the configured mainnet RPC is unavailable or connected to the wrong chain."],
];

export default function DocsPage() {
  return <div className="min-h-screen bg-[#0e0f12]">
    <header className="border-b border-white/10 bg-[#111316]"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"><Brand /><nav aria-label="Main navigation" className="flex items-center gap-3 text-sm"><Link href="/dashboard" className="text-slate-400 hover:text-white">Dashboard</Link><Link href="/sign-up" className="inline-flex items-center gap-1 rounded-md bg-indigo-300 px-3 py-1.5 font-medium text-[#101116] hover:bg-indigo-200">Get started <ArrowRight size={13} /></Link></nav></div></header>
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16 lg:py-14">
      <aside className="lg:sticky lg:top-8 lg:h-fit"><p className="mb-4 font-mono text-[10px] uppercase tracking-[.17em] text-indigo-300">Documentation</p><nav aria-label="Documentation sections" className="flex flex-wrap gap-1 pb-2 lg:flex-col">{sections.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-md px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white">{label}</a>)}</nav></aside>
      <main className="min-w-0 max-w-4xl">
        <div className="border-b border-white/10 pb-10"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-300/20 bg-indigo-300/10 text-indigo-300"><BookOpen size={19} /></div><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Build with EventLens</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">A practical guide to capture URLs, event inspection, replay, analytics, and the private API. EventLens records real requests in PostgreSQL.</p></div>
        <section id="quick-start" className="scroll-mt-8 border-b border-white/10 py-10"><SectionTitle number="01" title="Quick start" /><p className="mt-4 text-sm leading-7 text-slate-400">Register, create a project, then create a webhook endpoint. Copy the URL shown in the project and set it as <Code>WEBHOOK_URL</Code> in your terminal. The token in that URL allows anyone holding it to send events to the endpoint.</p><CodeBlock>{`curl -i -X POST "$WEBHOOK_URL" -H 'Content-Type: application/json' -H 'X-Trace-Id: local-check-1' -d '{"type":"order.created","orderId":"example-1"}'`}</CodeBlock><p className="mt-4 text-sm leading-7 text-slate-400">The capture route returns HTTP <Code>202</Code> after saving the event. Open the project to inspect its headers and body, search for <Code>example-1</Code>, or replay it to create a linked event.</p><Link href="/sign-up" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200">Create an account <ArrowRight size={14} /></Link></section>
        <section id="api" className="scroll-mt-8 border-b border-white/10 py-10"><SectionTitle number="02" title="API reference" /><p className="mt-4 text-sm leading-7 text-slate-400">Private routes require a signed-in session and same-origin requests for changes. Capture routes use the URL token. Responses use <Code>{'{"data": ...}'}</Code> on success or <Code>{'{"error":{"code":"...","message":"..."}}'}</Code> on failure. The transaction route returns <Code>{'{"transaction": ...}'}</Code>.</p><div className="mt-6 overflow-x-auto rounded-lg border border-white/10"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-white/[.035] font-mono uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Purpose</th></tr></thead><tbody className="divide-y divide-white/[.06]">{routes.map(([route, purpose]) => <tr key={route}><td className="whitespace-nowrap px-4 py-3 font-mono text-indigo-300">{route}</td><td className="px-4 py-3 text-slate-400">{purpose}</td></tr>)}</tbody></table></div><h3 className="mt-8 text-sm font-semibold text-white">Search events</h3><p className="mt-2 text-sm leading-7 text-slate-400">Use <Code>q</Code> for a case-insensitive substring in the event ID, text body, content type, or redacted headers. Filter with <Code>endpointId</Code>, exact normalized <Code>contentType</Code>, and <Code>source=received</Code> or <Code>source=replay</Code>. Pagination uses <Code>page</Code> and <Code>limit</Code> (up to 50). Results are newest first.</p><h3 className="mt-6 text-sm font-semibold text-white">Capture limits</h3><p className="mt-2 text-sm leading-7 text-slate-400">Bodies are limited to 256 KiB and each endpoint to 120 saved events per minute. Oversized requests return 413; rate-limited requests return 429. Sensitive header values are replaced with <Code>[REDACTED]</Code> before storage. Body content is saved as received.</p></section>
        <section id="architecture" className="scroll-mt-8 border-b border-white/10 py-10"><SectionTitle number="03" title="Architecture" /><p className="mt-4 text-sm leading-7 text-slate-400">Next.js serves the dashboard and Node.js route handlers. Better Auth manages password accounts and sessions. Drizzle writes projects, endpoints, events, and replay records to PostgreSQL. viem reads Ethereum mainnet data from a server-configured RPC.</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><ArchitectureCard icon={<Webhook size={17} />} title="Capture" copy="A public token URL accepts a bounded POST body and saves its headers and bytes." /><ArchitectureCard icon={<Database size={17} />} title="Store" copy="Project ownership checks isolate private reads and writes in PostgreSQL." /><ArchitectureCard icon={<LockKeyhole size={17} />} title="Replay" copy="Saved bytes pass through the original endpoint’s capture pipeline. No destination URL is accepted." /></div><p className="mt-5 text-sm leading-7 text-slate-400">Replay creates a new event and status record, but does not contact the original sender or a third-party service. Ethereum inspection requires no wallet or private key and never submits transactions.</p></section>
        <section id="local-setup" className="scroll-mt-8 border-b border-white/10 py-10"><SectionTitle number="04" title="Local setup" /><p className="mt-4 text-sm leading-7 text-slate-400">Use Node.js 22+, npm, and PostgreSQL 17+, or start everything with Docker Compose. Keep secrets in a local <Code>.env</Code> file; it is ignored by Git.</p><h3 className="mt-6 text-sm font-semibold text-white">Docker Compose</h3><CodeBlock>{["cp .env.example .env", "# Set POSTGRES_PASSWORD and BETTER_AUTH_SECRET in .env", "docker compose up --build"].join("\n")}</CodeBlock><h3 className="mt-6 text-sm font-semibold text-white">Existing PostgreSQL server</h3><CodeBlock>{["cp .env.example .env", "# Set DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL", "npm ci", "npm run db:migrate", "npm run dev"].join("\n")}</CodeBlock><p className="mt-4 text-sm leading-7 text-slate-400">Generate a unique auth secret with <Code>openssl rand -hex 32</Code>. The app runs at <Code>http://localhost:3000</Code> by default. For Vercel, attach managed PostgreSQL, configure the production variables, and apply migrations before taking traffic.</p></section>
        <section id="troubleshooting" className="scroll-mt-8 py-10"><SectionTitle number="05" title="Troubleshooting" /><div className="mt-6 divide-y divide-white/10 rounded-lg border border-white/10">{troubleshooting.map(([question, answer]) => <details key={question} className="group p-4"><summary className="cursor-pointer text-sm font-medium text-slate-200 marker:text-indigo-300">{question}</summary><p className="mt-3 pl-4 text-sm leading-6 text-slate-400">{answer}</p></details>)}</div></section>
      </main>
    </div><footer className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-slate-500 sm:px-8"><Brand /><span>Open-source webhook infrastructure.</span><Link href="/dashboard" className="hover:text-white">Open dashboard</Link></div></footer>
  </div>;
}

function SectionTitle({ number, title }: { number: string; title: string }) { return <div className="flex items-baseline gap-3"><span className="font-mono text-[11px] text-indigo-300">{number}</span><h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2></div>; }
function Code({ children }: { children: React.ReactNode }) { return <code className="rounded border border-white/10 bg-white/[.055] px-1.5 py-0.5 font-mono text-[.9em] text-indigo-200">{children}</code>; }
function CodeBlock({ children }: { children: string }) { return <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-[#141619] p-4 font-mono text-xs leading-6 text-slate-300"><code>{children}</code></pre>; }
function ArchitectureCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) { return <div className="rounded-lg border border-white/10 bg-[#141619] p-4"><span className="text-indigo-300">{icon}</span><h3 className="mt-4 text-sm font-medium text-white">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-400">{copy}</p></div>; }
