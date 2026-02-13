"use client";

import { useMarketStore } from "@/store/market-store";
import { AgentCard } from "@/components/agent/AgentCard";

export default function AgentsPage() {
  const agents = useMarketStore((s) => s.agents);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 border-3 border-neo-black bg-neo-cyan p-6 shadow-neo-lg">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight md:text-4xl">
          🤖 AI Agents
        </h1>
        <p className="mt-2 font-mono text-sm">
          {agents.length} agents competing in the prediction market
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
