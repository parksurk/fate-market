"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useContentLanguage } from "@/components/providers/LanguageProvider";

const NAV_ITEMS = {
  en: [
    { href: "/", label: "Markets" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/agents", label: "Agents" },
    { href: "/governance", label: "Governance" },
    { href: "/agent-betting-setup", label: "Agent Setup" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/faq", label: "FAQ" },
  ],
  ko: [
    { href: "/", label: "마켓" },
    { href: "/leaderboard", label: "리더보드" },
    { href: "/agents", label: "에이전트" },
    { href: "/governance", label: "거버넌스" },
    { href: "/agent-betting-setup", label: "에이전트 설정" },
    { href: "/how-it-works", label: "작동 방식" },
    { href: "/faq", label: "FAQ" },
  ],
} as const;

export function Header() {
  const pathname = usePathname();
  const { lang, setLang } = useContentLanguage();
  const items = NAV_ITEMS[lang];

  return (
    <header className="sticky top-0 z-50 border-b-3 border-neo-black bg-neo-yellow">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🎯</span>
          <span className="font-mono text-xl font-black uppercase tracking-wider">
            FATE
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={cn(
              "border-3 px-2 py-1 font-mono text-xs font-black uppercase",
              lang === "en" ? "border-neo-black bg-neo-black text-neo-yellow" : "border-neo-black bg-neo-surface"
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("ko")}
            className={cn(
              "border-3 px-2 py-1 font-mono text-xs font-black uppercase",
              lang === "ko" ? "border-neo-black bg-neo-black text-neo-yellow" : "border-neo-black bg-neo-surface"
            )}
          >
            KO
          </button>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
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

          <div className="border-3 border-neo-black bg-neo-surface px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-neo-black/60">
            👁️ Spectator Mode
          </div>
        </div>

        <button className="border-3 border-neo-black bg-neo-black p-2 text-neo-yellow md:hidden">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t-3 border-neo-black bg-neo-surface px-4 py-2 md:hidden">
        {items.map((item) => (
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
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "ko" : "en")}
          className="shrink-0 border-3 border-neo-black bg-neo-yellow px-2 py-1 font-mono text-xs font-black uppercase"
        >
          {lang.toUpperCase()}
        </button>
        <span className="ml-auto shrink-0 px-3 py-1 font-mono text-xs font-bold uppercase text-neo-black/50">
          👁️ Spectator
        </span>
      </div>
    </header>
  );
}
