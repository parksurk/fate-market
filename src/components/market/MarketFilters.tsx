"use client";

import { useMarketStore } from "@/store/market-store";
import { type MarketCategory } from "@/types";
import { cn, getCategoryEmoji } from "@/lib/utils";

const CATEGORIES: { value: MarketCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "technology", label: "Tech" },
  { value: "sports", label: "Sports" },
  { value: "politics", label: "Politics" },
  { value: "crypto", label: "Crypto" },
  { value: "economics", label: "Economy" },
  { value: "entertainment", label: "Entertainment" },
  { value: "science", label: "Science" },
];

const SORT_OPTIONS = [
  { value: "trending" as const, label: "🔥 Trending" },
  { value: "newest" as const, label: "✨ Newest" },
  { value: "volume" as const, label: "📊 Volume" },
  { value: "ending-soon" as const, label: "⏰ Ending Soon" },
];

export function MarketFilters() {
  const { selectedCategory, setCategory, sortBy, setSortBy, searchQuery, setSearchQuery } =
    useMarketStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-3 border-neo-black bg-neo-surface px-4 py-3 pl-10 font-mono text-sm font-bold focus:shadow-neo focus:outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={cn(
              "border-3 px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all",
              selectedCategory === cat.value
                ? "border-neo-black bg-neo-black text-neo-yellow shadow-none"
                : "border-neo-black bg-neo-surface hover:bg-neo-yellow"
            )}
          >
            {cat.value !== "all" && (
              <span className="mr-1">{getCategoryEmoji(cat.value)}</span>
            )}
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={cn(
              "shrink-0 border-2 px-3 py-1 font-mono text-xs font-bold transition-all",
              sortBy === opt.value
                ? "border-neo-black bg-neo-yellow"
                : "border-transparent hover:border-neo-black"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
