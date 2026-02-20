"use client";

import { useState, useEffect, useCallback } from "react";

interface StakeData {
  totalStaked: string;
  staked: string;
  pendingRewards: string;
}

interface SubscriptionData {
  active: boolean;
  followFee: string;
}

function formatFate(raw: string): string {
  const val = Number(raw) / 1e18;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(2);
}

function formatUsdc(raw: string): string {
  const val = Number(raw) / 1e6;
  return `$${val.toFixed(2)}`;
}

export function AgentStakePanel({
  agentId,
  sbtTokenId,
  walletAddress,
}: {
  agentId: string;
  sbtTokenId?: number;
  walletAddress?: string;
}) {
  const [stakeData, setStakeData] = useState<StakeData | null>(null);
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!sbtTokenId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const stakeUrl = walletAddress
        ? `/api/agents/${agentId}/stake?staker=${walletAddress}`
        : `/api/agents/${agentId}/stake`;
      const [stakeRes, subRes] = await Promise.all([
        fetch(stakeUrl),
        walletAddress
          ? fetch(`/api/agents/${agentId}/subscribe?follower=${walletAddress}`)
          : Promise.resolve(null),
      ]);

      const stakeJson = await stakeRes.json();
      if (stakeJson.success) setStakeData(stakeJson.data);

      if (subRes) {
        const subJson = await subRes.json();
        if (subJson.success) setSubData(subJson.data);
      }
    } catch {
      setError("Failed to load staking data");
    } finally {
      setLoading(false);
    }
  }, [agentId, sbtTokenId, walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!sbtTokenId) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface">
        <div className="border-b-3 border-neo-black bg-neo-lime px-4 py-3">
          <h3 className="font-mono text-sm font-black uppercase tracking-wider">
            Staking
          </h3>
        </div>
        <div className="p-4 text-center font-mono text-sm text-neo-black/50">
          Agent has no SBT — staking unavailable
        </div>
      </div>
    );
  }

  return (
    <div className="border-3 border-neo-black bg-neo-surface">
      <div className="border-b-3 border-neo-black bg-neo-lime px-4 py-3">
        <h3 className="font-mono text-sm font-black uppercase tracking-wider">
          Staking
        </h3>
      </div>
      <div className="space-y-3 p-4 font-mono text-sm">
        {loading && (
          <>
            <div className="h-4 w-3/4 animate-pulse bg-neo-bg" />
            <div className="h-4 w-1/2 animate-pulse bg-neo-bg" />
          </>
        )}

        {error && (
          <div className="text-center">
            <p className="text-neo-red">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 border-2 border-neo-black bg-neo-yellow px-3 py-1 text-xs font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && stakeData && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-neo-black/60">Total FATE Staked</span>
              <span className="font-bold">{formatFate(stakeData.totalStaked)} FATE</span>
            </div>
            {walletAddress && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-neo-black/60">Your Stake</span>
                  <span className="font-bold">{formatFate(stakeData.staked)} FATE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neo-black/60">Pending Rewards</span>
                  <span className="font-bold text-neo-lime">{formatUsdc(stakeData.pendingRewards)} USDC</span>
                </div>
              </>
            )}
            {subData && (
              <>
                <div className="mt-2 border-t-2 border-neo-black/20 pt-2" />
                <div className="flex items-center justify-between">
                  <span className="text-neo-black/60">Subscription</span>
                  <span
                    className={`border-2 border-neo-black px-2 py-0.5 text-xs font-bold ${
                      subData.active ? "bg-neo-lime" : "bg-neo-bg"
                    }`}
                  >
                    {subData.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neo-black/60">Follow Fee</span>
                  <span className="font-bold">{formatUsdc(subData.followFee)} USDC</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
