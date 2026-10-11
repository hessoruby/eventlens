"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, ArrowRight, Check, Copy, RefreshCw, Repeat2 } from "lucide-react";
import { api, copyText, formatBytes, formatDate, type EventDetail, type ReplayRecord } from "@/components/data";
import { JsonViewer } from "@/components/json-viewer";
import { Badge, Button, ErrorNotice, PageHeader, Panel, Spinner, cn } from "@/components/ui";

export default function EventDetailPage() {
  const { projectId, eventId } = useParams<{ projectId: string; eventId: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState("");
  const [replaying, setReplaying] = useState(false);
  const [result, setResult] = useState<ReplayRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api<EventDetail>(`/api/events/${eventId}`);
      if (next.projectId !== projectId) throw new Error("This event does not belong to the selected project.");
      setEvent(next); setError("");
    } catch (error) { setError((error as Error).message); }
  }, [eventId, projectId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function replay() {
    setReplaying(true); setError(""); setResult(null);
    try {
      const response = await api<{ replay: ReplayRecord; event: EventDetail | null }>(`/api/events/${eventId}/replay`, { method: "POST" });
      setResult(response.replay);
      await load();
    } catch (error) { const message = (error as Error).message; await load(); setError(message); }
    finally { setReplaying(false); }
  }

  async function copyId() {
    try { await copyText(eventId); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError("Clipboard access failed. Select the event ID to copy it manually."); }
  }

  const back = <Link href={`/dashboard/projects/${projectId}`} className="mb-6 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white"><ArrowLeft size={14} /> Back to project</Link>;
  if (!event && !error) return <>{back}<Spinner label="Loading event" /></>;
  if (!event) return <>{back}<ErrorNotice message={error} retry={() => void load()} /></>;

  const body = event.bodyJson !== null && event.bodyJson !== undefined ? event.bodyJson : undefined;
  const rawBody = event.bodyText ?? event.bodyBase64 ?? "";
  const headers = Object.fromEntries(Object.entries(event.headers).sort(([a], [b]) => a.localeCompare(b)));
  const replays = event.replays ?? [];

  return <>{back}<PageHeader eyebrow="Request inspector" title="Event detail" description="The request exactly as captured, with sensitive headers redacted before storage." action={<Button variant="primary" onClick={replay} disabled={replaying}><Repeat2 size={15} /> {replaying ? "Replaying…" : "Replay event"}</Button>} />{error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load()} /></div>}{result && <Panel className="mb-5 border-indigo-400/25 bg-indigo-400/[.07] px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-slate-100">Replay {result.status}</p><p className="mt-1 text-xs text-slate-400">{result.responseStatus ? `Capture pipeline saved a new event (status ${result.responseStatus}).` : result.errorMessage || "Replay finished."}</p></div>{result.replayedEventId && <Link href={`/dashboard/projects/${projectId}/events/${result.replayedEventId}`} className="inline-flex items-center gap-2 text-xs font-medium text-indigo-300 hover:text-indigo-200">Inspect replayed event <ArrowRight size={14} /></Link>}</div></Panel>}<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]"><div className="min-w-0 space-y-4"><Panel className="overflow-hidden"><div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4"><Badge tone={event.source === "replay" ? "blue" : "green"}>{event.method}</Badge><p className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400" title={event.id}>{event.id}</p><Button size="sm" variant="ghost" onClick={copyId}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy ID"}</Button></div><dl className="grid gap-4 px-5 py-4 sm:grid-cols-2"><Info label="Received" value={formatDate(event.receivedAt)} /><Info label="Source" value={event.source} /><Info label="Content type" value={event.contentType || "Not provided"} /><Info label="Request size" value={formatBytes(event.sizeBytes)} /><Info label="Endpoint" value={event.endpointName || event.endpointId} /><Info label="Method" value={event.method} /></dl></Panel><Tabs.Root defaultValue="body"><Tabs.List aria-label="Event data" className="flex gap-1 border-b border-white/10"><Tab value="body">Body</Tab><Tab value="headers">Headers <span className="ml-1 text-slate-600">{Object.keys(headers).length}</span></Tab><Tab value="replays">Replays <span className="ml-1 text-slate-600">{replays.length}</span></Tab></Tabs.List><Tabs.Content value="body" className="pt-4 outline-none"><JsonViewer value={body} text={rawBody} label={body !== undefined ? "Formatted JSON" : event.bodyText !== null ? "Request body" : event.bodyBase64 ? "Base64 request body" : "Request body"} /></Tabs.Content><Tabs.Content value="headers" className="pt-4 outline-none"><JsonViewer value={headers} label="Request headers · sensitive values redacted" /></Tabs.Content><Tabs.Content value="replays" className="pt-4 outline-none"><Panel>{replays.length === 0 ? <p className="p-5 text-sm text-slate-500">This event has not been replayed.</p> : <div className="divide-y divide-white/10">{replays.map((replay) => <div key={replay.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex items-center gap-3"><Badge tone={replay.replayedEventId ? "green" : "red"}>{replay.status}</Badge><div><p className="text-xs text-slate-300">{formatDate(replay.createdAt)}</p><p className="mt-1 font-mono text-[11px] text-slate-500">{replay.responseStatus ? `HTTP ${replay.responseStatus}` : replay.errorMessage || "No response status"}</p></div></div>{replay.replayedEventId && <Link href={`/dashboard/projects/${projectId}/events/${replay.replayedEventId}`} className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200">View event <ArrowRight size={13} /></Link>}</div>)}</div>}</Panel></Tabs.Content></Tabs.Root></div><aside className="space-y-4"><Panel className="p-5"><div className="flex items-center gap-2 text-slate-200"><RefreshCw size={16} className="text-indigo-300" /><h2 className="text-sm font-semibold">Replay request</h2></div><p className="mt-3 text-xs leading-6 text-slate-400">Re-ingest this saved payload through its original endpoint’s capture pipeline. A new linked event appears in the same project.</p><Button className="mt-5 w-full" onClick={replay} disabled={replaying}><Repeat2 size={14} /> {replaying ? "Replaying…" : "Replay event"}</Button></Panel>{event.replayedFromEventId && <Panel className="p-5"><p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">Replayed from</p><Link href={`/dashboard/projects/${projectId}/events/${event.replayedFromEventId}`} className="mt-2 inline-flex items-center gap-1 break-all font-mono text-xs text-indigo-300 hover:text-indigo-200">{event.replayedFromEventId} <ArrowRight size={13} className="shrink-0" /></Link></Panel>}</aside></div></>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="font-mono text-[10px] uppercase tracking-[.11em] text-slate-600">{label}</dt><dd className="mt-1 truncate text-xs text-slate-200" title={value}>{value}</dd></div>; }
function Tab({ value, children }: { value: string; children: React.ReactNode }) { return <Tabs.Trigger value={value} className={cn("border-b-2 border-transparent px-3 py-2.5 text-xs font-medium text-slate-500 outline-none hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-300 data-[state=active]:text-white")}>{children}</Tabs.Trigger>; }
