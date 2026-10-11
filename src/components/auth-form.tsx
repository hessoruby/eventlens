"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { authClient } from "@/components/auth-client";
import { Brand } from "@/components/brand";
import { Button, Input } from "@/components/ui";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) { setError(result.error.message || "Authentication failed. Please try again."); return; }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="flex min-h-screen flex-col bg-[#0e0f12]"><header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8"><Brand /><Link href="/docs" className="text-sm text-slate-400 hover:text-white">Documentation</Link></header><main className="flex flex-1 items-center justify-center px-5 pb-20 pt-8"><div className="w-full max-w-[410px]"><div className="mb-8 text-center"><div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-300/10 text-indigo-300"><LockKeyhole size={19} /></div><h1 className="text-2xl font-semibold tracking-tight text-white">{isSignUp ? "Create your workspace" : "Welcome back"}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{isSignUp ? "Start capturing requests in your own project." : "Sign in to inspect your projects and events."}</p></div><form onSubmit={submit} className="rounded-xl border border-white/10 bg-[#141619] p-6 shadow-xl shadow-black/10"><div className="space-y-4">{isSignUp && <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Name</span><Input autoComplete="name" minLength={1} maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>}<label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Email address</span><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">Password</span><Input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={isSignUp ? 10 : undefined} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignUp ? "At least 10 characters" : "Your password"} /></label></div>{error && <p role="alert" className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}<Button type="submit" variant="primary" className="mt-6 w-full" disabled={pending}>{pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}{!pending && <ArrowRight size={15} />}</Button></form><p className="mt-5 text-center text-sm text-slate-500">{isSignUp ? "Already have an account?" : "New to EventLens?"} <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="font-medium text-indigo-300 hover:text-indigo-200">{isSignUp ? "Sign in" : "Create an account"}</Link></p></div></main></div>;
}
