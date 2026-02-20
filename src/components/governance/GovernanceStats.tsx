"use client";

import { useState, useEffect, useCallback } from "react";

interface DaoSettings {
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
}

function blocksToHuman(blocks: string): string {
  const n = Number(blocks);
  const hours = (n * 12) / 3600;
  if (hours >= 24) return `~${(hours / 24).toFixed(0)}d`;
  return `~${hours.toFixed(0)}h`;
}

function formatThreshold(raw: string): string {
  const val = Number(raw) / 1e18;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M sFATE`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K sFATE`;
  return `${val.toFixed(0)} sFATE`;
}

export function GovernanceStats() {
  const [settings, setSettings] = useState<DaoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/governance/settings");
      const json = await res.json();
      if (json.success) setSettings(json.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const items = settings
    ? [
        { label: "Voting Delay", value: blocksToHuman(settings.votingDelay) },
        { label: "Voting Period", value: blocksToHuman(settings.votingPeriod) },
        { label: "Proposal Threshold", value: formatThreshold(settings.proposalThreshold) },
      ]
    : [];

  return (
    <div className="border-3 border-neo-black bg-neo-surface">
      <div className="border-b-3 border-neo-black bg-neo-cyan px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider">
          DAO Settings
        </h3>
      </div>
      <div className="p-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 animate-pulse bg-neo-bg" />
            ))}
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-3 gap-4 font-mono text-sm">
            {items.map((item) => (
              <div key={item.label} className="border-2 border-neo-black p-3 text-center">
                <p className="text-xs text-neo-black/60">{item.label}</p>
                <p className="mt-1 font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center font-mono text-sm text-neo-black/50">
            Settings unavailable
          </p>
        )}
      </div>
    </div>
  );
}
