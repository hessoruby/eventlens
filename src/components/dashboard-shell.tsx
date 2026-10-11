"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowUpRight, BookOpen, ChevronDown, CircleUserRound, FolderClosed, LogOut, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { authClient } from "@/components/auth-client";
import { api, type Project } from "@/components/data";
import { cn } from "@/components/ui";

export function DashboardShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const fetchProjects = useCallback(() => { api<Project[]>("/api/projects").then(setProjects).catch(() => undefined); }, []);
  useEffect(() => { fetchProjects(); window.addEventListener("eventlens:projects-updated", fetchProjects); return () => window.removeEventListener("eventlens:projects-updated", fetchProjects); }, [fetchProjects]);

  async function signOut() {
    setSigningOut(true);
    try { await authClient.signOut(); router.replace("/sign-in"); router.refresh(); }
    finally { setSigningOut(false); }
  }

  const nav = <><div className="flex h-16 items-center justify-between border-b border-white/10 px-5"><Brand href="/dashboard" /><button type="button" className="rounded p-1 text-slate-400 hover:text-white lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={19} /></button></div><div className="flex-1 overflow-y-auto px-3 py-5"><p className="px-2 font-mono text-[10px] uppercase tracking-[.17em] text-slate-600">Workspace</p><nav aria-label="Workspace navigation" className="mt-3 space-y-1"><SideLink href="/dashboard" active={pathname === "/dashboard"} icon={<Activity size={16} />}>Overview</SideLink><SideLink href="/dashboard/ethereum" active={pathname.startsWith("/dashboard/ethereum")} icon={<ArrowUpRight size={16} />}>Ethereum inspector</SideLink></nav><div className="mt-8 flex items-center justify-between px-2"><p className="font-mono text-[10px] uppercase tracking-[.17em] text-slate-600">Projects</p><Link href="/dashboard" className="rounded p-1 text-slate-500 hover:text-white" aria-label="View projects"><ChevronDown size={14} /></Link></div><nav aria-label="Projects" className="mt-2 space-y-1">{projects.map((project) => <SideLink key={project.id} href={`/dashboard/projects/${project.id}`} active={pathname.startsWith(`/dashboard/projects/${project.id}`)} icon={<FolderClosed size={15} />}><span className="truncate">{project.name}</span></SideLink>)}{projects.length === 0 && <p className="px-2 py-2 text-xs leading-5 text-slate-600">Your projects appear here.</p>}</nav><div className="mt-8 border-t border-white/10 pt-5"><SideLink href="/docs" active={false} icon={<BookOpen size={16} />}>Documentation</SideLink></div></div><div className="border-t border-white/10 p-3"><div className="flex items-center gap-3 rounded-md px-2 py-2"><CircleUserRound size={19} className="shrink-0 text-slate-500" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{user.name}</p><p className="truncate text-[11px] text-slate-600">{user.email}</p></div><button type="button" title="Sign out" aria-label="Sign out" disabled={signingOut} onClick={signOut} className="rounded p-1.5 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-50"><LogOut size={16} /></button></div></div></>;

  return <div className="min-h-screen bg-[#0e0f12]"><aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-white/10 bg-[#111316] lg:flex">{nav}</aside>{mobileOpen && <div className="fixed inset-0 z-40 lg:hidden"><button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} /><aside className="absolute inset-y-0 left-0 flex w-[min(82vw,270px)] flex-col border-r border-white/10 bg-[#111316]" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }}>{nav}</aside></div>}<div className="lg:pl-[236px]"><header className="flex h-14 items-center gap-3 border-b border-white/10 bg-[#111316] px-4 lg:hidden"><button aria-label="Open menu" type="button" onClick={() => setMobileOpen(true)} className="rounded p-1.5 text-slate-300 hover:bg-white/5"><Menu size={19} /></button><Brand href="/dashboard" /></header><main className="mx-auto w-full max-w-[1460px] px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main></div></div>;
}

function SideLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors", active ? "bg-white/[.075] text-white" : "text-slate-500 hover:bg-white/[.045] hover:text-slate-200")}>{icon}<span className="min-w-0 flex-1 truncate">{children}</span></Link>;
}
