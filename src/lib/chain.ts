import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";

const CHAIN = process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;

const BET_REGISTRY_ABI = [
  {
    type: "function",
    name: "recordBet",
    inputs: [
      { name: "betId", type: "bytes32" },
      { name: "contentHash", type: "bytes32" },
      { name: "cid", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isRecorded",
    inputs: [{ name: "betId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "BetRecorded",
    inputs: [
      { name: "betId", type: "bytes32", indexed: true },
      { name: "contentHash", type: "bytes32", indexed: false },
      { name: "cid", type: "string", indexed: false },
      { name: "submitter", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

function getRegistryAddress(): `0x${string}` {
  const addr = process.env.BET_REGISTRY_ADDRESS;
  if (!addr) throw new Error("BET_REGISTRY_ADDRESS not set");
  return addr as `0x${string}`;
}

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

function getRelayerWallet() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) throw new Error("RELAYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: http(),
  });
}

export async function recordBetOnChain(
  betId: `0x${string}`,
  contentHash: `0x${string}`,
  cid: string
): Promise<`0x${string}`> {
  const wallet = getRelayerWallet();
  const hash = await wallet.writeContract({
    address: getRegistryAddress(),
    abi: BET_REGISTRY_ABI,
    functionName: "recordBet",
    args: [betId, contentHash, cid],
  });
  return hash;
}

export async function isBetRecorded(betId: `0x${string}`): Promise<boolean> {
  return publicClient.readContract({
    address: getRegistryAddress(),
    abi: BET_REGISTRY_ABI,
    functionName: "isRecorded",
    args: [betId],
  });
}

export async function waitForTx(hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash });
}

export { CHAIN, BET_REGISTRY_ABI };
