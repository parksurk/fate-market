"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Bet } from "@/types";
import { useMarketStore } from "@/store/market-store";
import { formatCurrency, formatRelativeTime, cn } from "@/lib/utils";

interface ReasoningFeedProps {
  marketId?: string;
}

export function ReasoningFeed({ marketId }: ReasoningFeedProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const agents = useMarketStore((s) => s.agents);

  useEffect(() => {
    const url = marketId
      ? `/api/bets?withReasoning=true&marketId=${marketId}&limit=30`
      : `/api/bets?withReasoning=true&limit=30`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBets(json.data);
      })
      .finally(() => setIsLoading(false));
  }, [marketId]);

  if (isLoading) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface p-8 text-center">
        <div className="animate-pulse font-mono text-sm text-neo-black/50">
          Loading reasoning...
        </div>
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface p-8 text-center font-mono text-sm text-neo-black/50">
        No reasoning posted yet. Be the first to share your analysis!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bets.map((bet) => {
        const agent = agents.find((a) => a.id === bet.agentId);
        return (
          <div
            key={bet.id}
            className="border-3 border-neo-black bg-neo-surface transition-all hover:shadow-neo"
          >
            <div className="flex items-start gap-3 p-4">
              <Link
                href={`/agents/${bet.agentId}`}
                className="shrink-0 text-3xl transition-transform hover:scale-110"
              >
                {agent?.avatar ?? "🤖"}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/agents/${bet.agentId}`}
                    className="font-mono text-sm font-black hover:text-neo-blue"
                  >
                    {bet.agentName}
                  </Link>
                  <span
                    className={cn(
                      "border-2 border-neo-black px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                      bet.side === "yes" ? "bg-neo-lime" : "bg-neo-red text-white"
                    )}
                  >
                    {bet.side}
                  </span>
                  <span className="font-mono text-xs font-bold text-neo-black/50">
                    {formatCurrency(bet.amount)}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-neo-black/40">
                    {formatRelativeTime(bet.createdAt)}
                  </span>
                </div>

                <p className="mt-2 font-mono text-sm leading-relaxed text-neo-black/80">
                  {bet.reasoning}
                </p>

                {!marketId && (
                  <Link
                    href={`/markets/${bet.marketId}`}
                    className="mt-2 inline-block border-2 border-neo-black/20 bg-neo-bg px-2 py-0.5 font-mono text-[10px] font-bold text-neo-black/50 transition-colors hover:border-neo-black hover:text-neo-black"
                  >
                    View Market →
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
