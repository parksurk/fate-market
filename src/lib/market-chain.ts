import { createPublicClient, createWalletClient, http, parseAbi, encodePacked, keccak256, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";

const CHAIN = process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;

const MARKET_FACTORY_ABI = parseAbi([
  "function createMarket((bytes32 marketId, address oracleAdapter, uint40 closeTime, uint8 outcomeCount, uint16 feeBps, bytes32 metadataHash) params) external returns (address market)",
  "function getMarket(bytes32 marketId) external view returns (address)",
  "function isMarket(address market) external view returns (bool)",
  "function marketCount() external view returns (uint256)",
  "event MarketCreated(bytes32 indexed marketId, address indexed market, address indexed oracleAdapter, uint40 closeTime, uint8 outcomeCount, uint16 feeBps)",
]);

const PREDICTION_MARKET_ABI = parseAbi([
  "function state() external view returns (uint8)",
  "function totalPool() external view returns (uint256)",
  "function outcomePool(uint8 outcomeIndex) external view returns (uint256)",
  "function getPosition(address user) external view returns (uint128 yesShares, uint128 noShares)",
  "function claimable(address user) external view returns (uint256 payout)",
  "function finalOutcome() external view returns (uint8)",
  "function closeTime() external view returns (uint40)",
  "function placeBet(uint8 outcome, uint256 amount, address receiver, bytes32 offchainBetId) external",
  "function close() external",
  "function finalize() external",
  "function claim(address receiver) external returns (uint256 payout)",
  "function claimRefund(address receiver) external returns (uint256 amount)",
]);

const MANUAL_ORACLE_ABI = parseAbi([
  "function requestResolution(address market, bytes32 marketId, bytes data) external returns (bytes32 requestId)",
  "function resolve(bytes32 requestId, uint8 outcome, bytes32 evidenceHash) external",
  "event ResolutionRequested(address indexed market, bytes32 indexed marketId, bytes32 indexed requestId, bytes data)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
]);

function getFactoryAddress(): `0x${string}` {
  const addr = process.env.MARKET_FACTORY_ADDRESS;
  if (!addr) throw new Error("MARKET_FACTORY_ADDRESS not set");
  return addr as `0x${string}`;
}

function getOracleAddress(): `0x${string}` {
  const addr = process.env.MANUAL_ORACLE_ADDRESS;
  if (!addr) throw new Error("MANUAL_ORACLE_ADDRESS not set");
  return addr as `0x${string}`;
}

function getUsdcAddress(): `0x${string}` {
  const addr = process.env.USDC_ADDRESS;
  if (!addr) throw new Error("USDC_ADDRESS not set");
  return addr as `0x${string}`;
}

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

export function getRelayerWallet() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) throw new Error("RELAYER_PRIVATE_KEY not set");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({ account, chain: CHAIN, transport: http() });
}

export function marketIdToBytes32(dbId: string): `0x${string}` {
  const hex = dbId.replace(/-/g, "");
  return keccak256(encodePacked(["string"], [hex]));
}

export async function deployMarketOnChain(params: {
  marketId: string;
  closeTime: number;
  outcomeCount: number;
  feeBps: number;
  metadataHash: `0x${string}`;
}): Promise<{ marketAddress: `0x${string}`; txHash: `0x${string}` }> {
  const wallet = getRelayerWallet();
  const marketIdBytes = marketIdToBytes32(params.marketId);

  const txHash = await wallet.writeContract({
    address: getFactoryAddress(),
    abi: MARKET_FACTORY_ABI,
    functionName: "createMarket",
    args: [{
      marketId: marketIdBytes,
      oracleAdapter: getOracleAddress(),
      closeTime: params.closeTime,
      outcomeCount: params.outcomeCount,
      feeBps: params.feeBps,
      metadataHash: params.metadataHash,
    }],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  let marketAddress: `0x${string}` | undefined;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: MARKET_FACTORY_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "MarketCreated") {
        marketAddress = (decoded.args as { market: `0x${string}` }).market;
        break;
      }
    } catch {
    }
  }

  if (!marketAddress) {
    const marketFromRegistry = await publicClient.readContract({
      address: getFactoryAddress(),
      abi: MARKET_FACTORY_ABI,
      functionName: "getMarket",
      args: [marketIdBytes],
    });
    marketAddress = marketFromRegistry as `0x${string}`;
  }

  return { marketAddress, txHash };
}

export async function getOnChainMarketState(marketAddress: `0x${string}`) {
  const [state, totalPool, yesPool, noPool, closingTime, outcome] = await Promise.all([
    publicClient.readContract({ address: marketAddress, abi: PREDICTION_MARKET_ABI, functionName: "state" }),
    publicClient.readContract({ address: marketAddress, abi: PREDICTION_MARKET_ABI, functionName: "totalPool" }),
    publicClient.readContract({ address: marketAddress, abi: PREDICTION_MARKET_ABI, functionName: "outcomePool", args: [0] }),
    publicClient.readContract({ address: marketAddress, abi: PREDICTION_MARKET_ABI, functionName: "outcomePool", args: [1] }),
    publicClient.readContract({ address: marketAddress, abi: PREDICTION_MARKET_ABI, functionName: "closeTime" }),
    publicClient.readContract({ address: marketAddress, abi: PREDICTION_MARKET_ABI, functionName: "finalOutcome" }),
  ]);

  const stateNames = ["created", "open", "closed", "proposed", "final", "cancelled"] as const;

  return {
    state: stateNames[Number(state)] ?? "unknown",
    totalPool: Number(totalPool),
    yesPool: Number(yesPool),
    noPool: Number(noPool),
    closeTime: Number(closingTime),
    finalOutcome: Number(outcome),
  };
}

export async function getUsdcBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.readContract({
    address: getUsdcAddress(),
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  });
}

export async function getUsdcAllowance(
  owner: `0x${string}`,
  spender: `0x${string}`
): Promise<bigint> {
  return publicClient.readContract({
    address: getUsdcAddress(),
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  });
}

/**
 * Ensure the relayer has approved enough USDC for a market contract.
 * Approves MaxUint256 on first need so subsequent bets skip this step.
 */
export async function ensureUsdcApproval(
  marketAddress: `0x${string}`,
  requiredAmount: bigint
): Promise<`0x${string}` | null> {
  const wallet = getRelayerWallet();
  const relayerAddress = wallet.account.address;

  const currentAllowance = await getUsdcAllowance(relayerAddress, marketAddress);
  if (currentAllowance >= requiredAmount) return null;

  const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  const txHash = await wallet.writeContract({
    address: getUsdcAddress(),
    abi: ERC20_ABI,
    functionName: "approve",
    args: [marketAddress, maxUint256],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/**
 * Place a bet on-chain via relayer on behalf of an agent.
 *
 * Economic flow: Agent's USDC → Relayer → Market Contract
 *   1. Verify agent wallet has enough USDC
 *   2. Verify agent has approved relayer to spend USDC
 *   3. Pull USDC from agent wallet to relayer (transferFrom)
 *   4. Ensure relayer has approved market contract
 *   5. Call PredictionMarket.placeBet()
 *   6. Wait for tx receipt
 *
 * @param agentWallet - Agent's linked wallet (USDC source & position receiver)
 */
export async function placeBetOnChain(params: {
  marketAddress: `0x${string}`;
  outcome: number;
  amount: bigint;
  agentWallet: `0x${string}`;
  offchainBetId: `0x${string}`;
}): Promise<{ txHash: `0x${string}`; pullTxHash: `0x${string}` }> {
  const wallet = getRelayerWallet();
  const relayerAddress = wallet.account.address;

  // 1. Verify agent wallet has enough USDC
  const agentBalance = await getUsdcBalance(params.agentWallet);
  if (agentBalance < params.amount) {
    throw new Error(
      `Agent USDC balance insufficient: has ${agentBalance}, needs ${params.amount}`
    );
  }

  // 2. Verify agent has approved relayer to spend their USDC
  const agentAllowance = await getUsdcAllowance(params.agentWallet, relayerAddress);
  if (agentAllowance < params.amount) {
    throw new Error(
      `Agent has not approved enough USDC for relayer. ` +
      `Approved: ${agentAllowance}, needed: ${params.amount}. ` +
      `Agent wallet owner must call USDC.approve(${relayerAddress}, amount) on Base.`
    );
  }

  // 3. Pull USDC from agent wallet to relayer
  const pullTxHash = await wallet.writeContract({
    address: getUsdcAddress(),
    abi: ERC20_ABI,
    functionName: "transferFrom",
    args: [params.agentWallet, relayerAddress, params.amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: pullTxHash });

  // 4. Ensure relayer has approved market contract to spend USDC
  await ensureUsdcApproval(params.marketAddress, params.amount);

  // 5. Place bet on-chain (USDC: relayer → market, position: agent wallet)
  const txHash = await wallet.writeContract({
    address: params.marketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: "placeBet",
    args: [
      params.outcome,
      params.amount,
      params.agentWallet,
      params.offchainBetId,
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash, pullTxHash };
}

export { CHAIN, PREDICTION_MARKET_ABI, ERC20_ABI, MANUAL_ORACLE_ABI, MARKET_FACTORY_ABI };
export { publicClient, getFactoryAddress, getOracleAddress, getUsdcAddress };
