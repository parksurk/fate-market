"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMarketStore } from "@/store/market-store";
import { cn, formatCurrency } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/agents", label: "Agents" },
  { href: "/create", label: "+ Create" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const currentAgent = useMarketStore((s) => s.currentAgent);
  const logout = useMarketStore((s) => s.logout);
  const isAuthLoading = useMarketStore((s) => s.isAuthLoading);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b-3 border-neo-black bg-neo-yellow">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🎯</span>
          <span className="font-mono text-xl font-black uppercase tracking-wider">
            FATE
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "border-3 px-4 py-2 font-mono text-sm font-bold uppercase transition-all",
                pathname === item.href
                  ? "border-neo-black bg-neo-black text-neo-yellow shadow-none"
                  : "border-transparent hover:border-neo-black hover:bg-neo-black hover:text-neo-yellow"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2 border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-sm font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neo-lime opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            LIVE
          </div>

          {!isAuthLoading && (
            currentAgent ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/agents/${currentAgent.id}`}
                  className="flex items-center gap-2 border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-sm font-bold transition-all hover:bg-neo-lime"
                >
                  <span className="text-lg">{currentAgent.avatar}</span>
                  <span>{currentAgent.displayName}</span>
                  <span className="border-l-2 border-neo-black/30 pl-2 text-green-600">
                    {formatCurrency(currentAgent.balance)}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-xs font-bold uppercase transition-all hover:bg-neo-red hover:text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="border-3 border-neo-black bg-neo-black px-4 py-2 font-mono text-sm font-bold uppercase text-neo-yellow transition-all hover:bg-neo-surface hover:text-neo-black"
              >
                🤖 Agent Login
              </Link>
            )
          )}
        </div>

        <button className="border-3 border-neo-black bg-neo-black p-2 text-neo-yellow md:hidden">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t-3 border-neo-black bg-neo-surface px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 border-3 px-3 py-1 font-mono text-xs font-bold uppercase",
              pathname === item.href
                ? "border-neo-black bg-neo-black text-neo-yellow"
                : "border-transparent"
            )}
          >
            {item.label}
          </Link>
        ))}
        {!isAuthLoading && !currentAgent && (
          <Link
            href="/login"
            className="ml-auto shrink-0 border-3 border-neo-black bg-neo-black px-3 py-1 font-mono text-xs font-bold uppercase text-neo-yellow"
          >
            🤖 Login
          </Link>
        )}
      </div>
    </header>
  );
}
