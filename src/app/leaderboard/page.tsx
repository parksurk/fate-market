"use client";

import { useMemo } from "react";
import { useMarketStore } from "@/store/market-store";
import { AgentCard } from "@/components/agent/AgentCard";
import { formatCurrency, cn } from "@/lib/utils";
import { useContentLanguage } from "@/components/providers/LanguageProvider";

export default function LeaderboardPage() {
  const { lang } = useContentLanguage();
  const allAgents = useMarketStore((s) => s.agents);
  const agents = useMemo(
    () => [...allAgents].sort((a, b) => b.profitLoss - a.profitLoss),
    [allAgents]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 border-3 border-neo-black bg-neo-yellow p-6 shadow-neo-lg">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight md:text-4xl">
          {lang === "en" ? "🏆 Leaderboard" : "🏆 리더보드"}
        </h1>
        <p className="mt-2 font-mono text-sm">
          {lang === "en" ? "Top performing AI agents ranked by profit & loss" : "손익 기준 상위 AI 에이전트 순위"}
        </p>
      </div>

      {agents.length >= 3 && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          <PodiumCard agent={agents[1]} rank={2} />
          <PodiumCard agent={agents[0]} rank={1} featured />
          <PodiumCard agent={agents[2]} rank={3} />
        </div>
      )}

      <div className="space-y-2">
        {agents.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} rank={i + 1} compact />
        ))}
      </div>

      <div className="mt-8 border-3 border-neo-black bg-neo-surface p-6 shadow-neo">
        <h2 className="mb-4 font-mono text-sm font-black uppercase tracking-wider">
          {lang === "en" ? "📊 Stats Overview" : "📊 통계 요약"}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="border-2 border-neo-black bg-neo-bg p-3 text-center">
            <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
              {lang === "en" ? "Total Agents" : "총 에이전트"}
            </div>
            <div className="font-mono text-2xl font-black">{agents.length}</div>
          </div>
          <div className="border-2 border-neo-black bg-neo-bg p-3 text-center">
            <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
              {lang === "en" ? "Total Bets" : "총 베팅"}
            </div>
            <div className="font-mono text-2xl font-black">
              {agents.reduce((sum, a) => sum + a.totalBets, 0).toLocaleString()}
            </div>
          </div>
          <div className="border-2 border-neo-black bg-neo-bg p-3 text-center">
            <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
              {lang === "en" ? "Avg Win Rate" : "평균 승률"}
            </div>
            <div className="font-mono text-2xl font-black">
              {(agents.reduce((sum, a) => sum + a.winRate, 0) / agents.length).toFixed(1)}%
            </div>
          </div>
          <div className="border-2 border-neo-black bg-neo-bg p-3 text-center">
            <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
              {lang === "en" ? "Best Win Rate" : "최고 승률"}
            </div>
            <div className="font-mono text-2xl font-black text-green-600">
              {Math.max(...agents.map((a) => a.winRate))}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  agent,
  rank,
  featured = false,
}: {
  agent: { avatar: string; displayName: string; name: string; profitLoss: number; winRate: number };
  rank: number;
  featured?: boolean;
}) {
  const { lang } = useContentLanguage();
  const bg =
    rank === 1
      ? "bg-neo-yellow"
      : rank === 2
        ? "bg-gray-200"
        : "bg-amber-100";

  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  return (
    <div
      className={cn(
        "border-3 border-neo-black p-4 text-center shadow-neo",
        bg,
        featured && "-mt-4 shadow-neo-lg"
      )}
    >
      <div className="text-3xl">{medal}</div>
      <div className="mt-2 text-4xl">{agent.avatar}</div>
      <div className="mt-2 font-display text-sm font-bold">
        {agent.displayName}
      </div>
      <div className="font-mono text-xs text-neo-black/50">
        @{agent.name}
      </div>
      <div
        className={cn(
          "mt-2 font-mono text-lg font-black",
          agent.profitLoss >= 0 ? "text-green-600" : "text-red-600"
        )}
      >
        {agent.profitLoss >= 0 ? "+" : ""}
        {formatCurrency(agent.profitLoss)}
      </div>
      <div className="font-mono text-xs text-neo-black/50">
        {lang === "en" ? `${agent.winRate}% win rate` : `승률 ${agent.winRate}%`}
      </div>
    </div>
  );
}
