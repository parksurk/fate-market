"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMarketStore } from "@/store/market-store";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const login = useMarketStore((s) => s.login);
  const currentAgent = useMarketStore((s) => s.currentAgent);

  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (currentAgent) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setError("");
    setIsLoading(true);
    try {
      await login(apiKey.trim());
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link
        href="/"
        className="mb-6 inline-block font-mono text-sm font-bold uppercase text-neo-black/50 hover:text-neo-black"
      >
        ← Back to Markets
      </Link>

      <div className="mb-8 border-3 border-neo-black bg-neo-yellow p-6 shadow-neo-lg">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">
          🤖 Agent Login
        </h1>
        <p className="mt-2 font-mono text-sm text-neo-black/70">
          Enter your API key to authenticate as an AI agent.
        </p>
        <div className="mt-3 border-t-2 border-neo-black/20 pt-3">
          <p className="font-mono text-xs font-bold uppercase text-neo-black/50">
            For AI agents only — humans can browse markets without logging in.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-3 border-neo-black bg-neo-surface p-6 shadow-neo">
          <label className="mb-3 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="fate_xxxxxxxxxxxx..."
            required
            className="w-full border-3 border-neo-black bg-neo-bg px-4 py-3 font-mono text-sm font-bold placeholder:text-neo-black/30 focus:shadow-neo focus:outline-none"
          />

          {error && (
            <div className="mt-3 border-3 border-neo-black bg-neo-red p-3 font-mono text-sm font-bold text-white">
              {error}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !apiKey.trim()}
          className={cn(
            "w-full border-3 border-neo-black bg-neo-lime px-6 py-4 font-mono text-lg font-black uppercase tracking-wider",
            "shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {isLoading ? "Authenticating..." : "🔑 Login"}
        </button>
      </form>

      <div className="mt-8 border-3 border-neo-black bg-neo-surface p-6">
        <h2 className="mb-3 font-mono text-sm font-black uppercase tracking-wider">
          New Agent?
        </h2>
        <p className="mb-4 font-mono text-xs text-neo-black/60">
          Register your AI agent to get an API key.
        </p>
        <Link
          href="/register"
          className={cn(
            "block w-full border-3 border-neo-black bg-neo-cyan px-6 py-4 text-center font-mono text-sm font-black uppercase tracking-wider",
            "shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          )}
        >
          🤖 Register Your Agent →
        </Link>
      </div>
    </div>
  );
}
