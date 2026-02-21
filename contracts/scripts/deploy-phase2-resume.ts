import { ethers, network } from "hardhat";

// ============================================================
// Phase 2 RESUME script
// Re-uses already-deployed MockUSDC + FateToken on Base Sepolia
// Deploys only: AgentSBT, Treasury, ManualOracleAdapter,
//               PredictionMarket (impl), MarketFactory
// ============================================================

const DEPLOYED_USDC = "0x9D7BE7c0F0D80caD08d329f84A4437FC1481ce65";
const DEPLOYED_FATE = "0x28b65A625F27C0236E5073c99949b761E3e94cF8";

const DEFAULT_FEE_BPS = 200;
const DISPUTE_WINDOW = 3600;
const SBT_BASE_URI = "https://api.fate.market/agents/sbt/";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = network.config.chainId ?? 31337;

  console.log("=".repeat(60));
  console.log("Phase 2 RESUME — Deploying remaining contracts");
  console.log("=".repeat(60));
  console.log(`Network:   ${network.name} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:   ${ethers.formatEther(balance)} ETH`);
  console.log("-".repeat(60));
  console.log(`Re-using MockUSDC:   ${DEPLOYED_USDC}`);
  console.log(`Re-using FateToken:  ${DEPLOYED_FATE}`);
  console.log("-".repeat(60));

  console.log("\n1/5 Deploying AgentSBT...");
  const AgentSBT = await ethers.getContractFactory("AgentSBT");
  const agentSBT = await AgentSBT.deploy(deployer.address, SBT_BASE_URI);
  await agentSBT.waitForDeployment();
  const agentSBTAddr = await agentSBT.getAddress();
  console.log(`   AgentSBT: ${agentSBTAddr}`);

  console.log("\n2/5 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`   Treasury: ${treasuryAddr}`);

  console.log("\n3/5 Deploying ManualOracleAdapter...");
  const ManualOracle = await ethers.getContractFactory("ManualOracleAdapter");
  const manualOracle = await ManualOracle.deploy(deployer.address);
  await manualOracle.waitForDeployment();
  const oracleAddr = await manualOracle.getAddress();
  console.log(`   ManualOracleAdapter: ${oracleAddr}`);

  console.log("\n4/5 Deploying PredictionMarket (implementation)...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const marketImpl = await PredictionMarket.deploy();
  await marketImpl.waitForDeployment();
  const marketImplAddr = await marketImpl.getAddress();
  console.log(`   PredictionMarket impl: ${marketImplAddr}`);

  console.log("\n5/5 Deploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    marketImplAddr,
    DEPLOYED_USDC,
    oracleAddr,
    treasuryAddr,
    DEFAULT_FEE_BPS,
    DISPUTE_WINDOW,
    deployer.address
  );
  await marketFactory.waitForDeployment();
  const factoryAddr = await marketFactory.getAddress();
  console.log(`   MarketFactory: ${factoryAddr}`);

  const finalBalance = await ethers.provider.getBalance(deployer.address);

  console.log("\n" + "=".repeat(60));
  console.log("Phase 2 RESUME — Deployment Summary");
  console.log("=".repeat(60));
  console.log(`MockUSDC (existing):   ${DEPLOYED_USDC}`);
  console.log(`FateToken (existing):  ${DEPLOYED_FATE}`);
  console.log(`AgentSBT:              ${agentSBTAddr}`);
  console.log(`Treasury:              ${treasuryAddr}`);
  console.log(`ManualOracleAdapter:   ${oracleAddr}`);
  console.log(`PredictionMarket:      ${marketImplAddr} (implementation)`);
  console.log(`MarketFactory:         ${factoryAddr}`);
  console.log("=".repeat(60));
  console.log(`Gas spent: ${ethers.formatEther(balance - finalBalance)} ETH`);
  console.log(`Remaining: ${ethers.formatEther(finalBalance)} ETH`);
  console.log("=".repeat(60));

  // Print env vars for Phase 3
  console.log("\n📋 Set these in .env for Phase 3 deployment:");
  console.log(`USDC_ADDRESS=${DEPLOYED_USDC}`);
  console.log(`FATE_TOKEN_ADDRESS=${DEPLOYED_FATE}`);
  console.log(`AGENT_SBT_ADDRESS=${agentSBTAddr}`);
  console.log(`TREASURY_ADDRESS=${treasuryAddr}`);
  console.log(`MARKET_FACTORY_ADDRESS=${factoryAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
