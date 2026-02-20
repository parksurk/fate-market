import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  PredictionMarket,
  MarketFactory,
  ManualOracleAdapter,
  Treasury,
  MockUSDC,
} from "../typechain-types";

describe("PredictionMarket (Full Lifecycle)", function () {
  let usdc: MockUSDC;
  let treasury: Treasury;
  let oracle: ManualOracleAdapter;
  let impl: PredictionMarket;
  let factory: MarketFactory;
  let admin: SignerWithAddress;
  let bettor1: SignerWithAddress;
  let bettor2: SignerWithAddress;
  let bettor3: SignerWithAddress;

  const FEE_BPS = 200;
  const DISPUTE_WINDOW = 3600;
  const USDC_AMOUNT = 1000_000000n;
  const marketId = ethers.keccak256(ethers.toUtf8Bytes("market-001"));
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("Will BTC hit 100k?"));
  const betId1 = ethers.keccak256(ethers.toUtf8Bytes("bet-001"));
  const betId2 = ethers.keccak256(ethers.toUtf8Bytes("bet-002"));
  const betId3 = ethers.keccak256(ethers.toUtf8Bytes("bet-003"));
  const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("resolution-evidence"));

  let marketAddr: string;
  let market: PredictionMarket;
  let closeTime: number;

  async function deployContracts() {
    [admin, bettor1, bettor2, bettor3] = await ethers.getSigners();

    usdc = await (await ethers.getContractFactory("MockUSDC")).deploy() as unknown as MockUSDC;
    treasury = await (await ethers.getContractFactory("Treasury")).deploy(admin.address) as unknown as Treasury;
    oracle = await (await ethers.getContractFactory("ManualOracleAdapter")).deploy(admin.address) as unknown as ManualOracleAdapter;
    impl = await (await ethers.getContractFactory("PredictionMarket")).deploy() as unknown as PredictionMarket;

    closeTime = (await time.latest()) + 86400;

    factory = await (await ethers.getContractFactory("MarketFactory")).deploy(
      await impl.getAddress(),
      await usdc.getAddress(),
      await oracle.getAddress(),
      await treasury.getAddress(),
      FEE_BPS,
      DISPUTE_WINDOW,
      admin.address
    ) as unknown as MarketFactory;

    await usdc.mint(bettor1.address, USDC_AMOUNT * 10n);
    await usdc.mint(bettor2.address, USDC_AMOUNT * 10n);
    await usdc.mint(bettor3.address, USDC_AMOUNT * 10n);
  }

  async function createMarket() {
    const tx = await factory.connect(admin).createMarket({
      marketId,
      oracleAdapter: await oracle.getAddress(),
      closeTime,
      outcomeCount: 2,
      feeBps: FEE_BPS,
      metadataHash,
    });
    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (l) => factory.interface.parseLog({ topics: [...l.topics], data: l.data })?.name === "MarketCreated"
    );
    const parsed = factory.interface.parseLog({ topics: [...event!.topics], data: event!.data });
    marketAddr = parsed!.args.market;
    market = await ethers.getContractAt("PredictionMarket", marketAddr) as unknown as PredictionMarket;
  }

  beforeEach(async function () {
    await deployContracts();
    await createMarket();
  });

  describe("Market Creation", function () {
    it("creates a market clone with correct state", async function () {
      expect(await market.marketId()).to.equal(marketId);
      expect(await market.state()).to.equal(1); // Open
      expect(await market.outcomeCount()).to.equal(2);
      expect(await market.feeBps()).to.equal(FEE_BPS);
      expect(await market.totalPool()).to.equal(0);
    });

    it("registers market in factory", async function () {
      expect(await factory.getMarket(marketId)).to.equal(marketAddr);
      expect(await factory.isMarket(marketAddr)).to.be.true;
      expect(await factory.marketCount()).to.equal(1);
    });

    it("reverts on duplicate marketId", async function () {
      await expect(
        factory.connect(admin).createMarket({
          marketId,
          oracleAdapter: await oracle.getAddress(),
          closeTime,
          outcomeCount: 2,
          feeBps: FEE_BPS,
          metadataHash,
        })
      ).to.be.revertedWithCustomError(factory, "MarketAlreadyExists");
    });

    it("reverts with close time in the past", async function () {
      const pastTime = (await time.latest()) - 100;
      await expect(
        factory.connect(admin).createMarket({
          marketId: ethers.keccak256(ethers.toUtf8Bytes("market-002")),
          oracleAdapter: await oracle.getAddress(),
          closeTime: pastTime,
          outcomeCount: 2,
          feeBps: FEE_BPS,
          metadataHash,
        })
      ).to.be.revertedWithCustomError(factory, "InvalidCloseTime");
    });
  });

  describe("Betting", function () {
    it("places a YES bet", async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await market.connect(bettor1).placeBet(0, USDC_AMOUNT, bettor1.address, betId1);

      expect(await market.totalPool()).to.equal(USDC_AMOUNT);
      expect(await market.outcomePool(0)).to.equal(USDC_AMOUNT);
      const [yes, no] = await market.getPosition(bettor1.address);
      expect(yes).to.equal(USDC_AMOUNT);
      expect(no).to.equal(0);
    });

    it("places a NO bet", async function () {
      await usdc.connect(bettor2).approve(marketAddr, USDC_AMOUNT);
      await market.connect(bettor2).placeBet(1, USDC_AMOUNT, bettor2.address, betId2);

      expect(await market.outcomePool(1)).to.equal(USDC_AMOUNT);
      const [yes, no] = await market.getPosition(bettor2.address);
      expect(yes).to.equal(0);
      expect(no).to.equal(USDC_AMOUNT);
    });

    it("allows betting on behalf of another address (relay)", async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await market.connect(bettor1).placeBet(0, USDC_AMOUNT, bettor3.address, betId1);

      const [yes] = await market.getPosition(bettor3.address);
      expect(yes).to.equal(USDC_AMOUNT);
    });

    it("emits BetPlaced event", async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await expect(market.connect(bettor1).placeBet(0, USDC_AMOUNT, bettor1.address, betId1))
        .to.emit(market, "BetPlaced")
        .withArgs(marketId, bettor1.address, bettor1.address, 0, USDC_AMOUNT, betId1);
    });

    it("reverts on invalid outcome", async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await expect(
        market.connect(bettor1).placeBet(2, USDC_AMOUNT, bettor1.address, betId1)
      ).to.be.revertedWithCustomError(market, "InvalidOutcome");
    });

    it("reverts on zero amount", async function () {
      await expect(
        market.connect(bettor1).placeBet(0, 0, bettor1.address, betId1)
      ).to.be.revertedWithCustomError(market, "ZeroAmount");
    });

    it("reverts after close time", async function () {
      await time.increaseTo(closeTime + 1);
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await expect(
        market.connect(bettor1).placeBet(0, USDC_AMOUNT, bettor1.address, betId1)
      ).to.be.revertedWithCustomError(market, "BettingTimePassed");
    });
  });

  describe("Lifecycle: Close → Propose → Finalize → Claim", function () {
    beforeEach(async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT * 3n);
      await market.connect(bettor1).placeBet(0, USDC_AMOUNT * 3n, bettor1.address, betId1);

      await usdc.connect(bettor2).approve(marketAddr, USDC_AMOUNT * 2n);
      await market.connect(bettor2).placeBet(1, USDC_AMOUNT * 2n, bettor2.address, betId2);
    });

    it("closes market after closeTime", async function () {
      await time.increaseTo(closeTime);
      await market.close();
      expect(await market.state()).to.equal(2); // Closed
    });

    it("reverts close before closeTime", async function () {
      await expect(market.close()).to.be.revertedWithCustomError(market, "CloseTimeNotReached");
    });

    it("proposes outcome via oracle", async function () {
      await time.increaseTo(closeTime);
      await market.close();

      const requestTx = await oracle.connect(admin).requestResolution(
        marketAddr,
        marketId,
        "0x"
      );
      const requestReceipt = await requestTx.wait();
      const requestEvent = requestReceipt?.logs.find(
        (l) => oracle.interface.parseLog({ topics: [...l.topics], data: l.data })?.name === "ResolutionRequested"
      );
      const requestId = oracle.interface.parseLog({
        topics: [...requestEvent!.topics],
        data: requestEvent!.data
      })!.args.requestId;

      await oracle.connect(admin).resolve(requestId, 0, evidenceHash);
      expect(await market.state()).to.equal(3); // Proposed
    });

    it("full lifecycle: bet → close → propose → finalize → claim", async function () {
      const totalPool = USDC_AMOUNT * 5n;
      const fee = totalPool * BigInt(FEE_BPS) / 10000n;
      const distributable = totalPool - fee;

      await time.increaseTo(closeTime);
      await market.close();

      const requestTx = await oracle.connect(admin).requestResolution(marketAddr, marketId, "0x");
      const requestReceipt = await requestTx.wait();
      const requestEvent = requestReceipt?.logs.find(
        (l) => oracle.interface.parseLog({ topics: [...l.topics], data: l.data })?.name === "ResolutionRequested"
      );
      const requestId = oracle.interface.parseLog({
        topics: [...requestEvent!.topics],
        data: requestEvent!.data
      })!.args.requestId;

      await oracle.connect(admin).resolve(requestId, 0, evidenceHash);
      expect(await market.state()).to.equal(3); // Proposed

      await time.increase(DISPUTE_WINDOW + 1);
      await market.finalize();
      expect(await market.state()).to.equal(4); // Final
      expect(await market.finalOutcome()).to.equal(0);

      const payout1 = await market.claimable(bettor1.address);
      expect(payout1).to.equal(distributable);

      const payout2 = await market.claimable(bettor2.address);
      expect(payout2).to.equal(0);

      const balBefore = await usdc.balanceOf(bettor1.address);
      await market.connect(bettor1).claim(bettor1.address);
      const balAfter = await usdc.balanceOf(bettor1.address);
      expect(balAfter - balBefore).to.equal(distributable);

      expect(await usdc.balanceOf(await treasury.getAddress())).to.equal(fee);
    });
  });

  describe("Dispute", function () {
    let requestId: string;

    beforeEach(async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await market.connect(bettor1).placeBet(0, USDC_AMOUNT, bettor1.address, betId1);

      await time.increaseTo(closeTime);
      await market.close();

      const requestTx = await oracle.connect(admin).requestResolution(marketAddr, marketId, "0x");
      const requestReceipt = await requestTx.wait();
      const requestEvent = requestReceipt?.logs.find(
        (l) => oracle.interface.parseLog({ topics: [...l.topics], data: l.data })?.name === "ResolutionRequested"
      );
      requestId = oracle.interface.parseLog({
        topics: [...requestEvent!.topics],
        data: requestEvent!.data
      })!.args.requestId;

      await oracle.connect(admin).resolve(requestId, 0, evidenceHash);
    });

    it("allows dispute during window", async function () {
      const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("wrong outcome"));
      await expect(market.connect(bettor2).dispute(reasonHash))
        .to.emit(market, "OutcomeDisputed")
        .withArgs(marketId, bettor2.address, reasonHash);
      expect(await market.state()).to.equal(2); // Back to Closed
    });

    it("reverts dispute after window expires", async function () {
      await time.increase(DISPUTE_WINDOW + 1);
      const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("too late"));
      await expect(
        market.connect(bettor2).dispute(reasonHash)
      ).to.be.revertedWithCustomError(market, "DisputeWindowExpired");
    });

    it("reverts finalize during dispute window", async function () {
      await expect(market.finalize()).to.be.revertedWithCustomError(market, "DisputeWindowActive");
    });
  });

  describe("Cancellation", function () {
    beforeEach(async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await market.connect(bettor1).placeBet(0, USDC_AMOUNT, bettor1.address, betId1);
      await usdc.connect(bettor2).approve(marketAddr, USDC_AMOUNT * 2n);
      await market.connect(bettor2).placeBet(1, USDC_AMOUNT * 2n, bettor2.address, betId2);
    });

    it("admin can cancel via factory", async function () {
      await factory.connect(admin).cancelMarket(marketId);
      expect(await market.state()).to.equal(5); // Cancelled
    });

    it("users can claim refunds after cancellation", async function () {
      await factory.connect(admin).cancelMarket(marketId);

      const balBefore1 = await usdc.balanceOf(bettor1.address);
      await market.connect(bettor1).claimRefund(bettor1.address);
      const balAfter1 = await usdc.balanceOf(bettor1.address);
      expect(balAfter1 - balBefore1).to.equal(USDC_AMOUNT);

      const balBefore2 = await usdc.balanceOf(bettor2.address);
      await market.connect(bettor2).claimRefund(bettor2.address);
      const balAfter2 = await usdc.balanceOf(bettor2.address);
      expect(balAfter2 - balBefore2).to.equal(USDC_AMOUNT * 2n);
    });

    it("reverts refund when not cancelled", async function () {
      await expect(
        market.connect(bettor1).claimRefund(bettor1.address)
      ).to.be.revertedWithCustomError(market, "NotCancelled");
    });

    it("reverts double refund claim", async function () {
      await factory.connect(admin).cancelMarket(marketId);
      await market.connect(bettor1).claimRefund(bettor1.address);
      await expect(
        market.connect(bettor1).claimRefund(bettor1.address)
      ).to.be.revertedWithCustomError(market, "AlreadyClaimed");
    });
  });

  describe("Treasury", function () {
    it("receives fees after market finalization", async function () {
      await usdc.connect(bettor1).approve(marketAddr, USDC_AMOUNT);
      await market.connect(bettor1).placeBet(0, USDC_AMOUNT, bettor1.address, betId1);
      await usdc.connect(bettor2).approve(marketAddr, USDC_AMOUNT);
      await market.connect(bettor2).placeBet(1, USDC_AMOUNT, bettor2.address, betId2);

      await time.increaseTo(closeTime);
      await market.close();

      const requestTx = await oracle.connect(admin).requestResolution(marketAddr, marketId, "0x");
      const requestReceipt = await requestTx.wait();
      const requestEvent = requestReceipt?.logs.find(
        (l) => oracle.interface.parseLog({ topics: [...l.topics], data: l.data })?.name === "ResolutionRequested"
      );
      const requestId = oracle.interface.parseLog({
        topics: [...requestEvent!.topics],
        data: requestEvent!.data
      })!.args.requestId;

      await oracle.connect(admin).resolve(requestId, 0, evidenceHash);
      await time.increase(DISPUTE_WINDOW + 1);
      await market.finalize();

      const expectedFee = (USDC_AMOUNT * 2n) * BigInt(FEE_BPS) / 10000n;
      expect(await usdc.balanceOf(await treasury.getAddress())).to.equal(expectedFee);
    });

    it("admin can withdraw from treasury", async function () {
      await usdc.mint(await treasury.getAddress(), USDC_AMOUNT);
      const balBefore = await usdc.balanceOf(admin.address);
      await treasury.connect(admin).withdraw(await usdc.getAddress(), admin.address, USDC_AMOUNT);
      const balAfter = await usdc.balanceOf(admin.address);
      expect(balAfter - balBefore).to.equal(USDC_AMOUNT);
    });
  });
});
