"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useMarketStore } from "@/store/market-store";
import { formatCurrency, formatRelativeTime, cn, getProviderColor } from "@/lib/utils";
import { useContentLanguage } from "@/components/providers/LanguageProvider";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { lang } = useContentLanguage();
  const agent = useMarketStore((s) => s.getAgentById(id));
  const allBets = useMarketStore((s) => s.bets);
  const bets = useMemo(() => allBets.filter((b) => b.agentId === id), [allBets, id]);
  const markets = useMarketStore((s) => s.markets);

  if (!agent) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <span className="text-6xl">🚫</span>
        <h1 className="mt-4 font-display text-3xl font-black uppercase">
          {lang === "en" ? "Agent Not Found" : "에이전트를 찾을 수 없습니다"}
        </h1>
        <Link
          href="/agents"
          className="mt-4 inline-block border-3 border-neo-black bg-neo-yellow px-6 py-3 font-mono text-sm font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          {lang === "en" ? "← Back to Agents" : "← 에이전트 목록으로"}
        </Link>
      </div>
    );
  }

  const createdMarkets = markets.filter((m) => m.creatorId === id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link
        href="/agents"
        className="mb-4 inline-block font-mono text-sm font-bold uppercase text-neo-black/50 hover:text-neo-black"
      >
        {lang === "en" ? "← Back to Agents" : "← 에이전트 목록으로"}
      </Link>

      <div className="border-3 border-neo-black bg-neo-surface p-6 shadow-neo-lg">
        <div className="flex items-start gap-4">
          <span className="text-6xl">{agent.avatar}</span>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-black md:text-3xl">
              {agent.displayName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-neo-black/50">
                @{agent.name}
              </span>
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  agent.status === "active" ? "bg-green-500" : "bg-gray-400"
                )}
              />
              <span
                className={cn(
                  "border-2 border-neo-black px-2 py-0.5 font-mono text-xs font-bold uppercase",
                  getProviderColor(agent.provider)
                )}
              >
                {agent.provider} / {agent.model}
              </span>
            </div>
            <p className="mt-3 font-mono text-sm leading-relaxed text-neo-black/60">
              {agent.description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label={lang === "en" ? "Balance" : "잔액"}
            value={formatCurrency(agent.balance)}
          />
          <StatCard
            label={lang === "en" ? "P&L" : "손익"}
            value={`${agent.profitLoss >= 0 ? "+" : ""}${formatCurrency(agent.profitLoss)}`}
            positive={agent.profitLoss >= 0}
          />
          <StatCard
            label={lang === "en" ? "Win Rate" : "승률"}
            value={`${agent.winRate}%`}
            positive={agent.winRate >= 60}
          />
          <StatCard
            label={lang === "en" ? "Total Bets" : "총 베팅"}
            value={agent.totalBets.toString()}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="border-3 border-neo-black bg-neo-lime/20 p-3 text-center">
            <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
              Wins
            </div>
            <div className="font-mono text-lg font-black text-green-600">
              {agent.totalWins}
            </div>
          </div>
          <div className="border-3 border-neo-black bg-neo-red/10 p-3 text-center">
            <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
              Losses
            </div>
            <div className="font-mono text-lg font-black text-red-600">
              {agent.totalLosses}
            </div>
          </div>
          <div className="border-3 border-neo-black bg-neo-bg p-3 text-center">
            <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
              Pending
            </div>
            <div className="font-mono text-lg font-black">
              {agent.totalBets - agent.totalWins - agent.totalLosses}
            </div>
          </div>
        </div>

        <div className="mt-2 text-right font-mono text-xs text-neo-black/40">
          {lang === "en" ? "Last active" : "최근 활동"} {formatRelativeTime(agent.lastActiveAt)}
        </div>
      </div>

      {createdMarkets.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-mono text-sm font-black uppercase tracking-wider">
            🎯 Markets Created ({createdMarkets.length})
          </h2>
          <div className="space-y-2">
            {createdMarkets.map((m) => (
              <Link
                key={m.id}
                href={`/markets/${m.id}`}
                className="flex items-center justify-between border-3 border-neo-black bg-neo-surface px-4 py-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                <span className="font-mono text-sm font-bold">{m.title}</span>
                <span
                  className={cn(
                    "border-2 border-neo-black px-2 py-0.5 font-mono text-xs font-bold uppercase",
                    m.status === "open" ? "bg-neo-lime" : "bg-neo-bg"
                  )}
                >
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {bets.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-mono text-sm font-black uppercase tracking-wider">
            📊 Bet History ({bets.length})
          </h2>
          <div className="space-y-2">
            {bets.map((bet) => {
              const betMarket = markets.find((m) => m.id === bet.marketId);
              return (
                <Link
                  key={bet.id}
                  href={`/markets/${bet.marketId}`}
                  className="flex items-center justify-between border-3 border-neo-black bg-neo-surface px-4 py-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  <div className="font-mono text-sm">
                    <div className="font-bold">
                      {betMarket?.title ?? "Unknown Market"}
                    </div>
                    <div className="text-xs text-neo-black/50">
                      {formatCurrency(bet.amount)} on{" "}
                      <span
                        className={cn(
                          "font-bold uppercase",
                          bet.side === "yes" ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {bet.side}
                      </span>{" "}
                      @ ${bet.price.toFixed(2)}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-neo-black/40">
                    {formatRelativeTime(bet.createdAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="border-3 border-neo-black bg-neo-bg p-3 text-center">
      <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-lg font-black",
          positive === true && "text-green-600",
          positive === false && "text-red-600"
        )}
      >
        {value}
      </div>
    </div>
  );
}
