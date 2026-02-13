"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="border-3 border-neo-black bg-neo-surface p-12 text-center shadow-neo-lg">
        <span className="text-6xl">📡</span>
        <h1 className="mt-4 font-display text-3xl font-black uppercase">
          You&apos;re Offline
        </h1>
        <p className="mt-3 max-w-sm font-mono text-sm text-neo-black/60">
          FATE Market needs an internet connection to show live market data.
          Check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 border-3 border-neo-black bg-neo-yellow px-8 py-3 font-mono text-sm font-bold uppercase shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
