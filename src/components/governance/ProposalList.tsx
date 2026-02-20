"use client";

import { useState, useEffect, useCallback } from "react";
import { type GovernanceProposal, type ProposalStatus } from "@/types";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  pending: "bg-neo-bg",
  active: "bg-neo-lime",
  defeated: "bg-neo-red text-white",
  succeeded: "bg-neo-cyan",
  queued: "bg-neo-yellow",
  executed: "bg-neo-blue text-white",
  cancelled: "bg-neo-bg text-neo-black/50",
  expired: "bg-neo-bg text-neo-black/50",
};

function formatVotes(raw: string): string {
  const val = Number(raw) / 1e18;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  if (val === 0) return "0";
  return val.toFixed(0);
}

export function ProposalList() {
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/governance/proposals");
      const json = await res.json();
      if (json.success) {
        setProposals(json.data);
      } else {
        setError(json.error ?? "Failed to load proposals");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return (
    <div className="border-3 border-neo-black bg-neo-surface">
      <div className="border-b-3 border-neo-black bg-neo-purple px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider text-white">
          Governance Proposals
        </h3>
      </div>

      {loading && (
        <div className="space-y-3 p-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-neo-bg" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 text-center">
          <p className="font-mono text-sm text-neo-red">{error}</p>
          <button
            onClick={fetchProposals}
            className="mt-2 border-2 border-neo-black bg-neo-yellow px-3 py-1 font-mono text-xs font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && proposals.length === 0 && (
        <div className="p-4 text-center font-mono text-sm text-neo-black/50">
          No proposals yet
        </div>
      )}

      {!loading && !error && proposals.length > 0 && (
        <div className="divide-y-2 divide-neo-black">
          {proposals.map((p) => {
            const forNum = Number(p.forVotes) / 1e18;
            const againstNum = Number(p.againstVotes) / 1e18;
            const total = forNum + againstNum;
            const forPercent = total > 0 ? Math.round((forNum / total) * 100) : 50;

            return (
              <div key={p.id} className="space-y-2 p-4 font-mono text-sm">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="flex-1 font-bold">{p.title}</h4>
                  <span
                    className={`shrink-0 border-2 border-neo-black px-2 py-0.5 text-xs font-bold uppercase ${
                      STATUS_STYLES[p.status]
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-neo-black/60 line-clamp-2">
                  {p.description}
                </p>
                {total > 0 && (
                  <div className="border-2 border-neo-black">
                    <div className="flex h-4">
                      <div
                        className="bg-neo-lime"
                        style={{ width: `${Math.max(forPercent, 5)}%` }}
                      />
                      <div
                        className="bg-neo-red"
                        style={{ width: `${Math.max(100 - forPercent, 5)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-neo-black/60">
                  <span>For: {formatVotes(p.forVotes)}</span>
                  <span>Against: {formatVotes(p.againstVotes)}</span>
                  <span>Abstain: {formatVotes(p.abstainVotes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
