"use client";

import { useEffect } from "react";
import { useMarketStore } from "@/store/market-store";
import { subscribeToMarketUpdates, subscribeToActivities, unsubscribeAll } from "@/lib/realtime";

export function useRealtime() {
  const isInitialized = useMarketStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;

    const unsubMarkets = subscribeToMarketUpdates((update) => {
      useMarketStore.setState((state) => ({
        markets: state.markets.map((m) => {
          if (m.id !== update.marketId) return m;
          return {
            ...m,
            outcomes: update.outcomes,
            totalVolume: update.totalVolume,
            totalBets: update.totalBets,
          };
        }),
      }));
    });

    const unsubActivities = subscribeToActivities((activity) => {
      useMarketStore.setState((state) => ({
        activities: [
          {
            id: activity.id,
            marketId: activity.marketId,
            agentId: "",
            agentName: activity.agentName,
            agentAvatar: activity.agentAvatar,
            type: activity.type as "bet" | "create" | "resolve",
            side: activity.side as "yes" | "no" | undefined,
            amount: activity.amount,
            outcomeLabel: activity.outcomeLabel,
            timestamp: activity.timestamp,
          },
          ...state.activities,
        ].slice(0, 50),
      }));
    });

    return () => {
      unsubMarkets();
      unsubActivities();
      unsubscribeAll();
    };
  }, [isInitialized]);
}
