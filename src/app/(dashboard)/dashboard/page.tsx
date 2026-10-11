"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, FolderPlus, Plus, Webhook } from "lucide-react";
import { api, formatDate, type Project } from "@/components/data";
import { Button, Dialog, DialogContent, DialogTrigger, EmptyState, ErrorNotice, Input, PageHeader, Panel, Spinner } from "@/components/ui";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(() => { setError(""); api<Project[]>("/api/projects").then(setProjects).catch((error: Error) => setError(error.message)); }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await api<Project>("/api/projects", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
      setDialogOpen(false);
      setName("");
      load();
      window.dispatchEvent(new Event("eventlens:projects-updated"));
    } catch (error) { setFormError((error as Error).message); }
    finally { setSaving(false); }
  }

  const projectCount = projects?.length ?? 0;
  const endpointCount = projects?.reduce((sum, project) => sum + (project.endpointCount ?? 0), 0) ?? 0;
  const eventCount = projects?.reduce((sum, project) => sum + (project.eventCount ?? 0), 0) ?? 0;

  return <><PageHeader eyebrow="Workspace" title="Overview" description="Your projects, endpoints, and captured requests in one place." action={<Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button variant="primary"><Plus size={16} /> New project</Button></DialogTrigger><DialogContent title="Create project" description="Projects keep endpoints and events separate. Only you can access this workspace."><form onSubmit={createProject}><label className="block text-xs font-medium text-slate-300" htmlFor="project-name">Project name</label><Input id="project-name" autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Production webhooks" className="mt-2" />{formError && <p role="alert" className="mt-3 text-sm text-red-300">{formError}</p>}<div className="mt-6 flex justify-end gap-2"><Button type="button" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={saving || !name.trim()}>{saving ? "Creating…" : "Create project"}</Button></div></form></DialogContent></Dialog>} />
    {error && <ErrorNotice message={error} retry={load} />}
    {!projects && !error ? <Spinner label="Loading workspace" /> : projects && <><div className="mb-8 grid gap-3 sm:grid-cols-3"><Metric label="Projects" value={projectCount} /><Metric label="Webhook endpoints" value={endpointCount} /><Metric label="Captured events" value={eventCount} /></div><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-100">Projects</h2><span className="font-mono text-xs text-slate-500">{projectCount} total</span></div><Panel className="overflow-hidden">{projects.length === 0 ? <EmptyState icon={<FolderPlus size={20} />} title="Create your first project" description="A project gives you a dedicated webhook URL and a searchable history of incoming requests." action={<Button variant="primary" onClick={() => setDialogOpen(true)}><Plus size={15} /> Create project</Button>} /> : <div className="divide-y divide-white/10">{projects.map((project) => <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[.035]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[.035] text-indigo-300"><Webhook size={16} /></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium text-slate-100 group-hover:text-white">{project.name}</h3><p className="mt-1 text-xs text-slate-500">Created {formatDate(project.createdAt)}</p></div><div className="hidden gap-8 text-right sm:flex"><div><p className="font-mono text-sm text-slate-200">{project.endpointCount ?? 0}</p><p className="text-[11px] text-slate-600">endpoints</p></div><div><p className="font-mono text-sm text-slate-200">{project.eventCount ?? 0}</p><p className="text-[11px] text-slate-600">events</p></div></div><ArrowRight size={16} className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" /></Link>)}</div>}</Panel></>}
  </>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Panel className="px-5 py-4"><p className="font-mono text-[11px] uppercase tracking-[.11em] text-slate-500">{label}</p><p className="mt-4 text-[28px] font-semibold leading-none tracking-tight text-white">{new Intl.NumberFormat().format(value)}</p></Panel>;
}
