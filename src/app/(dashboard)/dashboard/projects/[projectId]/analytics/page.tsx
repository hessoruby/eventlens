"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BarChart3, RefreshCw } from "lucide-react";
import { api, formatBytes, type Analytics, type Project } from "@/components/data";
import { Button, EmptyState, ErrorNotice, PageHeader, Panel, Spinner } from "@/components/ui";

export default function AnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [project, analytics] = await Promise.all([
        api<Project>(`/api/projects/${projectId}`),
        api<Analytics>(`/api/projects/${projectId}/analytics`),
      ]);
      setProject(project); setAnalytics(analytics); setError("");
    } catch (error) { setError((error as Error).message); }
    finally { setRefreshing(false); }
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const back = <Link href={`/dashboard/projects/${projectId}`} className="mb-6 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white"><ArrowLeft size={14} /> Back to project</Link>;
  if (!analytics && !error) return <>{back}<Spinner label="Loading analytics" /></>;
  if (!analytics) return <>{back}<ErrorNotice message={error} retry={() => void load()} /></>;

  const maxDaily = Math.max(1, ...analytics.daily.map((day) => day.count));
  const maxEndpoint = Math.max(1, ...analytics.endpoints.map((endpoint) => endpoint.count));
  const maxContentType = Math.max(1, ...analytics.contentTypes.map((type) => type.count));

  return <>{back}<PageHeader eyebrow="Analytics" title={project?.name || "Project analytics"} description="Live statistics calculated from captured requests and replay records." action={<Button size="sm" onClick={() => { setRefreshing(true); void load(); }} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh</Button>} />{error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load()} /></div>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total events" value={analytics.totalEvents.toLocaleString()} note={`${analytics.receivedEvents} received · ${analytics.replayedEvents} replayed`} /><Metric label="Last 24 hours" value={analytics.eventsLast24Hours.toLocaleString()} note="Captured requests" /><Metric label="Average request" value={formatBytes(Math.round(analytics.averageSizeBytes))} note={`Largest ${formatBytes(analytics.maxSizeBytes)}`} /><Metric label="Replay errors" value={analytics.replayFailures.toLocaleString()} note={`${analytics.replaySuccesses} successful replays`} /></div><div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]"><Panel className="min-w-0 p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-100">Event activity</h2><p className="mt-1 text-xs text-slate-500">Requests by day</p></div><BarChart3 size={17} className="text-slate-500" /></div>{analytics.daily.length === 0 ? <EmptyState title="No activity yet" description="Events appear here after your endpoint receives a request." /> : <div className="mt-7 overflow-x-auto"><div className="flex h-52 min-w-[450px] items-end gap-2 border-b border-white/10 pb-1">{analytics.daily.map((day) => <div key={day.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${day.date}: ${day.count} events`}><span className="mb-1 block text-center font-mono text-[10px] text-slate-500 opacity-0 group-hover:opacity-100">{day.count}</span><div className="mx-auto w-full max-w-8 rounded-t-sm bg-indigo-300/65 transition-colors group-hover:bg-indigo-300" style={{ height: `${day.count === 0 ? 2 : Math.max(4, (day.count / maxDaily) * 170)}px` }} /></div>)}</div><div className="mt-2 flex min-w-[450px] gap-2">{analytics.daily.map((day, index) => <span key={day.date} className="min-w-0 flex-1 overflow-hidden text-center font-mono text-[9px] text-slate-600">{index === 0 || index === analytics.daily.length - 1 || index % Math.max(1, Math.ceil(analytics.daily.length / 7)) === 0 ? day.date.slice(5) : ""}</span>)}</div></div>}</Panel><Panel className="p-5"><h2 className="text-sm font-semibold text-slate-100">Request breakdown</h2><p className="mt-1 text-xs text-slate-500">Received and replayed events</p><div className="mt-8 flex h-3 overflow-hidden rounded-full bg-white/5"><div className="bg-emerald-300/75" style={{ width: `${analytics.totalEvents ? (analytics.receivedEvents / analytics.totalEvents) * 100 : 0}%` }} /><div className="bg-indigo-300/75" style={{ width: `${analytics.totalEvents ? (analytics.replayedEvents / analytics.totalEvents) * 100 : 0}%` }} /></div><div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-400"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-300/75" />Received <strong className="ml-1 font-mono font-medium text-slate-200">{analytics.receivedEvents}</strong></span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-indigo-300/75" />Replayed <strong className="ml-1 font-mono font-medium text-slate-200">{analytics.replayedEvents}</strong></span></div><div className="mt-8 border-t border-white/10 pt-5"><p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Total data captured</p><p className="mt-2 text-xl font-semibold text-white">{formatBytes(analytics.totalBytes)}</p></div></Panel></div><div className="mt-4 grid gap-4 xl:grid-cols-2"><Panel className="p-5"><h2 className="text-sm font-semibold text-slate-100">Content types</h2><p className="mt-1 text-xs text-slate-500">Across all captured events</p>{analytics.contentTypes.length === 0 ? <p className="py-10 text-sm text-slate-500">No content types recorded yet.</p> : <div className="mt-6 space-y-4">{analytics.contentTypes.map((type) => <BarRow key={type.contentType} label={type.contentType} count={type.count} max={maxContentType} />)}</div>}</Panel><Panel className="p-5"><h2 className="text-sm font-semibold text-slate-100">Endpoint activity</h2><p className="mt-1 text-xs text-slate-500">Events captured by each endpoint</p>{analytics.endpoints.length === 0 ? <p className="py-10 text-sm text-slate-500">Create an endpoint to see activity here.</p> : <div className="mt-6 space-y-4">{analytics.endpoints.map((endpoint) => <BarRow key={endpoint.endpointId} label={endpoint.name} count={endpoint.count} max={maxEndpoint} />)}</div>}</Panel></div></>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <Panel className="px-5 py-4"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-4 text-2xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></Panel>; }
function BarRow({ label, count, max }: { label: string; count: number; max: number }) { return <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-mono text-slate-300" title={label}>{label}</span><span className="shrink-0 font-mono text-slate-400">{count}</span></div><div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-indigo-300/65" style={{ width: `${(count / max) * 100}%` }} /></div></div>; }
