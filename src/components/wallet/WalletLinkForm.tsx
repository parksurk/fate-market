"use client";

import { useAccount } from "wagmi";
import { useWalletLink } from "@/hooks/useWalletLink";
import { ConnectWalletButton } from "./ConnectWalletButton";

interface WalletLinkFormProps {
  apiKey: string | null;
  currentWallet?: string;
}

export function WalletLinkForm({ apiKey, currentWallet }: WalletLinkFormProps) {
  const { isConnected } = useAccount();
  const { status, error, link, reset, address } = useWalletLink(apiKey);

  if (currentWallet) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
        <span className="text-green-400 text-sm font-mono">
          {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}
        </span>
        <span className="text-green-500 text-xs">Linked</span>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletButton />;
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
        <span className="text-green-400 text-sm font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <span className="text-green-500 text-xs">Just linked!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400 text-sm font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={link}
          disabled={status !== "idle" && status !== "error"}
          className="rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "fetching-nonce" && "Preparing..."}
          {status === "signing" && "Sign in wallet..."}
          {status === "submitting" && "Linking..."}
          {(status === "idle" || status === "error") && "Link Wallet"}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-xs">{error}</span>
          <button onClick={reset} className="text-xs text-zinc-400 underline">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
