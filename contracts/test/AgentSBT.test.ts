import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentSBT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AgentSBT", function () {
  let sbt: AgentSBT;
  let admin: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;

  const agentId1 = ethers.keccak256(ethers.toUtf8Bytes("agent-uuid-001"));
  const agentId2 = ethers.keccak256(ethers.toUtf8Bytes("agent-uuid-002"));
  const BASE_URI = "https://api.fate.market/agents/sbt/";

  beforeEach(async function () {
    [admin, agent1, agent2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentSBT");
    sbt = await Factory.deploy(admin.address, BASE_URI) as unknown as AgentSBT;
  });

  describe("Minting", function () {
    it("mints an SBT for an agent", async function () {
      await sbt.connect(admin).mintAgent(agent1.address, agentId1);
      expect(await sbt.hasToken(agent1.address)).to.be.true;
      expect(await sbt.ownerOf(1)).to.equal(agent1.address);
      expect(await sbt.agentTokenId(agent1.address)).to.equal(1);
      expect(await sbt.tokenAgentId(1)).to.equal(agentId1);
    });

    it("reverts on duplicate mint for same wallet", async function () {
      await sbt.connect(admin).mintAgent(agent1.address, agentId1);
      await expect(
        sbt.connect(admin).mintAgent(agent1.address, agentId2)
      ).to.be.revertedWithCustomError(sbt, "AgentAlreadyMinted");
    });

    it("increments token IDs", async function () {
      await sbt.connect(admin).mintAgent(agent1.address, agentId1);
      await sbt.connect(admin).mintAgent(agent2.address, agentId2);
      expect(await sbt.agentTokenId(agent1.address)).to.equal(1);
      expect(await sbt.agentTokenId(agent2.address)).to.equal(2);
    });

    it("emits AgentMinted event", async function () {
      await expect(sbt.connect(admin).mintAgent(agent1.address, agentId1))
        .to.emit(sbt, "AgentMinted")
        .withArgs(agent1.address, 1, agentId1);
    });
  });

  describe("Soulbound (non-transferable)", function () {
    beforeEach(async function () {
      await sbt.connect(admin).mintAgent(agent1.address, agentId1);
    });

    it("reverts on transfer", async function () {
      await expect(
        sbt.connect(agent1).transferFrom(agent1.address, agent2.address, 1)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTransferBlocked");
    });

    it("reverts on approve", async function () {
      await expect(
        sbt.connect(agent1).approve(agent2.address, 1)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTransferBlocked");
    });

    it("reverts on setApprovalForAll", async function () {
      await expect(
        sbt.connect(agent1).setApprovalForAll(agent2.address, true)
      ).to.be.revertedWithCustomError(sbt, "SoulboundTransferBlocked");
    });
  });

  describe("Stats", function () {
    beforeEach(async function () {
      await sbt.connect(admin).mintAgent(agent1.address, agentId1);
    });

    it("updates agent stats", async function () {
      await sbt.connect(admin).updateStats(agent1.address, 5, 3, 10000_000000n, true);
      const stats = await sbt.getStats(1);
      expect(stats.totalBets).to.equal(5);
      expect(stats.totalWins).to.equal(3);
      expect(stats.totalVolume).to.equal(10000_000000n);
      expect(stats.marketsParticipated).to.equal(1);
      expect(stats.firstBetTimestamp).to.be.gt(0);
    });

    it("accumulates stats across multiple updates", async function () {
      await sbt.connect(admin).updateStats(agent1.address, 5, 3, 10000_000000n, true);
      await sbt.connect(admin).updateStats(agent1.address, 2, 1, 5000_000000n, true);
      const stats = await sbt.getStats(1);
      expect(stats.totalBets).to.equal(7);
      expect(stats.totalWins).to.equal(4);
      expect(stats.totalVolume).to.equal(15000_000000n);
      expect(stats.marketsParticipated).to.equal(2);
    });

    it("reverts for unminted agent", async function () {
      await expect(
        sbt.connect(admin).updateStats(agent2.address, 1, 0, 0, false)
      ).to.be.revertedWithCustomError(sbt, "AgentNotMinted");
    });
  });
});
