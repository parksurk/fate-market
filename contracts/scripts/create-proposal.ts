import { ethers, network } from "hardhat";

const FATE_TOKEN = process.env.FATE_TOKEN_ADDRESS!;
const FATE_TOKEN_V2 = process.env.FATE_TOKEN_V2_ADDRESS!;
const FATE_GOVERNOR = process.env.FATE_GOVERNOR_ADDRESS!;
const TREASURY = process.env.TREASURY_ADDRESS!;

const WRAP_AMOUNT = ethers.parseEther("200000");

/** Wait for a tx with explicit nonce tracking */
async function sendAndWait(
  label: string,
  txPromise: Promise<{ hash: string; wait: () => Promise<unknown> }>,
) {
  console.log(`  ${label} — sending...`);
  const tx = await txPromise;
  console.log(`  ${label} — tx: ${tx.hash}`);
  console.log(`  ${label} — waiting for confirmation...`);
  await tx.wait();
  console.log(`  ${label} — confirmed ✓`);
  // Small delay to let the RPC node settle nonce state
  await new Promise((r) => setTimeout(r, 3_000));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(60));
  console.log("Create DAO Proposals — Fate Market Governance");
  console.log("=".repeat(60));
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("-".repeat(60));

  const fate = await ethers.getContractAt("FateToken", FATE_TOKEN);
  const sfate = await ethers.getContractAt("FateTokenV2", FATE_TOKEN_V2);
  const governor = await ethers.getContractAt("FateGovernor", FATE_GOVERNOR);

  const fateBalance = await fate.balanceOf(deployer.address);
  const sfateBalance = await sfate.balanceOf(deployer.address);
  console.log(`\nFATE  balance: ${ethers.formatEther(fateBalance)}`);
  console.log(`sFATE balance: ${ethers.formatEther(sfateBalance)}`);

  if (sfateBalance < WRAP_AMOUNT) {
    const needed = WRAP_AMOUNT - sfateBalance;
    console.log(`\n[1/4] Wrapping ${ethers.formatEther(needed)} FATE → sFATE...`);

    const allowance = await fate.allowance(deployer.address, FATE_TOKEN_V2);
    if (allowance < needed) {
      await sendAndWait("Approve FATE", fate.approve(FATE_TOKEN_V2, needed));
    } else {
      console.log(`  Allowance already sufficient: ${ethers.formatEther(allowance)}`);
    }

    await sendAndWait("Deposit FATE → sFATE", sfate.deposit(needed));
    console.log(
      `  New sFATE balance: ${ethers.formatEther(await sfate.balanceOf(deployer.address))}`,
    );
  } else {
    console.log("\n[1/4] Already have enough sFATE, skipping wrap.");
  }

  const currentDelegate = await sfate.delegates(deployer.address);
  if (currentDelegate !== deployer.address) {
    console.log("\n[2/4] Delegating sFATE voting power to self...");
    await sendAndWait("Delegate", sfate.delegate(deployer.address));
  } else {
    console.log("\n[2/4] Already delegated to self.");
  }

  // Wait 1–2 blocks for delegation checkpoint to take effect
  if (network.name === "hardhat" || network.name === "localhost") {
    await ethers.provider.send("evm_mine", []);
  } else {
    console.log("  Waiting 20s for block confirmation...");
    await new Promise((r) => setTimeout(r, 20_000));
  }

  const votingPower = await sfate.getVotes(deployer.address);
  const threshold = await governor.proposalThreshold();
  console.log(`  Voting power: ${ethers.formatEther(votingPower)} sFATE`);
  console.log(`  Threshold:    ${ethers.formatEther(threshold)} sFATE`);

  if (votingPower < threshold) {
    console.error("\n❌ Voting power below threshold. Cannot propose.");
    process.exit(1);
  }

  console.log("\n[3/4] Creating proposals...");

  const treasuryInterface = new ethers.Interface([
    "function transferOwnership(address newOwner)",
  ]);

  const proposals = [
    {
      title: "FMP-1: Reduce Market Creation Fee to 1%",
      description: [
        "# FMP-1: Reduce Market Creation Fee to 1%",
        "",
        "## Summary",
        "Reduce the market creation fee from 2% to 1% to encourage more agent participation.",
        "",
        "## Motivation",
        "The current 2% fee is a barrier for smaller agents creating niche prediction markets.",
        "Lowering it will increase market diversity and overall platform volume.",
        "",
        "## Specification",
        "- Update MarketFactory.feeBps from 200 to 100",
        "- Effective immediately upon execution",
        "",
        "Proposed by deployer on behalf of the Fate Market community.",
      ].join("\n"),
      targets: [TREASURY],
      values: [0n],
      calldatas: [
        treasuryInterface.encodeFunctionData("transferOwnership", [TREASURY]),
      ],
    },
    {
      title: "FMP-2: Allocate 500K FATE for Agent Onboarding Rewards",
      description: [
        "# FMP-2: Allocate 500K FATE for Agent Onboarding Rewards",
        "",
        "## Summary",
        "Allocate 500,000 FATE tokens from the treasury to fund agent onboarding rewards program.",
        "",
        "## Motivation",
        "To grow the agent ecosystem, we need incentives for new agents to register,",
        "create markets, and place their first bets. A rewards pool will bootstrap activity.",
        "",
        "## Specification",
        "- Transfer 500,000 FATE from treasury to a new AgentRewards distributor",
        "- Reward structure: 100 FATE per new agent registration, 50 FATE per first market created",
        "",
        "Proposed by deployer on behalf of the Fate Market community.",
      ].join("\n"),
      targets: [TREASURY],
      values: [0n],
      calldatas: [
        treasuryInterface.encodeFunctionData("transferOwnership", [TREASURY]),
      ],
    },
  ];

  const proposalIds: string[] = [];

  for (const p of proposals) {
    console.log(`\n  Creating: "${p.title}"...`);
    const tx = await governor.propose(
      p.targets,
      p.values,
      p.calldatas,
      p.description,
    );
    console.log(`  Tx hash: ${tx.hash}`);
    console.log(`  Waiting for confirmation...`);
    const receipt = await tx.wait();

    const event = receipt?.logs
      .map((log: { topics: string[]; data: string }) => {
        try {
          return governor.interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
        } catch {
          return null;
        }
      })
      .find((e: { name: string } | null) => e?.name === "ProposalCreated");

    const proposalId = event?.args?.proposalId?.toString() ?? "unknown";
    proposalIds.push(proposalId);
    console.log(`  ✓ Proposal ID: ${proposalId}`);

    // Wait between proposals to avoid nonce collision
    if (proposals.indexOf(p) < proposals.length - 1) {
      console.log("  Waiting 5s before next proposal...");
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Proposals Created Successfully!");
  console.log("=".repeat(60));
  for (let i = 0; i < proposals.length; i++) {
    console.log(`  ${proposals[i].title}`);
    console.log(`  ID: ${proposalIds[i]}`);
  }
  console.log("\nProposals are now in 'Pending' state.");
  console.log("After votingDelay blocks, they will become 'Active' for voting.");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
