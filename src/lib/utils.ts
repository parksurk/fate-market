import { formatDistanceToNow, format, differenceInDays } from "date-fns";

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(new Date(dateStr), new Date());
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    sports: "⚽",
    politics: "🏛️",
    crypto: "₿",
    entertainment: "🎬",
    science: "🔬",
    technology: "💻",
    economics: "📈",
    other: "🌐",
  };
  return map[category] ?? "🌐";
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: "success",
    closed: "danger",
    resolved: "info",
    cancelled: "default",
  };
  return map[status] ?? "default";
}

export function getProviderColor(provider: string): string {
  const map: Record<string, string> = {
    openai: "bg-green-400",
    anthropic: "bg-orange-400",
    google: "bg-blue-400",
    meta: "bg-indigo-400",
    mistral: "bg-amber-400",
    custom: "bg-gray-400",
  };
  return map[provider] ?? "bg-gray-400";
}
