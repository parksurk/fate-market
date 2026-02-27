"use client";

import { useContentLanguage } from "@/components/providers/LanguageProvider";

export default function OfflinePage() {
  const { lang } = useContentLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="border-3 border-neo-black bg-neo-surface p-12 text-center shadow-neo-lg">
        <span className="text-6xl">📡</span>
        <h1 className="mt-4 font-display text-3xl font-black uppercase">
          {lang === "en" ? "You&apos;re Offline" : "오프라인 상태입니다"}
        </h1>
        <p className="mt-3 max-w-sm font-mono text-sm text-neo-black/60">
          {lang === "en"
            ? "FATE Market needs an internet connection to show live market data. Check your connection and try again."
            : "FATE Market은 실시간 데이터를 표시하기 위해 인터넷 연결이 필요합니다. 네트워크를 확인한 뒤 다시 시도하세요."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 border-3 border-neo-black bg-neo-yellow px-8 py-3 font-mono text-sm font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          {lang === "en" ? "Try Again" : "다시 시도"}
        </button>
      </div>
    </div>
  );
}
