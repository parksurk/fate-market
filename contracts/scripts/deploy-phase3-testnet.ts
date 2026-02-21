import { ethers, network } from "hardhat";

const PHASE2 = {
  fateToken: process.env.FATE_TOKEN_ADDRESS || "0x28b65A625F27C0236E5073c99949b761E3e94cF8",
  agentSBT: process.env.AGENT_SBT_ADDRESS || "0x9C87DEA5634b356aeef5957E1B5EA8CbC6dA365d",
  usdc: process.env.USDC_ADDRESS || "0x9D7BE7c0F0D80caD08d329f84A4437FC1481ce65",
  treasury: process.env.TREASURY_ADDRESS || "0x63c2Bb560053F0f36c6eC57E56a552F48A829830",
  marketFactory: process.env.MARKET_FACTORY_ADDRESS || "0x7273F4C30A58092a92249F140b35320023Cf94ee",
};

const FOLLOW_FEE = 1_000_000n;
const PERIOD_DURATION = 30 * 24 * 60 * 60;
const TIMELOCK_MIN_DELAY = 2 * 24 * 60 * 60;
const VOTING_DELAY = 7200n;
const VOTING_PERIOD = 21600n;
const PROPOSAL_THRESHOLD = ethers.parseEther("100000");
const QUORUM_PERCENT = 4n;

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = network.config.chainId ?? 31337;
  let nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("=".repeat(60));
  console.log("Phase 3 Testnet Deployment");
  console.log("=".repeat(60));
  console.log(`Network:  ${network.name} (chainId: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH`);
  console.log(`Nonce:    ${nonce}`);
  console.log("=".repeat(60));

  console.log("\n1/5 Deploying FateTokenV2 (sFATE)...");
  const FateTokenV2 = await ethers.getContractFactory("FateTokenV2");
  const fateTokenV2 = await FateTokenV2.deploy(PHASE2.fateToken, { nonce: nonce++ });
  await fateTokenV2.waitForDeployment();
  const fateTokenV2Addr = await fateTokenV2.getAddress();
  console.log(`   FateTokenV2: ${fateTokenV2Addr}`);

  console.log("\n2/5 Deploying ReputationScorer...");
  const ReputationScorer = await ethers.getContractFactory("ReputationScorer");
  const scorer = await ReputationScorer.deploy(PHASE2.agentSBT, deployer.address, { nonce: nonce++ });
  await scorer.waitForDeployment();
  const scorerAddr = await scorer.getAddress();
  console.log(`   ReputationScorer: ${scorerAddr}`);

  console.log("\n3/5 Deploying AgentVault...");
  const AgentVault = await ethers.getContractFactory("AgentVault");
  const vault = await AgentVault.deploy(
    PHASE2.fateToken,
    PHASE2.usdc,
    PHASE2.agentSBT,
    FOLLOW_FEE,
    PERIOD_DURATION,
    deployer.address,
    { nonce: nonce++ }
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`   AgentVault: ${vaultAddr}`);

  console.log("\n4/5 Deploying FateTimelock...");
  const FateTimelock = await ethers.getContractFactory("FateTimelock");
  const timelock = await FateTimelock.deploy(
    TIMELOCK_MIN_DELAY,
    [],
    [ethers.ZeroAddress],
    deployer.address,
    { nonce: nonce++ }
  );
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();
  console.log(`   FateTimelock: ${timelockAddr}`);

  console.log("\n5/5 Deploying FateGovernor...");
  const FateGovernor = await ethers.getContractFactory("FateGovernor");
  const governor = await FateGovernor.deploy(
    fateTokenV2Addr,
    timelockAddr,
    VOTING_DELAY,
    VOTING_PERIOD,
    PROPOSAL_THRESHOLD,
    QUORUM_PERCENT,
    { nonce: nonce++ }
  );
  await governor.waitForDeployment();
  const governorAddr = await governor.getAddress();
  console.log(`   FateGovernor: ${governorAddr}`);

  console.log("\nGranting PROPOSER_ROLE to FateGovernor...");
  const timelockContract = await ethers.getContractAt("FateTimelock", timelockAddr);
  const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
  const tx1 = await timelockContract.grantRole(PROPOSER_ROLE, governorAddr, { nonce: nonce++ });
  await tx1.wait();
  console.log("   Done.");

  console.log("Granting CANCELLER_ROLE to FateGovernor...");
  const CANCELLER_ROLE = await timelockContract.CANCELLER_ROLE();
  const tx2 = await timelockContract.grantRole(CANCELLER_ROLE, governorAddr, { nonce: nonce++ });
  await tx2.wait();
  console.log("   Done.");

  const finalBalance = await ethers.provider.getBalance(deployer.address);

  console.log("\n" + "=".repeat(60));
  console.log("Phase 3 Deployment Summary");
  console.log("=".repeat(60));
  console.log(`FateTokenV2 (sFATE): ${fateTokenV2Addr}`);
  console.log(`ReputationScorer:    ${scorerAddr}`);
  console.log(`AgentVault:          ${vaultAddr}`);
  console.log(`FateTimelock:        ${timelockAddr}`);
  console.log(`FateGovernor:        ${governorAddr}`);
  console.log("=".repeat(60));
  console.log(`Gas spent: ${ethers.formatEther(balance - finalBalance)} ETH`);
  console.log(`Remaining: ${ethers.formatEther(finalBalance)} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
