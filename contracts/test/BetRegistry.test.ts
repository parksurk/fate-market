import { expect } from "chai";
import { ethers } from "hardhat";
import { BetRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BetRegistry", function () {
  let betRegistry: BetRegistry;
  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  const sampleBetId = ethers.keccak256(ethers.toUtf8Bytes("bet-uuid-001"));
  const sampleContentHash = ethers.keccak256(ethers.toUtf8Bytes('{"betId":"001","amount":100}'));
  const sampleCid = "bafkreihdwdcefgh4d6gevzxq3c2d8pvbmflnwm6yls7rlk6enpw7iimply";

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();

    const BetRegistryFactory = await ethers.getContractFactory("BetRegistry");
    betRegistry = await BetRegistryFactory.deploy(owner.address);
    await betRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets the correct owner", async function () {
      expect(await betRegistry.owner()).to.equal(owner.address);
    });

    it("starts with no recorded bets", async function () {
      expect(await betRegistry.isRecorded(sampleBetId)).to.be.false;
    });
  });

  describe("recordBet", function () {
    it("records a bet successfully and returns true via isRecorded", async function () {
      await betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, sampleCid);
      expect(await betRegistry.isRecorded(sampleBetId)).to.be.true;
    });

    it("sets recorded[betId] to true in the public mapping", async function () {
      await betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, sampleCid);
      expect(await betRegistry.recorded(sampleBetId)).to.be.true;
    });

    it("emits BetRecorded event with correct args", async function () {
      const tx = betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, sampleCid);

      await expect(tx)
        .to.emit(betRegistry, "BetRecorded")
        .withArgs(
          sampleBetId,
          sampleContentHash,
          sampleCid,
          owner.address,
          (timestamp: bigint) => timestamp > 0n
        );
    });

    it("reverts when non-owner calls recordBet", async function () {
      await expect(
        betRegistry.connect(nonOwner).recordBet(sampleBetId, sampleContentHash, sampleCid)
      ).to.be.revertedWithCustomError(betRegistry, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
    });

    it("reverts on duplicate betId submission", async function () {
      await betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, sampleCid);

      await expect(
        betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, sampleCid)
      ).to.be.revertedWithCustomError(betRegistry, "BetAlreadyRecorded")
        .withArgs(sampleBetId);
    });

    it("reverts when betId is zero bytes32", async function () {
      await expect(
        betRegistry.connect(owner).recordBet(ethers.ZeroHash, sampleContentHash, sampleCid)
      ).to.be.revertedWithCustomError(betRegistry, "InvalidBetId");
    });

    it("reverts when contentHash is zero bytes32", async function () {
      await expect(
        betRegistry.connect(owner).recordBet(sampleBetId, ethers.ZeroHash, sampleCid)
      ).to.be.revertedWithCustomError(betRegistry, "InvalidContentHash");
    });

    it("allows empty string cid (no validation on cid length)", async function () {
      await expect(
        betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, "")
      ).to.not.be.reverted;
    });

    it("allows recording multiple distinct bets", async function () {
      const betId2 = ethers.keccak256(ethers.toUtf8Bytes("bet-uuid-002"));
      const contentHash2 = ethers.keccak256(ethers.toUtf8Bytes('{"betId":"002","amount":200}'));

      await betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, sampleCid);
      await betRegistry.connect(owner).recordBet(betId2, contentHash2, "bafkrei2");

      expect(await betRegistry.isRecorded(sampleBetId)).to.be.true;
      expect(await betRegistry.isRecorded(betId2)).to.be.true;
    });
  });

  describe("isRecorded", function () {
    it("returns false for unknown betId", async function () {
      const unknownBetId = ethers.keccak256(ethers.toUtf8Bytes("unknown-bet"));
      expect(await betRegistry.isRecorded(unknownBetId)).to.be.false;
    });

    it("returns true after bet is recorded", async function () {
      await betRegistry.connect(owner).recordBet(sampleBetId, sampleContentHash, sampleCid);
      expect(await betRegistry.isRecorded(sampleBetId)).to.be.true;
    });
  });
});
