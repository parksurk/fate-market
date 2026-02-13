"use client";

import { useState } from "react";
import { type Market } from "@/types";
import { useMarketStore } from "@/store/market-store";
import { cn, formatCurrency } from "@/lib/utils";

interface BettingPanelProps {
  market: Market;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const AGENT_OPTIONS = [
  { id: "agent-001", name: "Oracle GPT", avatar: "🔮" },
  { id: "agent-002", name: "Claude Prophet", avatar: "🧠" },
  { id: "agent-003", name: "Gemini Sage", avatar: "⚡" },
  { id: "agent-004", name: "Llama Hunter", avatar: "🦊" },
  { id: "agent-005", name: "Mistral Wind", avatar: "🌀" },
  { id: "agent-006", name: "Deep Diver", avatar: "🌊" },
  { id: "agent-007", name: "Risk Taker", avatar: "🎲" },
  { id: "agent-008", name: "Diamond Hands", avatar: "💎" },
];

export function BettingPanel({ market }: BettingPanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState(market.outcomes[0]?.id ?? "");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(100);
  const [agentId, setAgentId] = useState("agent-001");
  const [isPlacing, setIsPlacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const placeBet = useMarketStore((s) => s.placeBet);

  const selectedOutcomeData = market.outcomes.find((o) => o.id === selectedOutcome);
  const price = (selectedOutcomeData?.probability ?? 50) / 100;
  const potentialShares = Math.round(amount / price);
  const potentialPayout = potentialShares;

  const handlePlaceBet = async () => {
    if (market.status !== "open") return;
    setIsPlacing(true);
    try {
      await placeBet(
        { marketId: market.id, outcomeId: selectedOutcome, side, amount },
        agentId
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
    } finally {
      setIsPlacing(false);
    }
  };

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
          Place a Bet
        </h3>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            Acting as Agent
          </label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-sm font-bold focus:shadow-neo focus:outline-none"
          >
            {AGENT_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.avatar} {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            Outcome
          </label>
          <div className="flex gap-2">
            {market.outcomes.map((outcome) => (
              <button
                key={outcome.id}
                onClick={() => setSelectedOutcome(outcome.id)}
                className={cn(
                  "flex-1 border-3 border-neo-black px-3 py-2 font-mono text-sm font-bold transition-all",
                  selectedOutcome === outcome.id
                    ? "bg-neo-black text-neo-yellow shadow-none"
                    : "bg-neo-surface hover:bg-neo-yellow"
                )}
              >
                {outcome.label} ({outcome.probability}%)
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            Side
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide("yes")}
              className={cn(
                "flex-1 border-3 border-neo-black px-3 py-2 font-mono text-sm font-bold uppercase transition-all",
                side === "yes"
                  ? "bg-neo-lime text-neo-black shadow-none"
                  : "bg-neo-surface hover:bg-neo-lime/30"
              )}
            >
              ✅ Yes
            </button>
            <button
              onClick={() => setSide("no")}
              className={cn(
                "flex-1 border-3 border-neo-black px-3 py-2 font-mono text-sm font-bold uppercase transition-all",
                side === "no"
                  ? "bg-neo-red text-white shadow-none"
                  : "bg-neo-surface hover:bg-neo-red/10"
              )}
            >
              ❌ No
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            Amount ($)
          </label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-lg font-bold focus:shadow-neo focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            {QUICK_AMOUNTS.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(qa)}
                className={cn(
                  "flex-1 border-2 border-neo-black px-2 py-1 font-mono text-xs font-bold transition-all",
                  amount === qa
                    ? "bg-neo-yellow"
                    : "bg-neo-surface hover:bg-neo-yellow/50"
                )}
              >
                ${qa}
              </button>
            ))}
          </div>
        </div>

        <div className="border-3 border-dashed border-neo-black/30 bg-neo-bg p-3">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-neo-black/60">Price per share</span>
            <span className="font-bold">${price.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs">
            <span className="text-neo-black/60">Shares</span>
            <span className="font-bold">{potentialShares.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-sm">
            <span className="font-bold text-neo-black/60">Potential Payout</span>
            <span className="font-black text-green-600">
              {formatCurrency(potentialPayout)}
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaceBet}
          disabled={isPlacing || amount <= 0}
          className={cn(
            "w-full border-3 border-neo-black px-4 py-3 font-mono text-sm font-black uppercase tracking-wider transition-all",
            "shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            side === "yes"
              ? "bg-neo-lime text-neo-black"
              : "bg-neo-red text-white"
          )}
        >
          {isPlacing ? "Placing..." : `Bet ${side.toUpperCase()} — ${formatCurrency(amount)}`}
        </button>

        {showSuccess && (
          <div className="border-3 border-neo-black bg-neo-lime p-3 text-center font-mono text-sm font-bold">
            ✅ Bet placed successfully!
          </div>
        )}
      </div>
    </div>
  );
}
