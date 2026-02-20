"use client";

import { useState } from "react";
import Link from "next/link";
import { type Market } from "@/types";
import { useMarketStore } from "@/store/market-store";
import { cn, formatCurrency } from "@/lib/utils";

const USDC_QUICK_AMOUNTS = [5, 10, 50, 100];

export function UsdcBettingPanel({ market }: { market: Market }) {
  const currentAgent = useMarketStore((s) => s.currentAgent);
  const [selectedOutcome, setSelectedOutcome] = useState(
    market.outcomes[0]?.id ?? ""
  );
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(10);
  const [reasoning, setReasoning] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (market.status !== "open") return null;

  if (!market.onchainAddress) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface">
        <div className="border-b-3 border-neo-black bg-neo-yellow px-4 py-3">
          <h3 className="font-mono text-sm font-black uppercase tracking-wider">
            USDC Betting
          </h3>
        </div>
        <div className="p-6 text-center">
          <span className="text-3xl">⛓️</span>
          <p className="mt-2 font-mono text-sm text-neo-black/60">
            Market not deployed on-chain yet.
          </p>
          <p className="mt-1 font-mono text-xs text-neo-black/40">
            USDC betting requires on-chain deployment.
          </p>
        </div>
      </div>
    );
  }

  if (!currentAgent) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface shadow-neo-lg">
        <div className="border-b-3 border-neo-black bg-neo-yellow px-4 py-3">
          <h3 className="font-mono text-sm font-black uppercase tracking-wider">
            USDC Betting
          </h3>
        </div>
        <div className="p-6 text-center">
          <span className="text-3xl">🔑</span>
          <p className="mt-2 font-mono text-sm font-bold">
            Login to bet with USDC
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block border-3 border-neo-black bg-neo-yellow px-6 py-2 font-mono text-sm font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const selectedOutcomeData = market.outcomes.find(
    (o) => o.id === selectedOutcome
  );
  const price = (selectedOutcomeData?.probability ?? 50) / 100;
  const shares = Math.round(amount / price);
  const potentialPayout = shares;

  const handlePlaceBet = async () => {
    setIsPlacing(true);
    setError(null);
    try {
      const res = await fetch(`/api/markets/${market.id}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeId: selectedOutcome,
          side,
          amount,
          betType: "usdc",
          reasoning: reasoning.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to place USDC bet");
        return;
      }
      setShowSuccess(true);
      setReasoning("");
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="border-3 border-neo-black bg-neo-surface shadow-neo-lg">
      <div className="border-b-3 border-neo-black bg-neo-yellow px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider">
          💰 USDC Betting
        </h3>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 border-3 border-dashed border-neo-black/30 bg-neo-bg p-3">
          <span className="text-2xl">{currentAgent.avatar}</span>
          <div>
            <div className="font-mono text-sm font-bold">
              {currentAgent.displayName}
            </div>
            <div className="font-mono text-xs text-neo-black/50">
              Virtual: {formatCurrency(currentAgent.balance)}
            </div>
          </div>
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
              Yes
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
              No
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            Amount (USDC)
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-lg font-bold focus:shadow-neo focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            {USDC_QUICK_AMOUNTS.map((qa) => (
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
                {qa} USDC
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            Reasoning (optional)
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Share your analysis..."
            rows={2}
            maxLength={500}
            className="w-full resize-none border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-sm placeholder:text-neo-black/30 focus:shadow-neo focus:outline-none"
          />
        </div>

        <div className="border-3 border-dashed border-neo-black/30 bg-neo-bg p-3">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-neo-black/60">Amount</span>
            <span className="font-bold">{amount} USDC</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs">
            <span className="text-neo-black/60">Est. Shares</span>
            <span className="font-bold">~{shares.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-sm">
            <span className="font-bold text-neo-black/60">Potential Payout</span>
            <span className="font-black text-green-600">
              ~{potentialPayout.toLocaleString()} USDC
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
          {isPlacing
            ? "Placing..."
            : `💰 Bet ${side.toUpperCase()} — ${amount} USDC`}
        </button>

        {showSuccess && (
          <div className="border-3 border-neo-black bg-neo-lime p-3 text-center font-mono text-sm font-bold">
            USDC bet placed successfully!
          </div>
        )}

        {error && (
          <div className="border-3 border-neo-black bg-neo-red/10 p-3 text-center font-mono text-sm font-bold text-neo-red">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
