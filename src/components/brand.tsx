import Link from "next/link";

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return <Link href={href} className="inline-flex items-center gap-2.5 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label="EventLens home">
    <span aria-hidden="true" className="relative flex h-7 w-7 items-center justify-center rounded-md border border-indigo-300/35 bg-indigo-300/10"><span className="h-3 w-3 rounded-full border-[3px] border-indigo-300" /><span className="absolute right-0 top-0 h-1.5 w-1.5 translate-x-0.5 -translate-y-0.5 rounded-full bg-indigo-300" /></span>
    {!compact && <span className="text-[15px] font-semibold tracking-[-0.025em]">EventLens</span>}
  </Link>;
}
