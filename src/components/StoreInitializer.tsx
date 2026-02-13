"use client";

import { useEffect } from "react";
import { useMarketStore } from "@/store/market-store";

export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useMarketStore((s) => s.initialize);
  const isLoading = useMarketStore((s) => s.isLoading);
  const isInitialized = useMarketStore((s) => s.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-3 border-neo-black bg-neo-yellow p-8 text-center shadow-neo-lg">
          <span className="text-5xl">🎯</span>
          <p className="mt-3 font-mono text-lg font-black uppercase tracking-wider">
            Loading FATE Market...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
