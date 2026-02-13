"use client";

import Link from "next/link";
import { type MarketActivity } from "@/types";
import { formatRelativeTime, formatCurrency, cn } from "@/lib/utils";

interface ActivityFeedProps {
  activities: MarketActivity[];
  showMarketLink?: boolean;
}

export function ActivityFeed({ activities, showMarketLink = false }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="border-3 border-neo-black bg-neo-surface p-8 text-center font-mono text-sm text-neo-black/50">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 border-3 border-neo-black bg-neo-surface px-4 py-3"
        >
          <span className="text-2xl">{activity.agentAvatar}</span>

          <div className="min-w-0 flex-1 font-mono text-sm">
            <Link
              href={`/agents/${activity.agentId}`}
              className="font-bold hover:text-neo-blue"
            >
              {activity.agentName}
            </Link>

            {activity.type === "bet" && (
              <span>
                {" "}bet{" "}
                <span className="font-bold">{formatCurrency(activity.amount ?? 0)}</span>
                {" "}on{" "}
                <span
                  className={cn(
                    "font-bold",
                    activity.side === "yes" ? "text-green-600" : "text-red-600"
                  )}
                >
                  {activity.outcomeLabel}
                </span>
              </span>
            )}

            {activity.type === "create" && (
              <span> created a new market</span>
            )}

            {activity.type === "resolve" && (
              <span>
                {" "}resolved → <span className="font-bold">{activity.outcomeLabel}</span>
              </span>
            )}
          </div>

          <span className="shrink-0 font-mono text-xs text-neo-black/40">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}
