import { ethers, network } from "hardhat";

const DEPLOYED_USDC = "0x9D7BE7c0F0D80caD08d329f84A4437FC1481ce65";
const DEPLOYED_FATE = "0x28b65A625F27C0236E5073c99949b761E3e94cF8";
const DEPLOYED_AGENT_SBT = "0x9C87DEA5634b356aeef5957E1B5EA8CbC6dA365d";

const DEFAULT_FEE_BPS = 200;
const DISPUTE_WINDOW = 3600;

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = network.config.chainId ?? 31337;
  let nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");

  console.log("=".repeat(60));
  console.log(`Network:   ${network.name} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:   ${ethers.formatEther(balance)} ETH`);
  console.log(`Nonce:     ${nonce}`);
  console.log("=".repeat(60));

  console.log("\n1/4 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(deployer.address, { nonce: nonce++ });
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`   Treasury: ${treasuryAddr}`);

  console.log("\n2/4 Deploying ManualOracleAdapter...");
  const ManualOracle = await ethers.getContractFactory("ManualOracleAdapter");
  const manualOracle = await ManualOracle.deploy(deployer.address, { nonce: nonce++ });
  await manualOracle.waitForDeployment();
  const oracleAddr = await manualOracle.getAddress();
  console.log(`   ManualOracleAdapter: ${oracleAddr}`);

  console.log("\n3/4 Deploying PredictionMarket (implementation)...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const marketImpl = await PredictionMarket.deploy({ nonce: nonce++ });
  await marketImpl.waitForDeployment();
  const marketImplAddr = await marketImpl.getAddress();
  console.log(`   PredictionMarket impl: ${marketImplAddr}`);

  console.log("\n4/4 Deploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    marketImplAddr,
    DEPLOYED_USDC,
    oracleAddr,
    treasuryAddr,
    DEFAULT_FEE_BPS,
    DISPUTE_WINDOW,
    deployer.address,
    { nonce: nonce++ }
  );
  await marketFactory.waitForDeployment();
  const factoryAddr = await marketFactory.getAddress();
  console.log(`   MarketFactory: ${factoryAddr}`);

  const finalBalance = await ethers.provider.getBalance(deployer.address);

  console.log("\n" + "=".repeat(60));
  console.log("FULL Phase 2 Deployment Summary");
  console.log("=".repeat(60));
  console.log(`MockUSDC:            ${DEPLOYED_USDC}`);
  console.log(`FateToken:           ${DEPLOYED_FATE}`);
  console.log(`AgentSBT:            ${DEPLOYED_AGENT_SBT}`);
  console.log(`Treasury:            ${treasuryAddr}`);
  console.log(`ManualOracleAdapter: ${oracleAddr}`);
  console.log(`PredictionMarket:    ${marketImplAddr} (implementation)`);
  console.log(`MarketFactory:       ${factoryAddr}`);
  console.log("=".repeat(60));
  console.log(`Gas spent: ${ethers.formatEther(balance - finalBalance)} ETH`);
  console.log(`Remaining: ${ethers.formatEther(finalBalance)} ETH`);

  console.log("\nPhase 3 env vars:");
  console.log(`USDC_ADDRESS=${DEPLOYED_USDC}`);
  console.log(`FATE_TOKEN_ADDRESS=${DEPLOYED_FATE}`);
  console.log(`AGENT_SBT_ADDRESS=${DEPLOYED_AGENT_SBT}`);
  console.log(`TREASURY_ADDRESS=${treasuryAddr}`);
  console.log(`MARKET_FACTORY_ADDRESS=${factoryAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
