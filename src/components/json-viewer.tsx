"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/components/data";
import { Button } from "@/components/ui";

export function JsonViewer({ value, text, label = "Payload" }: { value?: unknown; text?: string | null; label?: string }) {
  const content = value !== undefined && value !== null ? JSON.stringify(value, null, 2) : text || "";
  const lines = content.split("\n");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    try { await copyText(content); setCopied(true); setError(""); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError("Clipboard access failed. Select the text to copy it manually."); }
  }

  return <div className="overflow-hidden rounded-md border border-white/10 bg-[#101216]"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="font-mono text-[11px] text-slate-500">{label}</span><Button size="sm" variant="ghost" onClick={copy} disabled={!content}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</Button></div>{error && <p role="alert" className="px-4 pt-2 text-xs text-red-300">{error}</p>}{content ? <div className="max-h-[560px] overflow-auto py-3 font-mono text-xs leading-6"><pre><code>{lines.map((line, index) => <span key={index} className="flex min-w-max pr-5"><span aria-hidden="true" className="sticky left-0 mr-5 w-12 shrink-0 border-r border-white/[.06] bg-[#101216] pr-3 text-right text-slate-700 select-none">{index + 1}</span><span className="whitespace-pre text-slate-300">{value !== undefined && value !== null ? colorize(line) : line}</span></span>)}</code></pre></div> : <p className="p-5 text-sm text-slate-500">No body was sent with this request.</p>}</div>;
}

function colorize(line: string) {
  const parts = line.split(/("(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/g);
  let cursor = 0;
  return parts.map((part, index) => {
    const position = line.indexOf(part, cursor);
    cursor = position + part.length;
    const key = part.startsWith('"') && line.slice(cursor).trimStart().startsWith(":");
    const className = key ? "text-indigo-300" : part.startsWith('"') ? "text-emerald-300" : /^(true|false|null|-?\d)/.test(part) ? "text-amber-300" : "text-slate-400";
    return <span key={index} className={className}>{part}</span>;
  });
}
