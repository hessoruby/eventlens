"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
};

export function Button({ className, variant = "secondary", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "border-indigo-400/70 bg-indigo-400 text-[#11121a] hover:bg-indigo-300",
        variant === "secondary" && "border-white/12 bg-white/[0.055] text-slate-100 hover:border-white/20 hover:bg-white/[0.09]",
        variant === "ghost" && "border-transparent bg-transparent text-slate-400 hover:bg-white/[0.055] hover:text-white",
        variant === "danger" && "border-red-400/25 bg-red-400/10 text-red-300 hover:bg-red-400/20",
        size === "default" && "h-9 px-3.5",
        size === "sm" && "h-8 px-2.5 text-xs",
        size === "icon" && "h-9 w-9",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={cn("h-9 w-full rounded-md border border-white/12 bg-[#101216] px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/15 disabled:opacity-50", className)} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select className={cn("h-9 rounded-md border border-white/12 bg-[#101216] px-3 text-sm text-slate-200 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/15", className)} {...rest} />;
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "green" | "red" | "blue" | "amber"; className?: string }) {
  return <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide", {
    "border-white/10 bg-white/5 text-slate-400": tone === "neutral",
    "border-emerald-400/20 bg-emerald-400/10 text-emerald-300": tone === "green",
    "border-red-400/20 bg-red-400/10 text-red-300": tone === "red",
    "border-indigo-400/20 bg-indigo-400/10 text-indigo-300": tone === "blue",
    "border-amber-400/20 bg-amber-400/10 text-amber-300": tone === "amber",
  }, className)}>{children}</span>;
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-white/10 bg-[#141619]", className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
    <div>{eyebrow && <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.19em] text-indigo-300/80">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}</div>
    {action}
  </div>;
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
    {icon && <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-400">{icon}</div>}
    <h3 className="text-sm font-medium text-slate-100">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}
  </div>;
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200"><span>{message}</span>{retry && <Button size="sm" variant="danger" onClick={retry}>Try again</Button>}</div>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <div role="status" className="flex items-center gap-2 text-sm text-slate-500"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-300" />{label}</div>;
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ children, title, description, className }: { children: React.ReactNode; title: string; description?: string; className?: string }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[3px] data-[state=open]:animate-in" /><DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-[#181a1f] p-6 shadow-2xl focus:outline-none", className)}><div className="mb-5 flex items-start justify-between gap-3"><div><DialogPrimitive.Title className="text-base font-semibold text-white">{title}</DialogPrimitive.Title>{description && <DialogPrimitive.Description className="mt-1 text-sm leading-5 text-slate-400">{description}</DialogPrimitive.Description>}</div><DialogPrimitive.Close aria-label="Close dialog" className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white"><X size={17} /></DialogPrimitive.Close></div>{children}</DialogPrimitive.Content></DialogPrimitive.Portal>;
}
