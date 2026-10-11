"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BarChart3, Check, Copy, Pencil, Trash2 } from "lucide-react";
import { api, copyText, type Project, type WebhookEndpoint } from "@/components/data";
import { EndpointManager } from "@/components/endpoint-manager";
import { EventList } from "@/components/event-list";
import { Button, Dialog, DialogContent, ErrorNotice, Input, PageHeader, Panel, Spinner } from "@/components/ui";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[] | null>(null);
  const [error, setError] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [project, endpoints] = await Promise.all([
        api<Project>(`/api/projects/${projectId}`),
        api<WebhookEndpoint[]>(`/api/projects/${projectId}/endpoints`),
      ]);
      setProject(project);
      setEndpoints(endpoints);
    } catch (error) { setError((error as Error).message); }
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setFormError("");
    try { const updated = await api<Project>(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }); setProject(updated); setRenameOpen(false); window.dispatchEvent(new Event("eventlens:projects-updated")); }
    catch (error) { setFormError((error as Error).message); }
    finally { setPending(false); }
  }

  async function remove() {
    setPending(true); setFormError("");
    try { await api<Project>(`/api/projects/${projectId}`, { method: "DELETE" }); window.dispatchEvent(new Event("eventlens:projects-updated")); router.replace("/dashboard"); router.refresh(); }
    catch (error) { setFormError((error as Error).message); }
    finally { setPending(false); }
  }

  const example = endpoints?.[0] ? `curl -X POST '${endpoints[0].url}' -H 'Content-Type: application/json' -d '{"event":"hello.world","message":"Captured by EventLens"}'` : "";

  async function copyExample() {
    try { await copyText(example); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError("Clipboard access failed. Select the command to copy it manually."); }
  }

  if (!project && !error) return <Spinner label="Loading project" />;
  if (!project && error) return <div className="space-y-5"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} /> Back to workspace</Link><ErrorNotice message={error} retry={() => void load()} /></div>;
  if (!project) return null;

  return <><Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white"><ArrowLeft size={14} /> All projects</Link><PageHeader eyebrow="Project" title={project.name} description="Capture webhooks, inspect incoming payloads, and trace activity for this integration." action={<div className="flex flex-wrap gap-2"><Link href={`/dashboard/projects/${projectId}/analytics`} className="inline-flex h-9 items-center gap-2 rounded-md border border-white/12 bg-white/[.055] px-3.5 text-sm font-medium text-slate-100 hover:bg-white/[.09]"><BarChart3 size={15} /> Analytics</Link><Button aria-label="Rename project" title="Rename project" size="icon" onClick={() => { setName(project.name); setFormError(""); setRenameOpen(true); }}><Pencil size={15} /></Button><Button aria-label="Delete project" title="Delete project" size="icon" variant="danger" onClick={() => { setFormError(""); setDeleteOpen(true); }}><Trash2 size={15} /></Button></div>} />{error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load()} /></div>}{endpoints === null ? <Spinner label="Loading endpoints" /> : <div className="space-y-9"><EndpointManager projectId={projectId} endpoints={endpoints} onChange={() => void load()} />{endpoints.length > 0 && <section aria-labelledby="quickstart-heading"><div className="mb-3 flex items-center justify-between"><div><h2 id="quickstart-heading" className="text-sm font-semibold text-slate-100">Send a test request</h2><p className="mt-1 text-xs text-slate-500">Run this command to capture an event in the endpoint above.</p></div></div><Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5"><span className="font-mono text-[11px] text-slate-500">terminal</span><Button size="sm" variant="ghost" onClick={copyExample}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy command"}</Button></div><pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-slate-300"><code>{example}</code></pre></Panel></section>}<EventList projectId={projectId} endpoints={endpoints} /><div className="border-t border-white/10 pt-5"><Link href={`/dashboard/projects/${projectId}/analytics`} className="inline-flex items-center gap-2 text-xs font-medium text-indigo-300 hover:text-indigo-200">View project analytics <ArrowRight size={14} /></Link></div></div>}
    <Dialog open={renameOpen} onOpenChange={setRenameOpen}><DialogContent title="Rename project" description="Update the project name shown in your workspace."><form onSubmit={rename}><label htmlFor="rename-project" className="text-xs font-medium text-slate-300">Project name</label><Input id="rename-project" autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-2" />{formError && <p role="alert" className="mt-3 text-sm text-red-300">{formError}</p>}<div className="mt-6 flex justify-end gap-2"><Button type="button" onClick={() => setRenameOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={pending || !name.trim()}>{pending ? "Saving…" : "Save changes"}</Button></div></form></DialogContent></Dialog>
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent title="Delete project" description={`Delete “${project.name}”, its endpoints, and all captured events? This cannot be undone.`}>{formError && <p role="alert" className="mb-3 text-sm text-red-300">{formError}</p>}<div className="flex justify-end gap-2"><Button onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Delete project"}</Button></div></DialogContent></Dialog>
  </>;
}
