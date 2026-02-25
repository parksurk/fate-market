import { ethers, network, run } from "hardhat";

const REAL_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DEFAULT_FEE_BPS = 200;
const DISPUTE_WINDOW = 3600;
const FATE_INITIAL_MINT = ethers.parseEther("10000000");
const SBT_BASE_URI = "https://api.fate.market/agents/sbt/";

const FOLLOW_FEE = 1_000_000n;
const PERIOD_DURATION = 30 * 24 * 60 * 60;
const TIMELOCK_MIN_DELAY = 2 * 24 * 60 * 60;
const VOTING_DELAY = 7200n;
const VOTING_PERIOD = 21600n;
const PROPOSAL_THRESHOLD = ethers.parseEther("100000");
const QUORUM_PERCENT = 4n;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function deployContract(
  name: string,
  factory: Awaited<ReturnType<typeof ethers.getContractFactory>>,
  args: unknown[],
  nonce: number,
) {
  console.log(`\nDeploying ${name} (nonce=${nonce})...`);
  const contract = await factory.deploy(...args, { nonce });
  const tx = contract.deploymentTransaction()!;
  console.log(`  tx: ${tx.hash}`);
  console.log(`  Waiting for 2 confirmations...`);
  await tx.wait(2);
  const addr = await contract.getAddress();
  console.log(`  ${name}: ${addr}`);
  await sleep(3000);
  return { contract, address: addr };
}

async function main() {
  if (network.name !== "base") {
    throw new Error("This script is for Base Mainnet only. Use --network base");
  }

  const [deployer] = await ethers.getSigners();
  let nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");

  console.log("=".repeat(60));
  console.log("Deploying ALL Contracts to Base Mainnet");
  console.log("=".repeat(60));
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`Nonce:     ${nonce}`);
  console.log(`USDC:      ${REAL_USDC}`);
  console.log("-".repeat(60));

  // === Phase 2 ===
  console.log("\n*** PHASE 2 — Core Market Infrastructure ***\n");

  const { address: fateTokenAddr } = await deployContract(
    "FateToken",
    await ethers.getContractFactory("FateToken"),
    [deployer.address, FATE_INITIAL_MINT],
    nonce++,
  );

  const { address: agentSBTAddr } = await deployContract(
    "AgentSBT",
    await ethers.getContractFactory("AgentSBT"),
    [deployer.address, SBT_BASE_URI],
    nonce++,
  );

  const { address: treasuryAddr } = await deployContract(
    "Treasury",
    await ethers.getContractFactory("Treasury"),
    [deployer.address],
    nonce++,
  );

  const { address: oracleAddr } = await deployContract(
    "ManualOracleAdapter",
    await ethers.getContractFactory("ManualOracleAdapter"),
    [deployer.address],
    nonce++,
  );

  const { address: marketImplAddr } = await deployContract(
    "PredictionMarket",
    await ethers.getContractFactory("PredictionMarket"),
    [],
    nonce++,
  );

  const { address: factoryAddr } = await deployContract(
    "MarketFactory",
    await ethers.getContractFactory("MarketFactory"),
    [marketImplAddr, REAL_USDC, oracleAddr, treasuryAddr, DEFAULT_FEE_BPS, DISPUTE_WINDOW, deployer.address],
    nonce++,
  );

  console.log("\n" + "=".repeat(60));
  console.log("Phase 2 Complete");
  console.log("=".repeat(60));
  console.log(`USDC (Circle):       ${REAL_USDC}`);
  console.log(`FateToken:           ${fateTokenAddr}`);
  console.log(`AgentSBT:            ${agentSBTAddr}`);
  console.log(`Treasury:            ${treasuryAddr}`);
  console.log(`ManualOracleAdapter: ${oracleAddr}`);
  console.log(`PredictionMarket:    ${marketImplAddr} (impl)`);
  console.log(`MarketFactory:       ${factoryAddr}`);

  // === Phase 3 ===
  console.log("\n*** PHASE 3 — Governance & Reputation ***\n");

  const { address: fateV2Addr } = await deployContract(
    "FateTokenV2",
    await ethers.getContractFactory("FateTokenV2"),
    [fateTokenAddr],
    nonce++,
  );

  const { address: scorerAddr } = await deployContract(
    "ReputationScorer",
    await ethers.getContractFactory("ReputationScorer"),
    [agentSBTAddr, deployer.address],
    nonce++,
  );

  const { address: vaultAddr } = await deployContract(
    "AgentVault",
    await ethers.getContractFactory("AgentVault"),
    [fateTokenAddr, REAL_USDC, agentSBTAddr, FOLLOW_FEE, PERIOD_DURATION, deployer.address],
    nonce++,
  );

  const { address: timelockAddr } = await deployContract(
    "FateTimelock",
    await ethers.getContractFactory("FateTimelock"),
    [TIMELOCK_MIN_DELAY, [], [ethers.ZeroAddress], deployer.address],
    nonce++,
  );

  const { address: governorAddr } = await deployContract(
    "FateGovernor",
    await ethers.getContractFactory("FateGovernor"),
    [fateV2Addr, timelockAddr, VOTING_DELAY, VOTING_PERIOD, PROPOSAL_THRESHOLD, QUORUM_PERCENT],
    nonce++,
  );

  // Grant roles
  console.log("\nGranting PROPOSER_ROLE to FateGovernor on Timelock...");
  const timelock = await ethers.getContractAt("FateTimelock", timelockAddr);
  const proposerTx = await timelock.grantRole(await timelock.PROPOSER_ROLE(), governorAddr, { nonce: nonce++ });
  await proposerTx.wait(2);
  await sleep(3000);
  console.log("  Done.");

  console.log("Granting CANCELLER_ROLE to FateGovernor on Timelock...");
  const cancellerTx = await timelock.grantRole(await timelock.CANCELLER_ROLE(), governorAddr, { nonce: nonce++ });
  await cancellerTx.wait(2);
  console.log("  Done.");

  // === Summary ===
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("\n" + "=".repeat(60));
  console.log("ALL CONTRACTS DEPLOYED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log(`Remaining balance: ${ethers.formatEther(balance)} ETH`);
  console.log("");
  console.log("--- .env values (copy these) ---");
  console.log(`USDC_ADDRESS=${REAL_USDC}`);
  console.log(`FATE_TOKEN_ADDRESS=${fateTokenAddr}`);
  console.log(`AGENT_SBT_ADDRESS=${agentSBTAddr}`);
  console.log(`TREASURY_ADDRESS=${treasuryAddr}`);
  console.log(`MANUAL_ORACLE_ADDRESS=${oracleAddr}`);
  console.log(`PREDICTION_MARKET_IMPL=${marketImplAddr}`);
  console.log(`MARKET_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`FATE_TOKEN_V2_ADDRESS=${fateV2Addr}`);
  console.log(`REPUTATION_SCORER_ADDRESS=${scorerAddr}`);
  console.log(`AGENT_VAULT_ADDRESS=${vaultAddr}`);
  console.log(`FATE_TIMELOCK_ADDRESS=${timelockAddr}`);
  console.log(`FATE_GOVERNOR_ADDRESS=${governorAddr}`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
