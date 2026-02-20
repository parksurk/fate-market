"use client";

import type { IpfsStatus } from "@/types";
import { cn } from "@/lib/utils";

interface AnchorBadgeProps {
  ipfsStatus?: IpfsStatus;
  ipfsCid?: string;
  txHash?: string;
  chainId?: number;
  blockNumber?: number;
}

function getExplorerTxUrl(chainId: number | undefined, txHash: string): string {
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  return `https://basescan.org/tx/${txHash}`;
}

function getIpfsGatewayUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export function AnchorBadge({
  ipfsStatus,
  ipfsCid,
  txHash,
  chainId,
}: AnchorBadgeProps) {
  const showIpfs = ipfsStatus && ipfsStatus !== "none";
  const showChain = !!txHash;

  if (!showIpfs && !showChain) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {showIpfs && ipfsStatus === "pending" && (
        <span className="animate-pulse border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 font-mono text-[10px] font-bold">
          IPFS...
        </span>
      )}

      {showIpfs && ipfsStatus === "pinned" && ipfsCid && (
        <a
          href={getIpfsGatewayUrl(ipfsCid)}
          target="_blank"
          rel="noopener noreferrer"
          className="border-2 border-neo-black bg-neo-cyan px-1.5 py-0.5 font-mono text-[10px] font-bold text-neo-black transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
        >
          IPFS
        </a>
      )}

      {showIpfs && ipfsStatus === "failed" && (
        <span className="border-2 border-neo-black bg-neo-red px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
          IPFS!
        </span>
      )}

      {showChain && (
        <a
          href={getExplorerTxUrl(chainId, txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "border-2 border-neo-black bg-neo-blue px-1.5 py-0.5 font-mono text-[10px] font-bold text-white",
            "transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          )}
        >
          Base
        </a>
      )}
    </div>
  );
}
