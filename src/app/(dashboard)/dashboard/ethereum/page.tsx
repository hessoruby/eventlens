"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Copy, Search, Workflow } from "lucide-react";
import { Badge, Button, EmptyState, ErrorNotice, Input, PageHeader, Panel, Spinner } from "@/components/ui";
import type { TransactionDetails } from "@/lib/ethereum";

type TransactionResponse = { transaction?: TransactionDetails; error?: { message?: string } };

export default function EthereumInspectorPage() {
  const [hash, setHash] = useState("");
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const pending = useRef<AbortController | null>(null);

  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanHash = hash.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanHash)) {
      setTransaction(null);
      setError("Enter a 0x-prefixed transaction hash with exactly 64 hexadecimal characters.");
      return;
    }

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setError("");
    setLoading(true);
    setTransaction(null);

    try {
      const response = await fetch(`/api/tx?hash=${encodeURIComponent(cleanHash)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as TransactionResponse;
      if (!response.ok || !payload.transaction) {
        throw new Error(payload.error?.message ?? "The transaction could not be inspected.");
      }
      setTransaction(payload.transaction);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "The transaction could not be inspected.");
      }
    } finally {
      if (pending.current === controller) setLoading(false);
    }
  }

  async function copy(value: string, name: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(name);
      window.setTimeout(() => setCopied((current) => (current === name ? "" : current)), 1800);
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  }

  return <>
    <PageHeader
      eyebrow="Ethereum / mainnet"
      title="Transaction inspector"
      description="Inspect a confirmed or pending mainnet transaction and decode standard ERC-20 Transfer logs. Read-only; no wallet connection required."
    />

    <Panel className="mb-7 p-4 sm:p-6">
      <form onSubmit={inspect} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="transaction-hash" className="mb-2 block text-xs font-medium text-slate-300">Transaction hash</label>
          <Input
            id="transaction-hash"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={hash}
            onChange={(event) => setHash(event.target.value)}
            placeholder="0x…"
            className="font-mono text-xs sm:text-sm"
            aria-describedby="hash-help"
            required
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading} className="shrink-0">
          <Search size={15} /> {loading ? "Inspecting…" : "Inspect transaction"}
        </Button>
      </form>
      <p id="hash-help" className="mt-3 text-xs leading-5 text-slate-500">Queries the configured Ethereum mainnet RPC. The hash is never used as a URL.</p>
    </Panel>

    {error && <div className="mb-6"><ErrorNotice message={error} /></div>}
    {loading && <Panel className="p-6"><Spinner label="Fetching transaction and receipt from Ethereum mainnet" /></Panel>}
    {!loading && !transaction && !error && <Panel><EmptyState icon={<Workflow size={20} />} title="Ready to inspect" description="Paste any Ethereum mainnet transaction hash to view its receipt, emitted logs, and decoded token transfers." /></Panel>}

    {transaction && !loading && <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Status" value={<Badge tone={transaction.status === "success" ? "green" : transaction.status === "reverted" ? "red" : "amber"}>{transaction.status}</Badge>} />
        <Stat label="Value" value={`${transaction.valueEth} ETH`} />
        <Stat label="Block" value={transaction.blockNumber ?? "Pending"} />
        <Stat label="Gas used" value={transaction.gasUsed ?? "Pending"} />
      </div>

      <Panel className="overflow-hidden">
        <SectionHeader title="Transaction" meta={<a href={`https://etherscan.io/tx/${transaction.hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200">View on Etherscan <ArrowUpRight size={13} /></a>} />
        <div className="divide-y divide-white/[.07]">
          <DataRow label="Hash"><Copyable value={transaction.hash} name="hash" copied={copied} onCopy={copy} /></DataRow>
          <DataRow label="From"><Copyable value={transaction.from} name="from" copied={copied} onCopy={copy} /></DataRow>
          <DataRow label="To"><Copyable value={transaction.to ?? "Contract creation"} name="to" copied={copied} onCopy={transaction.to ? copy : undefined} /></DataRow>
          <DataRow label="Value in wei"><span className="font-mono text-xs text-slate-300">{transaction.valueWei}</span></DataRow>
          <DataRow label="Gas price"><span className="font-mono text-xs text-slate-300">{transaction.gasPriceGwei ? `${transaction.gasPriceGwei} gwei` : "Unavailable"}</span></DataRow>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <SectionHeader title="ERC-20 transfers" meta={<span className="font-mono text-xs text-slate-500">{transaction.erc20Transfers.length} decoded</span>} />
        {transaction.erc20Transfers.length === 0 ? <EmptyState title="No standard ERC-20 transfers" description="The receipt contains no three-topic Transfer logs with a 32-byte value." /> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="border-b border-white/10 bg-white/[.025] font-mono uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Log</th><th className="px-5 py-3 font-medium">Token contract</th><th className="px-5 py-3 font-medium">From → To</th><th className="px-5 py-3 text-right font-medium">Raw units</th></tr></thead><tbody className="divide-y divide-white/[.07]">{transaction.erc20Transfers.map((transfer, index) => <tr key={`${transfer.logIndex}-${index}`} className="text-slate-300"><td className="px-5 py-4 font-mono text-slate-500">{transfer.logIndex ?? "—"}</td><td className="px-5 py-4 font-mono">{shortAddress(transfer.tokenAddress)}</td><td className="px-5 py-4 font-mono">{shortAddress(transfer.from)} <span className="text-slate-600">→</span> {shortAddress(transfer.to)}</td><td className="px-5 py-4 text-right font-mono tabular-nums">{transfer.valueRaw}</td></tr>)}</tbody></table><p className="border-t border-white/[.07] px-5 py-3 text-xs text-slate-500">Raw units are shown because token decimals are not fetched.</p></div>}
      </Panel>

      <Panel className="overflow-hidden">
        <SectionHeader title="Receipt logs" meta={<span className="font-mono text-xs text-slate-500">{transaction.logs.length} emitted</span>} />
        {transaction.logs.length === 0 ? <EmptyState title="No receipt logs" description={transaction.status === "pending" ? "Logs will be available after the transaction is included in a block." : "This transaction emitted no logs."} /> : <div className="divide-y divide-white/[.07]">{transaction.logs.map((log, index) => <details key={`${log.logIndex}-${index}`} className="group px-5 py-4 open:bg-white/[.02]"><summary className="flex cursor-pointer list-none items-center gap-3 text-xs text-slate-300 marker:hidden"><span className="w-10 shrink-0 font-mono text-slate-500">#{log.logIndex ?? index}</span><span className="min-w-0 flex-1 truncate font-mono">{log.address}</span><span className="text-slate-600 group-open:rotate-90">›</span></summary><div className="mt-4 space-y-3 border-t border-white/[.07] pt-4"><div><p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-slate-500">Topics</p>{log.topics.map((topic, topicIndex) => <pre key={topicIndex} className="overflow-x-auto py-0.5 text-xs text-slate-300">{topic}</pre>)}</div><div><p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-slate-500">Data</p><pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded border border-white/[.07] bg-black/20 p-3 text-xs leading-5 text-slate-300">{log.data}</pre></div></div></details>)}</div>}
      </Panel>
    </div>}
  </>;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <Panel className="min-w-0 px-5 py-4"><p className="font-mono text-[11px] uppercase tracking-[.11em] text-slate-500">{label}</p><div className="mt-4 truncate text-lg font-semibold leading-none text-white">{value}</div></Panel>;
}

function SectionHeader({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4"><h2 className="text-sm font-semibold text-slate-100">{title}</h2>{meta}</div>;
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1 px-5 py-3.5 text-xs sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-5"><span className="text-slate-500">{label}</span><div className="min-w-0">{children}</div></div>;
}

function Copyable({ value, name, copied, onCopy }: { value: string; name: string; copied: string; onCopy?: (value: string, name: string) => void }) {
  return <div className="flex min-w-0 items-center gap-2"><span className="min-w-0 break-all font-mono text-slate-300">{value}</span>{onCopy && <button type="button" aria-label={`Copy ${name}`} title={`Copy ${name}`} onClick={() => onCopy(value, name)} className="shrink-0 rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white">{copied === name ? <Check size={14} /> : <Copy size={14} />}</button>}</div>;
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}
