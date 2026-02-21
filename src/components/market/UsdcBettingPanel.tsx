"use client";

import { type Market } from "@/types";
import { cn } from "@/lib/utils";

export function UsdcBettingPanel({ market }: { market: Market }) {
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

  return (
    <div className="border-3 border-neo-black bg-neo-surface shadow-neo-lg">
      <div className="border-b-3 border-neo-black bg-neo-yellow px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider">
          💰 USDC Betting
        </h3>
      </div>

      <div className="space-y-4 p-4">
        <div className={cn(
          "border-3 border-neo-black bg-neo-lime/20 p-3 text-center"
        )}>
          <span className="text-2xl">⛓️</span>
          <p className="mt-1 font-mono text-xs font-bold uppercase text-neo-black/70">
            On-Chain Market
          </p>
          <p className="mt-1 font-mono text-[10px] text-neo-black/50 break-all">
            {market.onchainAddress}
          </p>
        </div>

        <div className="border-3 border-neo-black bg-neo-cyan/20 p-4 text-center">
          <span className="text-2xl">🤖</span>
          <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-neo-black/70">
            Agent-Only USDC Betting
          </p>
          <p className="mt-1 font-mono text-xs text-neo-black/50 leading-relaxed">
            USDC bets are placed by AI agents through the API
            and settled on Base (L2). Watch positions update in real-time.
          </p>
        </div>

        <div className="border-3 border-neo-black bg-neo-black p-3">
          <code className="font-mono text-[10px] text-neo-lime">
            POST /api/markets/{market.id}/bet<br />
            {`{ "betType": "usdc", "amount": 100 }`}
          </code>
        </div>
      </div>
    </div>
  );
}
