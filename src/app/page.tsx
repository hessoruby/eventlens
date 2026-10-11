import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";

const steps = [
  {
    number: "01",
    title: "Receive",
    description: "Create a project endpoint and send it a POST request. The request is saved before the route returns 202.",
  },
  {
    number: "02",
    title: "Inspect",
    description: "Read the body and headers, search the event history, and see activity calculated from stored requests.",
  },
  {
    number: "03",
    title: "Replay",
    description: "Run a saved request through its original capture endpoint and follow the linked event.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0e0f12]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav aria-label="Main navigation" className="flex items-center gap-1 text-sm sm:gap-3">
            <Link className="hidden rounded px-3 py-2 text-slate-400 transition-colors hover:text-white sm:inline-flex" href="/docs">Docs</Link>
            <Link className="rounded px-2 py-2 text-slate-300 transition-colors hover:text-white sm:px-3" href="/sign-in">Log in</Link>
            <Link className="ml-1 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-indigo-300 px-3 font-medium text-[#101116] transition-colors hover:bg-indigo-200" href="/sign-up">
              Create account <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-28">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">Webhook capture & inspection</p>
          <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.055em] text-white sm:text-6xl lg:text-[76px]">
            See what hit your webhook.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Make a capture URL, send it a POST request, and inspect the saved payload. Search your event history or replay a request when something breaks.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className="inline-flex h-10 items-center gap-2 rounded-md bg-indigo-300 px-4 text-sm font-semibold text-[#11121a] transition-colors hover:bg-indigo-200">
              Start capturing <ArrowRight size={15} />
            </Link>
            <Link href="/docs" className="inline-flex h-10 items-center rounded-md border border-white/15 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5">
              Read the docs
            </Link>
          </div>
        </div>

        <figure className="mt-10 max-w-[1124px] sm:mt-20">
          <div className="overflow-hidden rounded-lg border border-white/15 bg-[#141619] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
            <Image
              src="/screenshots/event-history.png"
              alt="Event activity table showing three captured webhook requests and one replay"
              width={1124}
              height={439}
              priority
              unoptimized
              className="hidden h-auto w-full sm:block"
            />
            <Image
              src="/screenshots/event-history-mobile.png"
              alt="Mobile event history showing received webhook requests and one replay"
              width={358}
              height={616}
              priority
              unoptimized
              className="h-auto w-full sm:hidden"
            />
          </div>
          <figcaption className="mt-3 font-mono text-[11px] text-slate-500">
            Event history from a local test project. Every row is a stored request.
          </figcaption>
        </figure>
      </section>

      <section className="border-y border-white/10 bg-[#111215]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">How it works</p>
            <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
              Start with a URL.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
              EventLens stores incoming requests in PostgreSQL. Project data stays in its owner&apos;s workspace; sensitive header values are redacted before storage.
            </p>
          </div>
          <ol className="border-t border-white/10">
            {steps.map((step) => (
              <li key={step.number} className="grid gap-4 border-b border-white/10 py-6 sm:grid-cols-[44px_130px_1fr] sm:items-start sm:gap-6">
                <span className="font-mono text-xs text-indigo-300">{step.number}</span>
                <h3 className="text-base font-medium text-white">{step.title}</h3>
                <p className="max-w-md text-sm leading-6 text-slate-400">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-indigo-300">Request inspector</p>
          <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
            Body, headers, and replay status.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
            Open any event to read formatted JSON, inspect redacted headers, copy the payload, and check replay results. The same workspace also includes a read-only Ethereum mainnet transaction inspector.
          </p>
          <Link href="/docs" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200">
            See the setup guide <ArrowRight size={15} />
          </Link>
        </div>
        <figure>
          <div className="overflow-hidden rounded-lg border border-white/15 bg-[#141619]">
            <Image
              src="/screenshots/inspector-panel.png"
              alt="Saved webhook event with request metadata, replay action, and formatted JSON body"
              width={1124}
              height={535}
              sizes="(max-width: 1024px) 100vw, 55vw"
              unoptimized
              className="hidden h-auto w-full sm:block"
            />
            <Image
              src="/screenshots/event-body-mobile.png"
              alt="Formatted JSON body of a saved webhook request on mobile"
              width={358}
              height={237}
              unoptimized
              className="h-auto w-full sm:hidden"
            />
          </div>
          <figcaption className="mt-3 font-mono text-[11px] text-slate-500">A saved request from the same local test project.</figcaption>
        </figure>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-slate-500 sm:px-8">
          <Brand />
          <span>Open source · MIT licensed</span>
          <Link href="/docs" className="hover:text-white">Documentation</Link>
        </div>
      </footer>
    </main>
  );
}
