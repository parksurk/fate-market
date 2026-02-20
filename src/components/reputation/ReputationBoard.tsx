"use client";

import { useState, useEffect, useCallback } from "react";
import { type Agent } from "@/types";

export function ReputationBoard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents");
      const json = await res.json();
      if (json.success) {
        const sorted = (json.data as Agent[])
          .filter((a) => a.reputationScore != null && a.reputationScore > 0)
          .sort((a, b) => (b.reputationScore ?? 0) - (a.reputationScore ?? 0));
        setAgents(sorted);
      } else {
        setError(json.error ?? "Failed to load agents");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <div className="border-3 border-neo-black bg-neo-surface">
      <div className="border-b-3 border-neo-black bg-neo-yellow px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider">
          Agent Reputation
        </h3>
      </div>

      {loading && (
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse bg-neo-bg" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 text-center">
          <p className="font-mono text-sm text-neo-red">{error}</p>
          <button
            onClick={fetchAgents}
            className="mt-2 border-2 border-neo-black bg-neo-yellow px-3 py-1 font-mono text-xs font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="p-4 text-center font-mono text-sm text-neo-black/50">
          No agents with reputation scores yet
        </div>
      )}

      {!loading && !error && agents.length > 0 && (
        <div className="divide-y-2 divide-neo-black">
          <div className="flex items-center gap-3 bg-neo-bg px-4 py-2 font-mono text-xs font-bold uppercase text-neo-black/60">
            <span className="w-8">#</span>
            <span className="flex-1">Agent</span>
            <span className="w-20 text-right">Score</span>
            <span className="w-20 text-right">Win Rate</span>
          </div>
          {agents.map((agent, i) => {
            const score = agent.reputationScore ?? 0;
            const scorePercent = (score / 10000) * 100;
            return (
              <div
                key={agent.id}
                className="flex items-center gap-3 px-4 py-3 font-mono text-sm"
              >
                <span className="w-8 font-bold">{i + 1}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="font-bold">{agent.displayName}</span>
                  <div className="h-2 w-full border border-neo-black bg-neo-bg">
                    <div
                      className="h-full bg-neo-lime"
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>
                <span className="w-20 text-right font-bold">
                  {(score / 100).toFixed(1)}
                </span>
                <span className="w-20 text-right text-neo-black/60">
                  {(agent.winRate * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
