import { ethers, network, run } from "hardhat";

const USDC_ADDRESSES: Record<number, string> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  84532: "", // Will deploy MockUSDC on testnet
};

const DEFAULT_FEE_BPS = 200;
const DISPUTE_WINDOW = 3600;
const FATE_INITIAL_MINT = ethers.parseEther("10000000");
const SBT_BASE_URI = "https://api.fate.market/agents/sbt/";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = network.config.chainId ?? 31337;

  console.log("=".repeat(60));
  console.log("Deploying Phase 2 Contracts");
  console.log("=".repeat(60));
  console.log(`Network:   ${network.name} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("-".repeat(60));

  let usdcAddress = USDC_ADDRESSES[chainId];
  if (!usdcAddress) {
    console.log("Deploying MockUSDC for testing...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log(`MockUSDC deployed to: ${usdcAddress}`);
  } else {
    console.log(`Using USDC at: ${usdcAddress}`);
  }

  console.log("\n1/6 Deploying FateToken...");
  const FateToken = await ethers.getContractFactory("FateToken");
  const fateToken = await FateToken.deploy(deployer.address, FATE_INITIAL_MINT);
  await fateToken.waitForDeployment();
  console.log(`   FateToken: ${await fateToken.getAddress()}`);

  console.log("\n2/6 Deploying AgentSBT...");
  const AgentSBT = await ethers.getContractFactory("AgentSBT");
  const agentSBT = await AgentSBT.deploy(deployer.address, SBT_BASE_URI);
  await agentSBT.waitForDeployment();
  console.log(`   AgentSBT: ${await agentSBT.getAddress()}`);

  console.log("\n3/6 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  console.log(`   Treasury: ${await treasury.getAddress()}`);

  console.log("\n4/6 Deploying ManualOracleAdapter...");
  const ManualOracle = await ethers.getContractFactory("ManualOracleAdapter");
  const manualOracle = await ManualOracle.deploy(deployer.address);
  await manualOracle.waitForDeployment();
  console.log(`   ManualOracleAdapter: ${await manualOracle.getAddress()}`);

  console.log("\n5/6 Deploying PredictionMarket (implementation)...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const marketImpl = await PredictionMarket.deploy();
  await marketImpl.waitForDeployment();
  console.log(`   PredictionMarket impl: ${await marketImpl.getAddress()}`);

  console.log("\n6/6 Deploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    await marketImpl.getAddress(),
    usdcAddress,
    await manualOracle.getAddress(),
    await treasury.getAddress(),
    DEFAULT_FEE_BPS,
    DISPUTE_WINDOW,
    deployer.address
  );
  await marketFactory.waitForDeployment();
  console.log(`   MarketFactory: ${await marketFactory.getAddress()}`);

  console.log("\n" + "=".repeat(60));
  console.log("Phase 2 Deployment Summary");
  console.log("=".repeat(60));
  console.log(`USDC:                ${usdcAddress}`);
  console.log(`FateToken:           ${await fateToken.getAddress()}`);
  console.log(`AgentSBT:            ${await agentSBT.getAddress()}`);
  console.log(`Treasury:            ${await treasury.getAddress()}`);
  console.log(`ManualOracleAdapter: ${await manualOracle.getAddress()}`);
  console.log(`PredictionMarket:    ${await marketImpl.getAddress()} (implementation)`);
  console.log(`MarketFactory:       ${await marketFactory.getAddress()}`);
  console.log("=".repeat(60));

  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("\nSkipping verification on local network.");
    return;
  }

  console.log("\nWaiting for block confirmations before verifying...");
  await marketFactory.deploymentTransaction()?.wait(5);

  const contracts = [
    { name: "FateToken", address: await fateToken.getAddress(), args: [deployer.address, FATE_INITIAL_MINT] },
    { name: "AgentSBT", address: await agentSBT.getAddress(), args: [deployer.address, SBT_BASE_URI] },
    { name: "Treasury", address: await treasury.getAddress(), args: [deployer.address] },
    { name: "ManualOracleAdapter", address: await manualOracle.getAddress(), args: [deployer.address] },
    { name: "PredictionMarket", address: await marketImpl.getAddress(), args: [] },
    {
      name: "MarketFactory",
      address: await marketFactory.getAddress(),
      args: [
        await marketImpl.getAddress(),
        usdcAddress,
        await manualOracle.getAddress(),
        await treasury.getAddress(),
        DEFAULT_FEE_BPS,
        DISPUTE_WINDOW,
        deployer.address,
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
