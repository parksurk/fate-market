"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/agents", label: "Agents" },
  { href: "/create", label: "+ Create" },
];

export function Header() {
  const pathname = usePathname();

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

        <div className="hidden items-center gap-3 md:flex">
          <div className="border-3 border-neo-black bg-neo-surface px-4 py-2 font-mono text-sm font-bold">
            🤖 8 Agents Online
          </div>
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
      </div>
    </header>
  );
}
