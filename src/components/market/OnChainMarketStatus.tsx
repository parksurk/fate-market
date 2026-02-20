"use client";

import { useState, useEffect, useCallback } from "react";
import { type Market } from "@/types";
import { cn } from "@/lib/utils";

interface OnChainState {
  deployed: boolean;
  state?: string;
  totalPool?: number;
  yesPool?: number;
  noPool?: number;
  closeTime?: number;
  finalOutcome?: number;
  stateError?: string;
}

function getBaseScanUrl(address: string): string {
  const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet";
  const base = isMainnet
    ? "https://basescan.org"
    : "https://sepolia.basescan.org";
  return `${base}/address/${address}`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUsdc(raw: number): string {
  const val = raw / 1_000_000;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

const STATE_BADGES: Record<string, { bg: string; label: string }> = {
  created: { bg: "bg-neo-bg", label: "CREATED" },
  open: { bg: "bg-neo-lime", label: "OPEN" },
  closed: { bg: "bg-neo-yellow", label: "CLOSED" },
  proposed: { bg: "bg-neo-cyan", label: "PROPOSED" },
  final: { bg: "bg-neo-lime", label: "FINAL" },
  cancelled: { bg: "bg-neo-red text-white", label: "CANCELLED" },
};

export function OnChainMarketStatus({ market }: { market: Market }) {
  const [chainState, setChainState] = useState<OnChainState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!market.onchainAddress) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/markets/${market.id}/onchain`);
      const json = await res.json();
      if (json.success) {
        setChainState(json.data);
      } else {
        setError(json.error ?? "Failed to fetch on-chain state");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [market.id, market.onchainAddress]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  if (!market.onchainAddress) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface">
        <div className="border-b-3 border-neo-black bg-neo-cyan px-4 py-3">
          <h3 className="font-mono text-sm font-black uppercase tracking-wider">
            On-Chain Status
          </h3>
        </div>
        <div className="p-4 text-center font-mono text-sm text-neo-black/50">
          Not deployed on-chain
        </div>
      </div>
    );
  }

  if (loading && !chainState) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface">
        <div className="border-b-3 border-neo-black bg-neo-cyan px-4 py-3">
          <h3 className="font-mono text-sm font-black uppercase tracking-wider">
            On-Chain Status
          </h3>
        </div>
        <div className="space-y-3 p-4">
          <div className="h-4 w-3/4 animate-pulse bg-neo-bg" />
          <div className="h-4 w-1/2 animate-pulse bg-neo-bg" />
          <div className="h-6 w-full animate-pulse bg-neo-bg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface">
        <div className="border-b-3 border-neo-black bg-neo-cyan px-4 py-3">
          <h3 className="font-mono text-sm font-black uppercase tracking-wider">
            On-Chain Status
          </h3>
        </div>
        <div className="p-4 text-center">
          <p className="font-mono text-sm text-neo-red">{error}</p>
          <button
            onClick={fetchState}
            className="mt-2 border-2 border-neo-black bg-neo-yellow px-3 py-1 font-mono text-xs font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const state = chainState?.state ?? market.onchainStatus ?? "unknown";
  const badge = STATE_BADGES[state] ?? { bg: "bg-neo-bg", label: state.toUpperCase() };
  const totalPool = chainState?.totalPool ?? 0;
  const yesPool = chainState?.yesPool ?? 0;
  const noPool = chainState?.noPool ?? 0;
  const yesPercent = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noPercent = totalPool > 0 ? 100 - yesPercent : 50;

  return (
    <div className="border-3 border-neo-black bg-neo-surface">
      <div className="border-b-3 border-neo-black bg-neo-cyan px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider">
          On-Chain Status
        </h3>
      </div>
      <div className="space-y-3 p-4 font-mono text-sm">
        <div className="flex items-center justify-between">
          <span className="text-neo-black/60">State</span>
          <span
            className={cn(
              "border-2 border-neo-black px-2 py-0.5 text-xs font-bold",
              badge.bg
            )}
          >
            {badge.label}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neo-black/60">Contract</span>
          <a
            href={getBaseScanUrl(market.onchainAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-neo-blue hover:underline"
          >
            {truncateAddress(market.onchainAddress)}
          </a>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neo-black/60">Total Pool</span>
          <span className="font-bold">{formatUsdc(totalPool)} USDC</span>
        </div>

        {totalPool > 0 && (
          <>
            <div className="border-3 border-neo-black">
              <div className="flex h-6">
                <div
                  className="flex items-center justify-center bg-neo-lime font-mono text-[10px] font-bold"
                  style={{ width: `${Math.max(yesPercent, 10)}%` }}
                >
                  {yesPercent > 15 ? `YES ${yesPercent}%` : ""}
                </div>
                <div
                  className="flex items-center justify-center bg-neo-red font-mono text-[10px] font-bold text-white"
                  style={{ width: `${Math.max(noPercent, 10)}%` }}
                >
                  {noPercent > 15 ? `NO ${noPercent}%` : ""}
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-neo-black/60">
              <span>YES: {formatUsdc(yesPool)}</span>
              <span>NO: {formatUsdc(noPool)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
