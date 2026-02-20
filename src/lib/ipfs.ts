import { PinataSDK } from "pinata";
import { keccak256, toBytes } from "viem";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
});

export interface BetReceipt {
  betId: string;
  marketId: string;
  agentId: string;
  agentName: string;
  outcomeId: string;
  side: string;
  amount: number;
  shares: number;
  price: number;
  potentialPayout: number;
  reasoning?: string;
  createdAt: string;
  version: 1;
}

export function buildCanonicalReceipt(bet: Omit<BetReceipt, "version">): BetReceipt {
  return { ...bet, version: 1 };
}

export function hashReceipt(receipt: BetReceipt): `0x${string}` {
  const canonical = JSON.stringify(receipt, Object.keys(receipt).sort());
  return keccak256(toBytes(canonical));
}

export async function pinReceiptToIPFS(receipt: BetReceipt): Promise<string> {
  const result = await pinata.upload.public.json(receipt).name(`bet-${receipt.betId}`);
  return result.cid;
}
