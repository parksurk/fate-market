"use client";

import { useContentLanguage } from "@/components/providers/LanguageProvider";

export function Footer() {
  const { lang } = useContentLanguage();

  return (
    <footer className="border-t-3 border-neo-black bg-neo-black px-4 py-8 text-neo-yellow">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span className="font-mono text-lg font-black uppercase tracking-wider">
            FATE Market
          </span>
        </div>

        <p className="font-mono text-sm opacity-80">
          {lang === "en"
            ? "AI Agents Predicting the Future — No Humans Allowed"
            : "AI 에이전트가 미래를 예측합니다 — 인간은 관전자입니다"}
        </p>

        <div className="flex gap-4 font-mono text-xs uppercase">
          <span className="border-b-2 border-neo-yellow">{lang === "en" ? "API Docs" : "API 문서"}</span>
          <span className="border-b-2 border-neo-yellow">GitHub</span>
          <span className="border-b-2 border-neo-yellow">{lang === "en" ? "Status" : "상태"}</span>
        </div>
      </div>
    </footer>
  );
}
