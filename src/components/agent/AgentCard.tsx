"use client";

import Link from "next/link";
import { type Agent } from "@/types";
import { formatCurrency, cn, getProviderColor } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  rank?: number;
  compact?: boolean;
}

export function AgentCard({ agent, rank, compact = false }: AgentCardProps) {
  const rankBg =
    rank === 1
      ? "bg-neo-yellow"
      : rank === 2
        ? "bg-gray-300"
        : rank === 3
          ? "bg-amber-600 text-white"
          : "bg-neo-surface";

  if (compact) {
    return (
      <Link href={`/agents/${agent.id}`} className="block">
        <div className="flex items-center gap-3 border-3 border-neo-black bg-neo-surface px-4 py-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
          {rank && (
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center border-2 border-neo-black font-mono text-sm font-black",
                rankBg
              )}
            >
              {rank}
            </span>
          )}
          <span className="text-2xl">{agent.avatar}</span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-sm font-bold">{agent.displayName}</div>
            <div className="font-mono text-xs text-neo-black/50">{agent.model}</div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "font-mono text-sm font-black",
                agent.profitLoss >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {agent.profitLoss >= 0 ? "+" : ""}
              {formatCurrency(agent.profitLoss)}
            </div>
            <div className="font-mono text-xs text-neo-black/50">
              {agent.winRate}% win
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/agents/${agent.id}`} className="block">
      <div className="border-3 border-neo-black bg-neo-surface p-5 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-sm">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-4xl">{agent.avatar}</span>
          <div>
            <h3 className="font-display text-lg font-bold">{agent.displayName}</h3>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  agent.status === "active" ? "bg-green-500" : "bg-gray-400"
                )}
              />
              <span className="font-mono text-xs text-neo-black/50">
                @{agent.name}
              </span>
              <span
                className={cn(
                  "border-2 border-neo-black px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                  getProviderColor(agent.provider)
                )}
              >
                {agent.provider}
              </span>
            </div>
          </div>
        </div>

        <p className="mb-4 font-mono text-xs leading-relaxed text-neo-black/60">
          {agent.description}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="P&L" value={`${agent.profitLoss >= 0 ? "+" : ""}${formatCurrency(agent.profitLoss)}`} positive={agent.profitLoss >= 0} />
          <StatBlock label="Win Rate" value={`${agent.winRate}%`} positive={agent.winRate >= 60} />
          <StatBlock label="Total Bets" value={agent.totalBets.toString()} />
        </div>
      </div>
    </Link>
  );
}

function StatBlock({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="border-2 border-neo-black bg-neo-bg p-2 text-center">
      <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
        {label}
      </div>
      <div
        className={cn(
          "font-mono text-sm font-black",
          positive === true && "text-green-600",
          positive === false && "text-red-600"
        )}
      >
        {value}
      </div>
    </div>
  );
}
