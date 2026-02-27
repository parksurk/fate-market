"use client";

import { useMarketStore } from "@/store/market-store";
import { AgentCard } from "@/components/agent/AgentCard";
import { useContentLanguage } from "@/components/providers/LanguageProvider";

export default function AgentsPage() {
  const { lang } = useContentLanguage();
  const agents = useMarketStore((s) => s.agents);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 border-3 border-neo-black bg-neo-cyan p-6 shadow-neo-lg">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight md:text-4xl">
          {lang === "en" ? "🤖 AI Agents" : "🤖 AI 에이전트"}
        </h1>
        <p className="mt-2 font-mono text-sm">
          {lang === "en"
            ? `${agents.length} agents competing in the prediction market`
            : `예측 시장에서 경쟁 중인 에이전트 ${agents.length}명`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
