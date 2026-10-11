"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Pencil, Plus, Trash2, Webhook } from "lucide-react";
import { api, copyText, formatDate, type WebhookEndpoint } from "@/components/data";
import { Badge, Button, Dialog, DialogContent, EmptyState, Input, Panel } from "@/components/ui";

export function EndpointManager({ projectId, endpoints, onChange }: { projectId: string; endpoints: WebhookEndpoint[]; onChange: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [editing, setEditing] = useState<WebhookEndpoint | null>(null);
  const [deleting, setDeleting] = useState<WebhookEndpoint | null>(null);
  const [editName, setEditName] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try { await api<WebhookEndpoint>(`/api/projects/${projectId}/endpoints`, { method: "POST", body: JSON.stringify({ name: name.trim() }) }); setName(""); setCreateOpen(false); onChange(); }
    catch (error) { setError((error as Error).message); }
    finally { setPending(false); }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setPending(true); setError("");
    try { await api<WebhookEndpoint>(`/api/projects/${projectId}/endpoints/${editing.id}`, { method: "PATCH", body: JSON.stringify({ name: editName.trim() }) }); setEditing(null); onChange(); }
    catch (error) { setError((error as Error).message); }
    finally { setPending(false); }
  }

  async function remove() {
    if (!deleting) return; setPending(true); setError("");
    try { await api<WebhookEndpoint>(`/api/projects/${projectId}/endpoints/${deleting.id}`, { method: "DELETE" }); setDeleting(null); onChange(); }
    catch (error) { setError((error as Error).message); }
    finally { setPending(false); }
  }

  async function copyEndpoint(endpoint: WebhookEndpoint) {
    try { await copyText(endpoint.url); setCopiedId(endpoint.id); window.setTimeout(() => setCopiedId(""), 2000); }
    catch { setError("Clipboard access failed. Select the URL to copy it manually."); }
  }

  return <section aria-labelledby="endpoints-heading"><div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="endpoints-heading" className="text-sm font-semibold text-slate-100">Webhook endpoints</h2><p className="mt-1 text-xs text-slate-500">POST requests sent to these URLs are saved to this project.</p></div><Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> Create endpoint</Button></div><Panel className="overflow-hidden">{endpoints.length === 0 ? <EmptyState icon={<Webhook size={20} />} title="No endpoints yet" description="Create an endpoint to receive your first webhook or API event." action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} /> Create endpoint</Button>} /> : <div className="divide-y divide-white/10">{endpoints.map((endpoint) => <div key={endpoint.id} className="p-4 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-medium text-slate-100">{endpoint.name}</p><Badge tone="green">Active</Badge></div><p className="mt-1 text-xs text-slate-500">Created {formatDate(endpoint.createdAt)}</p></div><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label={`Rename ${endpoint.name}`} title="Rename endpoint" onClick={() => { setEditing(endpoint); setEditName(endpoint.name); setError(""); }}><Pencil size={14} /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${endpoint.name}`} title="Delete endpoint" onClick={() => { setDeleting(endpoint); setError(""); }}><Trash2 size={14} /></Button></div></div><div className="mt-3 flex items-center gap-2"><Input aria-label={`${endpoint.name} webhook URL`} readOnly value={endpoint.url} className="min-w-0 font-mono text-[11px] text-slate-300" onFocus={(event) => event.currentTarget.select()} /><Button size="icon" aria-label={`Copy ${endpoint.name} URL`} title="Copy URL" onClick={() => copyEndpoint(endpoint)}>{copiedId === endpoint.id ? <Check size={15} /> : <Copy size={15} />}</Button></div></div>)}</div>}</Panel>{error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent title="Create webhook endpoint" description="This generates a unique URL for POST requests. The URL acts as a public capture address."><form onSubmit={create}><label htmlFor="endpoint-name" className="text-xs font-medium text-slate-300">Endpoint name</label><Input id="endpoint-name" autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Stripe production" className="mt-2" />{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button type="button" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={pending || !name.trim()}>{pending ? "Creating…" : "Create endpoint"}</Button></div></form></DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}><DialogContent title="Rename endpoint" description="Update the endpoint label. Its capture URL stays the same."><form onSubmit={saveEdit}><label htmlFor="edit-endpoint-name" className="text-xs font-medium text-slate-300">Endpoint name</label><Input id="edit-endpoint-name" autoFocus required maxLength={80} value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-2" />{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button type="button" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" variant="primary" disabled={pending || !editName.trim()}>{pending ? "Saving…" : "Save changes"}</Button></div></form></DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}><DialogContent title="Delete endpoint" description={`Delete “${deleting?.name ?? ""}” and all of its captured events? This cannot be undone.`}>{error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-2"><Button onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Delete endpoint"}</Button></div></DialogContent></Dialog>
  </section>;
}
