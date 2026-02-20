import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  FateToken,
  FateTokenV2,
  AgentSBT,
  ReputationScorer,
  AgentVault,
  FateGovernor,
  FateTimelock,
  MockUSDC,
  Treasury,
} from "../typechain-types";

describe("Phase 3: Full DeFi", function () {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let agentWallet: SignerWithAddress;

  let fateV1: FateToken;
  let fateV2: FateTokenV2;
  let usdc: MockUSDC;
  let sbt: AgentSBT;
  let scorer: ReputationScorer;
  let vault: AgentVault;
  let governor: FateGovernor;
  let timelock: FateTimelock;

  const INITIAL_FATE = ethers.parseEther("10000000"); // 10M FATE
  const FOLLOW_FEE = 1_000_000n; // 1 USDC (6 decimals)
  const PERIOD_DURATION = 30 * 24 * 60 * 60; // 30 days
  const TIMELOCK_DELAY = 2 * 24 * 60 * 60; // 2 days

  beforeEach(async function () {
    [admin, user1, user2, agentWallet] = await ethers.getSigners();

    // Deploy FateToken V1
    const FateTokenFactory = await ethers.getContractFactory("FateToken");
    fateV1 = (await FateTokenFactory.deploy(
      admin.address,
      INITIAL_FATE
    )) as unknown as FateToken;

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = (await MockUSDCFactory.deploy()) as unknown as MockUSDC;

    // Deploy AgentSBT
    const AgentSBTFactory = await ethers.getContractFactory("AgentSBT");
    sbt = (await AgentSBTFactory.deploy(
      admin.address,
      "https://api.fate.market/agents/sbt/"
    )) as unknown as AgentSBT;

    // Deploy FateTokenV2
    const FateTokenV2Factory = await ethers.getContractFactory("FateTokenV2");
    fateV2 = (await FateTokenV2Factory.deploy(
      await fateV1.getAddress()
    )) as unknown as FateTokenV2;

    // Deploy ReputationScorer
    const ScorerFactory = await ethers.getContractFactory("ReputationScorer");
    scorer = (await ScorerFactory.deploy(
      await sbt.getAddress(),
      admin.address
    )) as unknown as ReputationScorer;

    // Deploy AgentVault
    const VaultFactory = await ethers.getContractFactory("AgentVault");
    vault = (await VaultFactory.deploy(
      await fateV1.getAddress(),
      await usdc.getAddress(),
      await sbt.getAddress(),
      FOLLOW_FEE,
      PERIOD_DURATION,
      admin.address
    )) as unknown as AgentVault;

    // Deploy FateTimelock (proposers/executors set after governor deploy)
    const TimelockFactory = await ethers.getContractFactory("FateTimelock");
    timelock = (await TimelockFactory.deploy(
      TIMELOCK_DELAY,
      [], // proposers — will add governor later
      [ethers.ZeroAddress], // executors — anyone
      admin.address
    )) as unknown as FateTimelock;

    // Deploy FateGovernor
    const GovernorFactory = await ethers.getContractFactory("FateGovernor");
    governor = (await GovernorFactory.deploy(
      await fateV2.getAddress(),
      await timelock.getAddress(),
      1n, // votingDelay: 1 block (for testing)
      50n, // votingPeriod: 50 blocks (for testing)
      ethers.parseEther("1000"), // proposalThreshold: 1000 sFATE
      4n // quorum: 4%
    )) as unknown as FateGovernor;

    // Grant governor the PROPOSER_ROLE on timelock
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    await timelock.connect(admin).grantRole(PROPOSER_ROLE, await governor.getAddress());

    // Give FATE to users for testing
    await fateV1.connect(admin).transfer(user1.address, ethers.parseEther("500000"));
    await fateV1.connect(admin).transfer(user2.address, ethers.parseEther("200000"));

    // Mint USDC to users
    await usdc.mint(user1.address, 100_000_000n); // 100 USDC
    await usdc.mint(user2.address, 100_000_000n);
  });

  // ===========================================================================
  // FateTokenV2
  // ===========================================================================

  describe("FateTokenV2 (sFATE)", function () {
    it("has correct name and symbol", async function () {
      expect(await fateV2.name()).to.equal("Staked Fate Token");
      expect(await fateV2.symbol()).to.equal("sFATE");
    });

    it("deposit: wraps FATE V1 → sFATE 1:1", async function () {
      const amount = ethers.parseEther("10000");
      await fateV1.connect(user1).approve(await fateV2.getAddress(), amount);
      await fateV2.connect(user1).deposit(amount);

      expect(await fateV2.balanceOf(user1.address)).to.equal(amount);
      expect(await fateV1.balanceOf(await fateV2.getAddress())).to.equal(amount);
    });

    it("withdraw: unwraps sFATE → FATE V1 1:1", async function () {
      const amount = ethers.parseEther("10000");
      await fateV1.connect(user1).approve(await fateV2.getAddress(), amount);
      await fateV2.connect(user1).deposit(amount);

      const balanceBefore = await fateV1.balanceOf(user1.address);
      await fateV2.connect(user1).withdraw(amount);

      expect(await fateV2.balanceOf(user1.address)).to.equal(0n);
      expect(await fateV1.balanceOf(user1.address)).to.equal(balanceBefore + amount);
    });

    it("reverts on zero deposit", async function () {
      await expect(fateV2.connect(user1).deposit(0n)).to.be.revertedWithCustomError(
        fateV2,
        "ZeroAmount"
      );
    });

    it("reverts on zero withdraw", async function () {
      await expect(fateV2.connect(user1).withdraw(0n)).to.be.revertedWithCustomError(
        fateV2,
        "ZeroAmount"
      );
    });

    it("reverts when withdrawing more than deposited", async function () {
      const amount = ethers.parseEther("10000");
      await fateV1.connect(user1).approve(await fateV2.getAddress(), amount);
      await fateV2.connect(user1).deposit(amount);

      await expect(
        fateV2.connect(user1).withdraw(amount + 1n)
      ).to.be.reverted; // ERC20 insufficient balance
    });

    it("delegation: sets voting power correctly", async function () {
      const amount = ethers.parseEther("10000");
      await fateV1.connect(user1).approve(await fateV2.getAddress(), amount);
      await fateV2.connect(user1).deposit(amount);

      // Before delegation, voting power is 0
      expect(await fateV2.getVotes(user1.address)).to.equal(0n);

      // Self-delegate
      await fateV2.connect(user1).delegate(user1.address);
      expect(await fateV2.getVotes(user1.address)).to.equal(amount);
    });

    it("delegation: can delegate to another address", async function () {
      const amount = ethers.parseEther("10000");
      await fateV1.connect(user1).approve(await fateV2.getAddress(), amount);
      await fateV2.connect(user1).deposit(amount);
      await fateV2.connect(user1).delegate(user2.address);

      expect(await fateV2.getVotes(user1.address)).to.equal(0n);
      expect(await fateV2.getVotes(user2.address)).to.equal(amount);
    });

    it("round-trip: deposit and withdraw preserves V1 balance", async function () {
      const initialBalance = await fateV1.balanceOf(user1.address);
      const amount = ethers.parseEther("50000");

      await fateV1.connect(user1).approve(await fateV2.getAddress(), amount);
      await fateV2.connect(user1).deposit(amount);
      await fateV2.connect(user1).withdraw(amount);

      expect(await fateV1.balanceOf(user1.address)).to.equal(initialBalance);
      expect(await fateV2.balanceOf(user1.address)).to.equal(0n);
    });
  });

  // ===========================================================================
  // ReputationScorer
  // ===========================================================================

  describe("ReputationScorer", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint SBT for agent
      const agentId = ethers.encodeBytes32String("agent-001");
      await sbt.connect(admin).mintAgent(agentWallet.address, agentId);
      tokenId = await sbt.agentTokenId(agentWallet.address);
    });

    it("zero bets = zero score", async function () {
      expect(await scorer.computeScore(tokenId)).to.equal(0n);
    });

    it("computes score from agent stats", async function () {
      // Update agent stats: 10 bets, 7 wins, 500 USDC volume, 5 markets
      await sbt.connect(admin).updateStats(agentWallet.address, 10, 7, 500_000_000n, true);
      // updateStats increments, so marketsParticipated=1 with isNewMarket=true once
      // We need to call multiple times or just check with what we have

      const score = await scorer.computeScore(tokenId);
      // winRate: 7/10 = 70% → 2800 (of 4000)
      // volume: 500 USDC / 1000 cap → 50% → 1000 (of 2000)
      // consistency: 1 market / 50 cap → 2% → 40 (of 2000)
      // activity: just bet → 2000 (of 2000)
      // Total: 2800 + 1000 + 40 + 2000 = 5840
      expect(score).to.equal(5840n);
    });

    it("caps score at 10000", async function () {
      // Perfect agent: 100 bets, 100 wins, massive volume, 50+ markets, active
      await sbt.connect(admin).updateStats(agentWallet.address, 100, 100, 2_000_000_000n, true);
      // Need 50 marketsParticipated calls
      for (let i = 0; i < 49; i++) {
        await sbt.connect(admin).updateStats(agentWallet.address, 0, 0, 0, true);
      }

      const score = await scorer.computeScore(tokenId);
      // winRate: 100/100 = 100% → 4000
      // volume: 2000 USDC ≥ cap → 2000
      // consistency: 50 ≥ cap → 2000
      // activity: just active → 2000
      // Total: 10000
      expect(score).to.equal(10000n);
    });

    it("activity decays over time", async function () {
      await sbt.connect(admin).updateStats(agentWallet.address, 10, 5, 500_000_000n, true);

      // Fast forward 45 days (past 30-day active window, into decay)
      await time.increase(45 * 24 * 60 * 60);

      const score = await scorer.computeScore(tokenId);
      // Activity should be partially decayed (50% of 2000 = 1000 at 45 days)
      // winRate: 5/10 → 2000, volume: 500/1000 → 1000, consistency: 1/50 → 40
      // activity: ~1000 (halfway through decay)
      expect(score).to.be.lt(5040n); // Would be 5040 if fully active
      expect(score).to.be.gt(2040n); // Would be 3040 if fully decayed
    });

    it("activity fully decays after 60 days", async function () {
      await sbt.connect(admin).updateStats(agentWallet.address, 10, 5, 500_000_000n, true);

      // Fast forward 61 days
      await time.increase(61 * 24 * 60 * 60);

      const score = await scorer.computeScore(tokenId);
      // winRate: 2000, volume: 1000, consistency: 40, activity: 0
      expect(score).to.equal(3040n);
    });

    it("updateScore writes cached score", async function () {
      await sbt.connect(admin).updateStats(agentWallet.address, 10, 7, 500_000_000n, true);

      expect(await scorer.getScore(tokenId)).to.equal(0n); // not cached yet
      await scorer.updateScore(tokenId);
      expect(await scorer.getScore(tokenId)).to.equal(5840n);
    });

    it("batchUpdateScores works for multiple tokens", async function () {
      const agentId2 = ethers.encodeBytes32String("agent-002");
      await sbt.connect(admin).mintAgent(user1.address, agentId2);
      const tokenId2 = await sbt.agentTokenId(user1.address);

      await sbt.connect(admin).updateStats(agentWallet.address, 10, 7, 500_000_000n, true);
      await sbt.connect(admin).updateStats(user1.address, 20, 10, 800_000_000n, true);

      await scorer.batchUpdateScores([tokenId, tokenId2]);

      expect(await scorer.getScore(tokenId)).to.be.gt(0n);
      expect(await scorer.getScore(tokenId2)).to.be.gt(0n);
    });
  });

  // ===========================================================================
  // AgentVault
  // ===========================================================================

  describe("AgentVault", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      // Mint SBT for agent
      const agentId = ethers.encodeBytes32String("agent-001");
      await sbt.connect(admin).mintAgent(agentWallet.address, agentId);
      tokenId = await sbt.agentTokenId(agentWallet.address);
    });

    describe("Staking", function () {
      it("stakes FATE on an agent", async function () {
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        const vaultInfo = await vault.vaults(tokenId);
        expect(vaultInfo.totalStaked).to.equal(stakeAmount);

        const stakeInfo = await vault.stakes(tokenId, user1.address);
        expect(stakeInfo.amount).to.equal(stakeAmount);
      });

      it("unstakes FATE from an agent", async function () {
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        const balanceBefore = await fateV1.balanceOf(user1.address);
        await vault.connect(user1).unstake(tokenId, stakeAmount);

        expect(await fateV1.balanceOf(user1.address)).to.equal(balanceBefore + stakeAmount);
        const vaultInfo = await vault.vaults(tokenId);
        expect(vaultInfo.totalStaked).to.equal(0n);
      });

      it("reverts on zero stake", async function () {
        await expect(
          vault.connect(user1).stake(tokenId, 0n)
        ).to.be.revertedWithCustomError(vault, "ZeroAmount");
      });

      it("reverts on insufficient unstake", async function () {
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        await expect(
          vault.connect(user1).unstake(tokenId, stakeAmount + 1n)
        ).to.be.revertedWithCustomError(vault, "InsufficientStake");
      });
    });

    describe("Subscription & Fee Distribution", function () {
      it("subscribe distributes fees 70/30", async function () {
        // Stake first so staker share is distributed
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        // Subscribe with user2
        await usdc.connect(user2).approve(await vault.getAddress(), FOLLOW_FEE);
        const agentBalanceBefore = await usdc.balanceOf(agentWallet.address);

        await vault.connect(user2).subscribe(tokenId);

        // Agent gets 70% = 700_000
        const agentBalanceAfter = await usdc.balanceOf(agentWallet.address);
        expect(agentBalanceAfter - agentBalanceBefore).to.equal(700_000n);

        // Staker has pending rewards = 30% = 300_000
        const pending = await vault.pendingRewards(tokenId, user1.address);
        expect(pending).to.equal(300_000n);
      });

      it("subscription extends correctly", async function () {
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        await usdc.connect(user2).approve(await vault.getAddress(), FOLLOW_FEE * 2n);
        await vault.connect(user2).subscribe(tokenId);

        const sub1 = await vault.subscriptions(tokenId, user2.address);
        expect(sub1.active).to.be.true;

        // Subscribe again — should extend
        await vault.connect(user2).subscribe(tokenId);
        const sub2 = await vault.subscriptions(tokenId, user2.address);
        expect(sub2.paidUntil).to.be.gt(sub1.paidUntil);
      });

      it("isSubscriptionActive returns correct status", async function () {
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        expect(await vault.isSubscriptionActive(tokenId, user2.address)).to.be.false;

        await usdc.connect(user2).approve(await vault.getAddress(), FOLLOW_FEE);
        await vault.connect(user2).subscribe(tokenId);

        expect(await vault.isSubscriptionActive(tokenId, user2.address)).to.be.true;

        // Fast forward past period
        await time.increase(PERIOD_DURATION + 1);
        expect(await vault.isSubscriptionActive(tokenId, user2.address)).to.be.false;
      });
    });

    describe("Reward Claims", function () {
      it("claim rewards after subscription", async function () {
        // Stake
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        // Subscribe
        await usdc.connect(user2).approve(await vault.getAddress(), FOLLOW_FEE);
        await vault.connect(user2).subscribe(tokenId);

        // Claim
        const balanceBefore = await usdc.balanceOf(user1.address);
        await vault.connect(user1).claimRewards(tokenId);
        const balanceAfter = await usdc.balanceOf(user1.address);

        expect(balanceAfter - balanceBefore).to.equal(300_000n); // 30% of 1 USDC
      });

      it("multiple stakers share rewards proportionally", async function () {
        const stake1 = ethers.parseEther("30000");
        const stake2 = ethers.parseEther("10000");

        await fateV1.connect(user1).approve(await vault.getAddress(), stake1);
        await vault.connect(user1).stake(tokenId, stake1);

        await fateV1.connect(user2).approve(await vault.getAddress(), stake2);
        await vault.connect(user2).stake(tokenId, stake2);

        const largeFee = 4_000_000n;
        await vault.connect(admin).setFollowFee(largeFee);
        await usdc.mint(admin.address, largeFee);
        await usdc.connect(admin).approve(await vault.getAddress(), largeFee);
        await vault.connect(admin).subscribe(tokenId);

        const stakerShare = (largeFee * 3000n) / 10000n;
        const pending1 = await vault.pendingRewards(tokenId, user1.address);
        const pending2 = await vault.pendingRewards(tokenId, user2.address);

        expect(pending1).to.equal((stakerShare * 3n) / 4n);
        expect(pending2).to.equal(stakerShare / 4n);
      });

      it("auto-harvests rewards on stake/unstake", async function () {
        const stakeAmount = ethers.parseEther("10000");
        await fateV1.connect(user1).approve(await vault.getAddress(), stakeAmount * 2n);
        await vault.connect(user1).stake(tokenId, stakeAmount);

        // Generate rewards
        await usdc.connect(user2).approve(await vault.getAddress(), FOLLOW_FEE);
        await vault.connect(user2).subscribe(tokenId);

        // Staking more should auto-harvest pending rewards
        const balanceBefore = await usdc.balanceOf(user1.address);
        await vault.connect(user1).stake(tokenId, stakeAmount);
        const balanceAfter = await usdc.balanceOf(user1.address);

        expect(balanceAfter - balanceBefore).to.equal(300_000n);
      });
    });

    describe("Admin", function () {
      it("admin can update follow fee", async function () {
        await vault.connect(admin).setFollowFee(2_000_000n);
        expect(await vault.followFeeAmount()).to.equal(2_000_000n);
      });

      it("admin can update period duration", async function () {
        const newDuration = 60 * 24 * 60 * 60; // 60 days
        await vault.connect(admin).setPeriodDuration(newDuration);
        expect(await vault.periodDuration()).to.equal(newDuration);
      });

      it("non-admin cannot update fee", async function () {
        await expect(
          vault.connect(user1).setFollowFee(2_000_000n)
        ).to.be.revertedWithCustomError(vault, "NotAdmin");
      });
    });
  });

  // ===========================================================================
  // FateGovernor + FateTimelock
  // ===========================================================================

  describe("FateGovernor & FateTimelock", function () {
    beforeEach(async function () {
      // user1 deposits sFATE and self-delegates for voting
      const depositAmount = ethers.parseEther("500000");
      await fateV1.connect(user1).approve(await fateV2.getAddress(), depositAmount);
      await fateV2.connect(user1).deposit(depositAmount);
      await fateV2.connect(user1).delegate(user1.address);

      // user2 also participates
      const deposit2 = ethers.parseEther("200000");
      await fateV1.connect(user2).approve(await fateV2.getAddress(), deposit2);
      await fateV2.connect(user2).deposit(deposit2);
      await fateV2.connect(user2).delegate(user2.address);

      // Mine a block so votes checkpoint
      await ethers.provider.send("evm_mine", []);
    });

    it("governor has correct settings", async function () {
      expect(await governor.votingDelay()).to.equal(1n);
      expect(await governor.votingPeriod()).to.equal(50n);
      expect(await governor.proposalThreshold()).to.equal(ethers.parseEther("1000"));
    });

    it("user can create a proposal", async function () {
      const targets = [await vault.getAddress()];
      const values = [0n];
      const calldatas = [
        vault.interface.encodeFunctionData("setFollowFee", [5_000_000n]),
      ];
      const description = "Set follow fee to 5 USDC";

      // This should work because user1 has enough sFATE
      await expect(
        governor.connect(user1).propose(targets, values, calldatas, description)
      ).to.emit(governor, "ProposalCreated");
    });

    it("user below threshold cannot create proposal", async function () {
      // user2 has 200k sFATE but we need 1000 (threshold). user2 has enough.
      // Let's create a user with no sFATE
      const [, , , , noTokenUser] = await ethers.getSigners();

      const targets = [await vault.getAddress()];
      const values = [0n];
      const calldatas = [
        vault.interface.encodeFunctionData("setFollowFee", [5_000_000n]),
      ];

      await expect(
        governor.connect(noTokenUser).propose(targets, values, calldatas, "test")
      ).to.be.reverted;
    });

    it("full governance flow: propose → vote → queue → execute", async function () {
      // Grant ADMIN on vault to timelock so it can call setFollowFee
      // For now vault uses simple admin, so transfer admin to timelock
      // Actually the vault admin is 'admin' signer. We can make timelock call it
      // but we need to transfer admin first.

      // Transfer vault admin to timelock for governance control
      // Vault doesn't have transferAdmin, so let's test with a different target
      // Instead, test governance executing on Treasury which has AccessControl

      // Deploy a fresh Treasury for governance test
      const TreasuryFactory = await ethers.getContractFactory("Treasury");
      const govTreasury = (await TreasuryFactory.deploy(admin.address)) as unknown as Treasury;

      // Grant WITHDRAWER_ROLE to timelock
      const WITHDRAWER_ROLE = await govTreasury.WITHDRAWER_ROLE();
      await govTreasury.connect(admin).grantRole(WITHDRAWER_ROLE, await timelock.getAddress());

      // Fund treasury with some USDC
      await usdc.mint(await govTreasury.getAddress(), 10_000_000n); // 10 USDC

      // Propose: withdraw 5 USDC from treasury to user2
      const targets = [await govTreasury.getAddress()];
      const values = [0n];
      const calldatas = [
        govTreasury.interface.encodeFunctionData("withdraw", [
          await usdc.getAddress(),
          user2.address,
          5_000_000n,
        ]),
      ];
      const description = "Withdraw 5 USDC from treasury to user2";

      // Propose
      const proposeTx = await governor
        .connect(user1)
        .propose(targets, values, calldatas, description);
      const receipt = await proposeTx.wait();
      const proposalId = await governor.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );

      // Wait for voting delay
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      // Vote (user1 votes For = 1)
      await governor.connect(user1).castVote(proposalId, 1); // For
      await governor.connect(user2).castVote(proposalId, 1); // For

      // Wait for voting period to end
      for (let i = 0; i < 51; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Queue
      await governor.queue(targets, values, calldatas, ethers.id(description));

      // Wait for timelock delay
      await time.increase(TIMELOCK_DELAY + 1);

      // Execute
      const user2BalanceBefore = await usdc.balanceOf(user2.address);
      await governor.execute(targets, values, calldatas, ethers.id(description));
      const user2BalanceAfter = await usdc.balanceOf(user2.address);

      expect(user2BalanceAfter - user2BalanceBefore).to.equal(5_000_000n);
    });

    it("proposal fails if quorum not reached", async function () {
      // Create a user with minimal sFATE (just above threshold) to propose
      // but far below quorum
      const [, , , , proposer] = await ethers.getSigners();
      await fateV1.connect(admin).mint(proposer.address, ethers.parseEther("2000"));
      await fateV1.connect(proposer).approve(await fateV2.getAddress(), ethers.parseEther("2000"));
      await fateV2.connect(proposer).deposit(ethers.parseEther("2000"));
      await fateV2.connect(proposer).delegate(proposer.address);
      await ethers.provider.send("evm_mine", []);

      const targets = [await vault.getAddress()];
      const values = [0n];
      const calldatas = [
        vault.interface.encodeFunctionData("setFollowFee", [9_000_000n]),
      ];
      const description = "Low quorum test";

      await governor.connect(proposer).propose(targets, values, calldatas, description);
      const proposalId = await governor.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );

      // Wait for voting delay
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      // Only proposer votes (2000 sFATE out of 702000 total = ~0.28%, below 4% quorum)
      await governor.connect(proposer).castVote(proposalId, 1);

      // Wait for voting period to end
      for (let i = 0; i < 51; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // State should be Defeated (3)
      expect(await governor.state(proposalId)).to.equal(3n);
    });
  });

  // ===========================================================================
  // FateTimelock
  // ===========================================================================

  describe("FateTimelock", function () {
    it("has correct minimum delay", async function () {
      expect(await timelock.getMinDelay()).to.equal(TIMELOCK_DELAY);
    });

    it("governor has PROPOSER_ROLE", async function () {
      const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
      expect(await timelock.hasRole(PROPOSER_ROLE, await governor.getAddress())).to.be.true;
    });

    it("anyone can execute (EXECUTOR_ROLE granted to zero address)", async function () {
      const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
      expect(await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress)).to.be.true;
    });
  });
});
