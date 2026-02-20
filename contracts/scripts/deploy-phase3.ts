import { ethers, network, run } from "hardhat";

interface Phase2Addresses {
  fateToken: string;
  agentSBT: string;
  usdc: string;
  treasury: string;
  marketFactory: string;
}

const FOLLOW_FEE = 1_000_000n; // 1 USDC
const PERIOD_DURATION = 30 * 24 * 60 * 60; // 30 days
const TIMELOCK_MIN_DELAY = 2 * 24 * 60 * 60; // 2 days
const VOTING_DELAY = 7200n; // ~1 day on Base (12s blocks)
const VOTING_PERIOD = 21600n; // ~3 days on Base
const PROPOSAL_THRESHOLD = ethers.parseEther("100000"); // 100k sFATE
const QUORUM_PERCENT = 4n; // 4%

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = network.config.chainId ?? 31337;

  console.log("=".repeat(60));
  console.log("Deploying Phase 3 Contracts");
  console.log("=".repeat(60));
  console.log(`Network:   ${network.name} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("-".repeat(60));

  const phase2: Phase2Addresses = {
    fateToken: process.env.FATE_TOKEN_ADDRESS ?? "",
    agentSBT: process.env.AGENT_SBT_ADDRESS ?? "",
    usdc: process.env.USDC_ADDRESS ?? "",
    treasury: process.env.TREASURY_ADDRESS ?? "",
    marketFactory: process.env.MARKET_FACTORY_ADDRESS ?? "",
  };

  if (chainId === 31337) {
    console.log("Local network: deploying Phase 2 dependencies first...\n");

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    phase2.usdc = await mockUsdc.getAddress();

    const FateToken = await ethers.getContractFactory("FateToken");
    const fateToken = await FateToken.deploy(deployer.address, ethers.parseEther("10000000"));
    await fateToken.waitForDeployment();
    phase2.fateToken = await fateToken.getAddress();

    const AgentSBT = await ethers.getContractFactory("AgentSBT");
    const agentSBT = await AgentSBT.deploy(deployer.address, "https://api.fate.market/agents/sbt/");
    await agentSBT.waitForDeployment();
    phase2.agentSBT = await agentSBT.getAddress();

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(deployer.address);
    await treasury.waitForDeployment();
    phase2.treasury = await treasury.getAddress();

    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const marketImpl = await PredictionMarket.deploy();
    await marketImpl.waitForDeployment();

    const ManualOracle = await ethers.getContractFactory("ManualOracleAdapter");
    const oracle = await ManualOracle.deploy(deployer.address);
    await oracle.waitForDeployment();

    const marketFactory = await MarketFactory.deploy(
      await marketImpl.getAddress(),
      phase2.usdc,
      await oracle.getAddress(),
      phase2.treasury,
      200,
      3600,
      deployer.address
    );
    await marketFactory.waitForDeployment();
    phase2.marketFactory = await marketFactory.getAddress();

    console.log("Phase 2 dependencies deployed.\n");
  }

  for (const [key, val] of Object.entries(phase2)) {
    if (!val) {
      console.error(`Missing Phase 2 address: ${key}. Set env var or deploy on local network.`);
      process.exit(1);
    }
  }

  const votingDelay = chainId === 31337 ? 1n : VOTING_DELAY;
  const votingPeriod = chainId === 31337 ? 50n : VOTING_PERIOD;

  console.log("\n1/5 Deploying FateTokenV2 (sFATE)...");
  const FateTokenV2 = await ethers.getContractFactory("FateTokenV2");
  const fateTokenV2 = await FateTokenV2.deploy(phase2.fateToken);
  await fateTokenV2.waitForDeployment();
  console.log(`   FateTokenV2: ${await fateTokenV2.getAddress()}`);

  console.log("\n2/5 Deploying ReputationScorer...");
  const ReputationScorer = await ethers.getContractFactory("ReputationScorer");
  const scorer = await ReputationScorer.deploy(phase2.agentSBT, deployer.address);
  await scorer.waitForDeployment();
  console.log(`   ReputationScorer: ${await scorer.getAddress()}`);

  console.log("\n3/5 Deploying AgentVault...");
  const AgentVault = await ethers.getContractFactory("AgentVault");
  const vault = await AgentVault.deploy(
    phase2.fateToken,
    phase2.usdc,
    phase2.agentSBT,
    FOLLOW_FEE,
    PERIOD_DURATION,
    deployer.address
  );
  await vault.waitForDeployment();
  console.log(`   AgentVault: ${await vault.getAddress()}`);

  console.log("\n4/5 Deploying FateTimelock...");
  const FateTimelock = await ethers.getContractFactory("FateTimelock");
  const timelockDelay = chainId === 31337 ? 60 : TIMELOCK_MIN_DELAY;
  const timelock = await FateTimelock.deploy(
    timelockDelay,
    [],
    [ethers.ZeroAddress],
    deployer.address
  );
  await timelock.waitForDeployment();
  console.log(`   FateTimelock: ${await timelock.getAddress()}`);

  console.log("\n5/5 Deploying FateGovernor...");
  const FateGovernor = await ethers.getContractFactory("FateGovernor");
  const governor = await FateGovernor.deploy(
    await fateTokenV2.getAddress(),
    await timelock.getAddress(),
    votingDelay,
    votingPeriod,
    PROPOSAL_THRESHOLD,
    QUORUM_PERCENT
  );
  await governor.waitForDeployment();
  console.log(`   FateGovernor: ${await governor.getAddress()}`);

  console.log("\nGranting PROPOSER_ROLE to FateGovernor on Timelock...");
  const timelockContract = await ethers.getContractAt("FateTimelock", await timelock.getAddress());
  const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
  await timelockContract.grantRole(PROPOSER_ROLE, await governor.getAddress());
  console.log("   Done.");

  console.log("\nGranting CANCELLER_ROLE to FateGovernor on Timelock...");
  const CANCELLER_ROLE = await timelockContract.CANCELLER_ROLE();
  await timelockContract.grantRole(CANCELLER_ROLE, await governor.getAddress());
  console.log("   Done.");

  console.log("\n" + "=".repeat(60));
  console.log("Phase 3 Deployment Summary");
  console.log("=".repeat(60));
  console.log(`FateTokenV2 (sFATE): ${await fateTokenV2.getAddress()}`);
  console.log(`ReputationScorer:    ${await scorer.getAddress()}`);
  console.log(`AgentVault:          ${await vault.getAddress()}`);
  console.log(`FateTimelock:        ${await timelock.getAddress()}`);
  console.log(`FateGovernor:        ${await governor.getAddress()}`);
  console.log("=".repeat(60));

  console.log("\n⚠️  Post-deployment steps (DAO ownership transfer):");
  console.log(`  1. Grant DEFAULT_ADMIN_ROLE on MarketFactory (${phase2.marketFactory}) to Timelock`);
  console.log(`  2. Grant WITHDRAWER_ROLE on Treasury (${phase2.treasury}) to Timelock`);
  console.log("  3. Renounce TIMELOCK_ADMIN_ROLE from deployer on Timelock (optional, for full decentralization)");

  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("\nSkipping verification on local network.");
    return;
  }

  console.log("\nWaiting for block confirmations before verifying...");
  await governor.deploymentTransaction()?.wait(5);

  const contracts = [
    { name: "FateTokenV2", address: await fateTokenV2.getAddress(), args: [phase2.fateToken] },
    { name: "ReputationScorer", address: await scorer.getAddress(), args: [phase2.agentSBT, deployer.address] },
    {
      name: "AgentVault",
      address: await vault.getAddress(),
      args: [phase2.fateToken, phase2.usdc, phase2.agentSBT, FOLLOW_FEE, PERIOD_DURATION, deployer.address],
    },
    {
      name: "FateTimelock",
      address: await timelock.getAddress(),
      args: [TIMELOCK_MIN_DELAY, [], [ethers.ZeroAddress], deployer.address],
    },
    {
      name: "FateGovernor",
      address: await governor.getAddress(),
      args: [
        await fateTokenV2.getAddress(),
        await timelock.getAddress(),
        VOTING_DELAY,
        VOTING_PERIOD,
        PROPOSAL_THRESHOLD,
        QUORUM_PERCENT,
      ],
    },
  ];

  for (const c of contracts) {
    console.log(`\nVerifying ${c.name}...`);
    try {
      await run("verify:verify", { address: c.address, constructorArguments: c.args });
      console.log(`  ${c.name} verified!`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Already Verified")) {
        console.log(`  ${c.name} already verified.`);
      } else {
        console.error(`  ${c.name} verification failed:`, error);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
