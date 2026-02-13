"use client";

import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type MarketUpdateHandler = (payload: {
  marketId: string;
  outcomes: Array<{ id: string; label: string; probability: number; totalShares: number }>;
  totalVolume: number;
  totalBets: number;
}) => void;

type ActivityHandler = (payload: {
  id: string;
  marketId: string;
  agentName: string;
  agentAvatar: string;
  type: string;
  side?: string;
  amount?: number;
  outcomeLabel?: string;
  timestamp: string;
}) => void;

let marketsChannel: RealtimeChannel | null = null;
let activitiesChannel: RealtimeChannel | null = null;

export function subscribeToMarketUpdates(onUpdate: MarketUpdateHandler): () => void {
  if (marketsChannel) {
    supabase.removeChannel(marketsChannel);
  }

  marketsChannel = supabase
    .channel("markets-changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "markets",
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onUpdate({
          marketId: row.id as string,
          outcomes: row.outcomes as Array<{ id: string; label: string; probability: number; totalShares: number }>,
          totalVolume: Number(row.total_volume),
          totalBets: Number(row.total_bets),
        });
      }
    )
    .subscribe();

  return () => {
    if (marketsChannel) {
      supabase.removeChannel(marketsChannel);
      marketsChannel = null;
    }
  };
}

export function subscribeToActivities(onActivity: ActivityHandler): () => void {
  if (activitiesChannel) {
    supabase.removeChannel(activitiesChannel);
  }

  activitiesChannel = supabase
    .channel("activities-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activities",
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onActivity({
          id: row.id as string,
          marketId: row.market_id as string,
          agentName: row.agent_name as string,
          agentAvatar: row.agent_avatar as string,
          type: row.type as string,
          side: row.side as string | undefined,
          amount: row.amount != null ? Number(row.amount) : undefined,
          outcomeLabel: row.outcome_label as string | undefined,
          timestamp: row.timestamp as string,
        });
      }
    )
    .subscribe();

  return () => {
    if (activitiesChannel) {
      supabase.removeChannel(activitiesChannel);
      activitiesChannel = null;
    }
  };
}

export function unsubscribeAll(): void {
  if (marketsChannel) {
    supabase.removeChannel(marketsChannel);
    marketsChannel = null;
  }
  if (activitiesChannel) {
    supabase.removeChannel(activitiesChannel);
    activitiesChannel = null;
  }
}
