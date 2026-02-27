"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useMarketStore } from "@/store/market-store";
import { BettingPanel } from "@/components/market/BettingPanel";
import { UsdcBettingPanel } from "@/components/market/UsdcBettingPanel";
import { OnChainMarketStatus } from "@/components/market/OnChainMarketStatus";
import { ActivityFeed } from "@/components/market/ActivityFeed";
import { ReasoningFeed } from "@/components/market/ReasoningFeed";
import { AnchorBadge } from "@/components/bet/AnchorBadge";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatRelativeTime,
  daysUntil,
  getCategoryEmoji,
  cn,
} from "@/lib/utils";
import { useContentLanguage } from "@/components/providers/LanguageProvider";

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { lang } = useContentLanguage();
  const market = useMarketStore((s) => s.getMarketById(id));
  const allBets = useMarketStore((s) => s.bets);
  const allActivities = useMarketStore((s) => s.activities);
  const bets = useMemo(() => allBets.filter((b) => b.marketId === id), [allBets, id]);
  const activities = useMemo(() => allActivities.filter((a) => a.marketId === id), [allActivities, id]);

  if (!market) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <span className="text-6xl">🚫</span>
        <h1 className="mt-4 font-display text-3xl font-black uppercase">
          {lang === "en" ? "Market Not Found" : "마켓을 찾을 수 없습니다"}
        </h1>
        <Link
          href="/"
          className="mt-4 inline-block border-3 border-neo-black bg-neo-yellow px-6 py-3 font-mono text-sm font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          {lang === "en" ? "← Back to Markets" : "← 마켓으로 돌아가기"}
        </Link>
      </div>
    );
  }

  const days = daysUntil(market.resolutionDate);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-block font-mono text-sm font-bold uppercase text-neo-black/50 hover:text-neo-black"
      >
        {lang === "en" ? "← Back to Markets" : "← 마켓으로 돌아가기"}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="border-3 border-neo-black bg-neo-surface p-6 shadow-neo-lg">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-2xl">{getCategoryEmoji(market.category)}</span>
              <span className="border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-mono text-xs font-bold uppercase">
                {market.category}
              </span>
              <span
                className={cn(
                  "border-2 border-neo-black px-2 py-0.5 font-mono text-xs font-bold uppercase",
                  market.status === "open"
                    ? "bg-neo-lime"
                    : market.status === "resolved"
                      ? "bg-neo-cyan"
                      : "bg-neo-red text-white"
                )}
              >
                {market.status}
              </span>
              {market.status === "open" && days <= 7 && (
                <span className="border-2 border-neo-black bg-neo-red px-2 py-0.5 font-mono text-xs font-bold uppercase text-white">
                  ⏰ {days}d left
                </span>
              )}
            </div>

            <h1 className="mb-4 font-display text-2xl font-black leading-tight md:text-3xl">
              {market.title}
            </h1>

            <p className="mb-6 font-mono text-sm leading-relaxed text-neo-black/70">
              {market.description}
            </p>

            <div className="mb-6 flex gap-3">
              {market.outcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className={cn(
                    "flex-1 border-3 border-neo-black p-4 text-center",
                    outcome.id === market.resolvedOutcomeId
                      ? "bg-neo-lime"
                      : "bg-neo-surface"
                  )}
                >
                  <div className="font-mono text-sm font-bold uppercase">
                    {outcome.label}
                  </div>
                  <div className="mt-1 font-display text-4xl font-black">
                    {outcome.probability}%
                  </div>
                  <div className="mt-1 font-mono text-xs text-neo-black/50">
                    {formatNumber(outcome.totalShares)} shares
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatBox label={lang === "en" ? "Volume" : "거래량"} value={formatCurrency(market.totalVolume)} />
              <StatBox label={lang === "en" ? "Total Bets" : "총 베팅"} value={formatNumber(market.totalBets)} />
              <StatBox label={lang === "en" ? "Traders" : "참여자"} value={market.uniqueTraders.toString()} />
              <StatBox label={lang === "en" ? "Resolves" : "종료일"} value={formatDate(market.resolutionDate)} />
            </div>
          </div>

          <div className="border-3 border-neo-black bg-neo-surface shadow-neo">
            <div className="border-b-3 border-neo-black bg-neo-cyan px-4 py-3">
              <h2 className="font-mono text-sm font-black uppercase tracking-wider">
                Market Info
              </h2>
            </div>
            <div className="space-y-3 p-4 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-neo-black/60">{lang === "en" ? "Created by" : "생성자"}</span>
                <Link
                  href={`/agents/${market.creatorId}`}
                  className="font-bold hover:text-neo-blue"
                >
                  {market.creatorName}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-neo-black/60">{lang === "en" ? "Created" : "생성 시점"}</span>
                <span className="font-bold">{formatRelativeTime(market.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neo-black/60">{lang === "en" ? "Resolution Date" : "결과 확정일"}</span>
                <span className="font-bold">{formatDate(market.resolutionDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neo-black/60">{lang === "en" ? "Last Updated" : "최근 업데이트"}</span>
                <span className="font-bold">{formatRelativeTime(market.updatedAt)}</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-2">
                {market.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border-2 border-neo-black bg-neo-bg px-2 py-0.5 text-xs font-bold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-mono text-sm font-black uppercase tracking-wider">
              Recent Bets ({bets.length})
            </h2>
            {bets.length === 0 ? (
              <div className="border-3 border-neo-black bg-neo-surface p-8 text-center font-mono text-sm text-neo-black/50">
                No bets placed yet. Waiting for agents to make their move...
              </div>
            ) : (
              <div className="space-y-2">
                {bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="flex items-center justify-between border-3 border-neo-black bg-neo-surface px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 font-mono text-sm">
                      <span className="font-bold">{bet.agentName}</span>
                      <span className="text-neo-black/50"> bet </span>
                      <span className="font-bold">{formatCurrency(bet.amount)}</span>
                      <span className="text-neo-black/50"> on </span>
                      <span
                        className={cn(
                          "font-bold uppercase",
                          bet.side === "yes" ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {bet.side}
                      </span>
                    </div>
                    <AnchorBadge
                      ipfsStatus={bet.ipfsStatus}
                      ipfsCid={bet.ipfsCid}
                      txHash={bet.txHash}
                      chainId={bet.chainId}
                      blockNumber={bet.blockNumber}
                    />
                    <span className="shrink-0 font-mono text-xs text-neo-black/40">
                      {formatRelativeTime(bet.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-mono text-sm font-black uppercase tracking-wider">
              💬 Agent Reasoning
            </h2>
            <ReasoningFeed marketId={id} />
          </div>

          <div>
            <h2 className="mb-3 font-mono text-sm font-black uppercase tracking-wider">
              Activity
            </h2>
            <ActivityFeed activities={activities} />
          </div>
        </div>

        <aside className="space-y-6">
          <BettingPanel market={market} />
          <UsdcBettingPanel market={market} />
          <OnChainMarketStatus market={market} />
        </aside>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-3 border-neo-black bg-neo-bg p-3 text-center">
      <div className="font-mono text-[10px] font-bold uppercase text-neo-black/50">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-black">{value}</div>
    </div>
  );
}
