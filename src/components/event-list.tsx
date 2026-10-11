"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, RefreshCw, Search } from "lucide-react";
import { api, eventPreview, formatBytes, formatDate, type EventPage, type WebhookEndpoint } from "@/components/data";
import { Badge, Button, EmptyState, ErrorNotice, Input, Panel, Select, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

export function EventList({ projectId, endpoints }: { projectId: string; endpoints: WebhookEndpoint[] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [endpointId, setEndpointId] = useState("");
  const [source, setSource] = useState("");
  const [contentType, setContentType] = useState("");
  const [debouncedContentType, setDebouncedContentType] = useState("");
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<EventPage | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { const timeout = window.setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, 300); return () => window.clearTimeout(timeout); }, [query]);
  useEffect(() => { const timeout = window.setTimeout(() => { setDebouncedContentType(contentType.trim()); setPage(1); }, 300); return () => window.clearTimeout(timeout); }, [contentType]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (endpointId) params.set("endpointId", endpointId);
    if (source) params.set("source", source);
    if (debouncedContentType) params.set("contentType", debouncedContentType);
    try { const data = await api<EventPage>(`/api/projects/${projectId}/events?${params}`); setEvents(data); setError(""); }
    catch (error) { setError((error as Error).message); }
    finally { setRefreshing(false); }
  }, [projectId, page, debouncedQuery, endpointId, source, debouncedContentType]);

  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 7000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [load]);

  return <section aria-labelledby="events-heading"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 id="events-heading" className="text-sm font-semibold text-slate-100">Event activity</h2><p className="mt-1 text-xs text-slate-500">Incoming requests and replays appear here automatically.</p></div><Button size="sm" onClick={() => void load(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh</Button></div><div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(130px,180px)_minmax(115px,140px)_minmax(135px,170px)]"><label className="relative block"><span className="sr-only">Search events</span><Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-500" /><Input value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} placeholder="Search payloads and headers…" className="pl-9" /></label><label className="block"><span className="sr-only">Filter by endpoint</span><Select aria-label="Filter by endpoint" value={endpointId} onChange={(event) => { setEndpointId(event.target.value); setPage(1); }} className="w-full"><option value="">All endpoints</option>{endpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.name}</option>)}</Select></label><label className="block"><span className="sr-only">Filter by source</span><Select aria-label="Filter by source" value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} className="w-full"><option value="">All sources</option><option value="received">Received</option><option value="replay">Replay</option></Select></label><label className="block"><span className="sr-only">Filter by content type</span><Input aria-label="Filter by content type" value={contentType} maxLength={120} onChange={(event) => setContentType(event.target.value)} placeholder="Content type" /></label></div>{error && <div className="mb-3"><ErrorNotice message={error} retry={() => void load(true)} /></div>}<Panel className="overflow-hidden">{!events && !error ? <div className="p-6"><Spinner label="Loading events" /></div> : events && events.items.length === 0 ? <EmptyState icon={<Activity size={20} />} title={debouncedQuery || endpointId || source || debouncedContentType ? "No matching events" : "Waiting for a request"} description={debouncedQuery || endpointId || source || debouncedContentType ? "Try a different search term or filter." : "Send a POST request to one of your webhook endpoints. The request will appear here when it arrives."} /> : events && <><div className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left"><thead className="border-b border-white/10 bg-white/[.025] font-mono text-[10px] uppercase tracking-[.11em] text-slate-600"><tr><th scope="col" className="px-5 py-3 font-medium">Request</th><th scope="col" className="px-5 py-3 font-medium">Payload</th><th scope="col" className="px-5 py-3 font-medium">Endpoint</th><th scope="col" className="px-5 py-3 font-medium">Size</th><th scope="col" className="px-5 py-3 font-medium">Received</th><th scope="col" className="w-8" /></tr></thead><tbody className="divide-y divide-white/[.06]">{events.items.map((event) => <tr key={event.id} className="group hover:bg-white/[.035]"><td className="px-5 py-3"><div className="flex items-center gap-2"><Badge tone={event.source === "replay" ? "blue" : "green"}>{event.method}</Badge>{event.source === "replay" && <span className="font-mono text-[10px] text-indigo-300">REPLAY</span>}</div></td><td className="max-w-[320px] px-5 py-3"><Link href={`/dashboard/projects/${projectId}/events/${event.id}`} className="block truncate font-mono text-xs text-slate-200 group-hover:text-indigo-200" title={eventPreview(event)}>{eventPreview(event)}</Link><p className="mt-1 truncate font-mono text-[10px] text-slate-600">{event.contentType || "No content type"}</p></td><td className="max-w-[140px] truncate px-5 py-3 text-xs text-slate-400">{event.endpointName || endpoints.find((endpoint) => endpoint.id === event.endpointId)?.name || "Unknown"}</td><td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-400">{formatBytes(event.sizeBytes)}</td><td className="whitespace-nowrap px-5 py-3 text-xs text-slate-400" title={formatDate(event.receivedAt)}>{formatDate(event.receivedAt)}</td><td className="pr-5"><Link aria-label={`Inspect event ${event.id}`} href={`/dashboard/projects/${projectId}/events/${event.id}`} className="inline-flex rounded p-1 text-slate-600 hover:text-indigo-300"><ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3"><p className="text-xs text-slate-500">{events.total === 0 ? "0 events" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, events.total)} of ${events.total} events`}</p><div className="flex gap-1"><Button size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={14} /> Previous</Button><Button size="sm" disabled={page >= events.totalPages} onClick={() => setPage((value) => value + 1)}>Next <ArrowRight size={14} /></Button></div></div></>}</Panel></section>;
}
