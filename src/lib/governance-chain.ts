import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia, base } from "viem/chains";

const CHAIN = process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

const REPUTATION_SCORER_ABI = parseAbi([
  "function computeScore(uint256 tokenId) external view returns (uint256)",
  "function getScore(uint256 tokenId) external view returns (uint256)",
  "function lastScoreUpdate(uint256 tokenId) external view returns (uint256)",
]);

const AGENT_VAULT_ABI = parseAbi([
  "function vaults(uint256 tokenId) external view returns (uint256 totalStaked, uint256 accRewardPerShare, uint256 totalFollowFeesCollected)",
  "function stakes(uint256 tokenId, address staker) external view returns (uint256 amount, uint256 rewardDebt)",
  "function pendingRewards(uint256 tokenId, address staker) external view returns (uint256)",
  "function isSubscriptionActive(uint256 tokenId, address follower) external view returns (bool)",
  "function followFeeAmount() external view returns (uint256)",
  "function periodDuration() external view returns (uint256)",
]);

const FATE_GOVERNOR_ABI = parseAbi([
  "function state(uint256 proposalId) external view returns (uint8)",
  "function proposalVotes(uint256 proposalId) external view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function proposalDeadline(uint256 proposalId) external view returns (uint256)",
  "function proposalSnapshot(uint256 proposalId) external view returns (uint256)",
  "function quorum(uint256 blockNumber) external view returns (uint256)",
  "function votingDelay() external view returns (uint256)",
  "function votingPeriod() external view returns (uint256)",
  "function proposalThreshold() external view returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
]);

const FATE_TOKEN_V2_ABI = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",
  "function getVotes(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
]);

function getScorerAddress(): `0x${string}` {
  const addr = process.env.REPUTATION_SCORER_ADDRESS?.trim();
  if (!addr) throw new Error("REPUTATION_SCORER_ADDRESS not set");
  return addr as `0x${string}`;
}

function getVaultAddress(): `0x${string}` {
  const addr = process.env.AGENT_VAULT_ADDRESS?.trim();
  if (!addr) throw new Error("AGENT_VAULT_ADDRESS not set");
  return addr as `0x${string}`;
}

function getGovernorAddress(): `0x${string}` {
  const addr = process.env.FATE_GOVERNOR_ADDRESS?.trim();
  if (!addr) throw new Error("FATE_GOVERNOR_ADDRESS not set");
  return addr as `0x${string}`;
}

function getTokenV2Address(): `0x${string}` {
  const addr = process.env.FATE_TOKEN_V2_ADDRESS?.trim();
  if (!addr) throw new Error("FATE_TOKEN_V2_ADDRESS not set");
  return addr as `0x${string}`;
}

export async function getAgentReputationScore(tokenId: bigint): Promise<number> {
  const score = await publicClient.readContract({
    address: getScorerAddress(),
    abi: REPUTATION_SCORER_ABI,
    functionName: "computeScore",
    args: [tokenId],
  });
  return Number(score);
}

export async function getVaultInfo(tokenId: bigint) {
  const [totalStaked, accRewardPerShare, totalFollowFeesCollected] = await publicClient.readContract({
    address: getVaultAddress(),
    abi: AGENT_VAULT_ABI,
    functionName: "vaults",
    args: [tokenId],
  });
  return {
    totalStaked: totalStaked.toString(),
    totalFollowFeesCollected: totalFollowFeesCollected.toString(),
  };
}

export async function getStakeInfo(tokenId: bigint, staker: `0x${string}`) {
  const [amount] = await publicClient.readContract({
    address: getVaultAddress(),
    abi: AGENT_VAULT_ABI,
    functionName: "stakes",
    args: [tokenId, staker],
  });
  const pending = await publicClient.readContract({
    address: getVaultAddress(),
    abi: AGENT_VAULT_ABI,
    functionName: "pendingRewards",
    args: [tokenId, staker],
  });
  return {
    staked: amount.toString(),
    pendingRewards: pending.toString(),
  };
}

export async function getFollowFee(): Promise<string> {
  const fee = await publicClient.readContract({
    address: getVaultAddress(),
    abi: AGENT_VAULT_ABI,
    functionName: "followFeeAmount",
  });
  return fee.toString();
}

export async function isSubscriptionActive(tokenId: bigint, follower: `0x${string}`): Promise<boolean> {
  return publicClient.readContract({
    address: getVaultAddress(),
    abi: AGENT_VAULT_ABI,
    functionName: "isSubscriptionActive",
    args: [tokenId, follower],
  });
}

export async function getProposalState(proposalId: bigint): Promise<number> {
  const state = await publicClient.readContract({
    address: getGovernorAddress(),
    abi: FATE_GOVERNOR_ABI,
    functionName: "state",
    args: [proposalId],
  });
  return Number(state);
}

export async function getProposalVotes(proposalId: bigint) {
  const [againstVotes, forVotes, abstainVotes] = await publicClient.readContract({
    address: getGovernorAddress(),
    abi: FATE_GOVERNOR_ABI,
    functionName: "proposalVotes",
    args: [proposalId],
  });
  return {
    forVotes: forVotes.toString(),
    againstVotes: againstVotes.toString(),
    abstainVotes: abstainVotes.toString(),
  };
}

export async function getGovernorSettings() {
  const [votingDelay, votingPeriod, threshold] = await Promise.all([
    publicClient.readContract({ address: getGovernorAddress(), abi: FATE_GOVERNOR_ABI, functionName: "votingDelay" }),
    publicClient.readContract({ address: getGovernorAddress(), abi: FATE_GOVERNOR_ABI, functionName: "votingPeriod" }),
    publicClient.readContract({ address: getGovernorAddress(), abi: FATE_GOVERNOR_ABI, functionName: "proposalThreshold" }),
  ]);
  return {
    votingDelay: votingDelay.toString(),
    votingPeriod: votingPeriod.toString(),
    proposalThreshold: threshold.toString(),
  };
}

export async function getOnchainProposals() {
  const addr = getGovernorAddress();

  const currentBlock = await publicClient.getBlockNumber();
  // Base Sepolia RPC limits eth_getLogs to 10,000 block range
  const fromBlock = currentBlock > BigInt(9999) ? currentBlock - BigInt(9999) : BigInt(0);

  const logs = await publicClient.getLogs({
    address: addr,
    event: FATE_GOVERNOR_ABI[8],
    fromBlock,
    toBlock: "latest",
  });

  const proposals = await Promise.all(
    logs.map(async (log) => {
      const { proposalId, proposer, voteStart, voteEnd, description } = log.args;
      if (proposalId == null) return null;

      const [state, votes] = await Promise.all([
        getProposalState(proposalId),
        getProposalVotes(proposalId),
      ]);

      const lines = (description ?? "").split("\n");
      const title = lines[0]?.replace(/^#\s*/, "") || `Proposal ${proposalId.toString().slice(0, 8)}…`;
      const body = lines.slice(1).join("\n").trim();

      return {
        id: proposalId.toString(),
        proposalId: proposalId.toString(),
        proposerAddress: proposer ?? "0x",
        title,
        description: body || title,
        status: governorStateToString(state).toLowerCase() as string,
        forVotes: votes.forVotes,
        againstVotes: votes.againstVotes,
        abstainVotes: votes.abstainVotes,
        startBlock: voteStart != null ? Number(voteStart) : undefined,
        endBlock: voteEnd != null ? Number(voteEnd) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }),
  );

  return proposals.filter(Boolean);
}

export async function getSfateBalance(address: `0x${string}`): Promise<string> {
  const balance = await publicClient.readContract({
    address: getTokenV2Address(),
    abi: FATE_TOKEN_V2_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  return balance.toString();
}

export async function getVotingPower(address: `0x${string}`): Promise<string> {
  const votes = await publicClient.readContract({
    address: getTokenV2Address(),
    abi: FATE_TOKEN_V2_ABI,
    functionName: "getVotes",
    args: [address],
  });
  return votes.toString();
}

const GOVERNOR_STATES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"] as const;

export function governorStateToString(state: number): string {
  return GOVERNOR_STATES[state] ?? "Unknown";
}

export {
  publicClient as governancePublicClient,
  REPUTATION_SCORER_ABI,
  AGENT_VAULT_ABI,
  FATE_GOVERNOR_ABI,
  FATE_TOKEN_V2_ABI,
  getScorerAddress,
  getVaultAddress,
  getGovernorAddress,
  getTokenV2Address,
};
