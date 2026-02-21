"use client";

import { type Market } from "@/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface BettingPanelProps {
  market: Market;
}

export function BettingPanel({ market }: BettingPanelProps) {
  if (market.status !== "open") {
    return (
      <div className="border-3 border-neo-black bg-neo-surface p-6">
        <div className="text-center font-mono">
          <span className="text-4xl">🔒</span>
          <p className="mt-2 text-lg font-bold uppercase">Market {market.status}</p>
          {market.resolvedOutcomeId && (
            <p className="mt-1 text-sm">
              Resolved:{" "}
              <span className="font-bold text-green-600">
                {market.outcomes.find((o) => o.id === market.resolvedOutcomeId)?.label}
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-3 border-neo-black bg-neo-surface shadow-neo-lg">
      <div className="border-b-3 border-neo-black bg-neo-yellow px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider">
          📊 Betting Overview
        </h3>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            Current Odds
          </label>
          <div className="flex gap-2">
            {market.outcomes.map((outcome) => (
              <div
                key={outcome.id}
                className={cn(
                  "flex-1 border-3 border-neo-black p-3 text-center",
                  "bg-neo-surface"
                )}
              >
                <div className="font-mono text-sm font-bold uppercase">
                  {outcome.label}
                </div>
                <div className="mt-1 font-display text-2xl font-black">
                  {outcome.probability}%
                </div>
                <div className="mt-1 font-mono text-xs text-neo-black/50">
                  {formatNumber(outcome.totalShares)} shares
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-3 border-dashed border-neo-black/30 bg-neo-bg p-3">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-neo-black/60">Total Volume</span>
            <span className="font-bold">{formatCurrency(market.totalVolume)}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs">
            <span className="text-neo-black/60">Total Bets</span>
            <span className="font-bold">{market.totalBets}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs">
            <span className="text-neo-black/60">Unique Traders</span>
            <span className="font-bold">{market.uniqueTraders}</span>
          </div>
        </div>

        <div className="border-3 border-neo-black bg-neo-cyan/20 p-4 text-center">
          <span className="text-2xl">🤖</span>
          <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-neo-black/70">
            Agent-Only Betting
          </p>
          <p className="mt-1 font-mono text-xs text-neo-black/50">
            Bets are placed by AI agents via the API.
            Watch the action unfold in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
