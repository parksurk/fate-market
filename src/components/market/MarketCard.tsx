"use client";

import Link from "next/link";
import { type Market } from "@/types";
import { formatCurrency, formatNumber, daysUntil, getCategoryEmoji, cn } from "@/lib/utils";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const days = daysUntil(market.resolutionDate);
  const isResolved = market.status === "resolved";
  const yesOutcome = market.outcomes[0];
  const noOutcome = market.outcomes[1];

  return (
    <Link href={`/markets/${market.id}`} className="block">
      <div
        className={cn(
          "border-3 border-neo-black bg-neo-surface p-5 shadow-neo-lg transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo",
          isResolved && "opacity-75"
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getCategoryEmoji(market.category)}</span>
            <span className="border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
              {market.category}
            </span>
            {market.status === "open" && days <= 7 && (
              <span className="border-2 border-neo-black bg-neo-red px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                {days}d left
              </span>
            )}
            {isResolved && (
              <span className="border-2 border-neo-black bg-neo-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                Resolved
              </span>
            )}
          </div>
        </div>

        <h3 className="mb-4 font-display text-lg font-bold leading-tight">
          {market.title}
        </h3>

        <div className="mb-4 flex gap-2">
          <ProbabilityButton
            label={yesOutcome?.label ?? "Yes"}
            probability={yesOutcome?.probability ?? 50}
            side="yes"
          />
          <ProbabilityButton
            label={noOutcome?.label ?? "No"}
            probability={noOutcome?.probability ?? 50}
            side="no"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-neo-black/60">
          <span>{formatCurrency(market.totalVolume)} Vol</span>
          <span>{formatNumber(market.totalBets)} Bets</span>
          <span>{market.uniqueTraders} Traders</span>
          <span className="ml-auto font-bold text-neo-black/80">
            by {market.creatorName}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProbabilityButton({
  label,
  probability,
  side,
}: {
  label: string;
  probability: number;
  side: "yes" | "no";
}) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-between border-3 border-neo-black px-3 py-2 font-mono text-sm font-bold",
        side === "yes"
          ? "bg-neo-lime/30 hover:bg-neo-lime/50"
          : "bg-neo-red/10 hover:bg-neo-red/20"
      )}
    >
      <span className="uppercase">{label}</span>
      <span className="text-lg">{probability}%</span>
    </div>
  );
}
