import { expect } from "chai";
import { ethers } from "hardhat";
import { FateToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FateToken", function () {
  let token: FateToken;
  let admin: SignerWithAddress;
  let user: SignerWithAddress;

  const INITIAL_MINT = ethers.parseEther("10000000"); // 10M tokens
  const MAX_SUPPLY = ethers.parseEther("100000000"); // 100M tokens

  beforeEach(async function () {
    [admin, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FateToken");
    token = await Factory.deploy(admin.address, INITIAL_MINT) as unknown as FateToken;
  });

  describe("Deployment", function () {
    it("sets name and symbol", async function () {
      expect(await token.name()).to.equal("Fate Token");
      expect(await token.symbol()).to.equal("FATE");
    });

    it("mints initial supply to admin", async function () {
      expect(await token.balanceOf(admin.address)).to.equal(INITIAL_MINT);
      expect(await token.totalSupply()).to.equal(INITIAL_MINT);
    });

    it("sets MAX_SUPPLY correctly", async function () {
      expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("grants admin all roles", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      const MINTER_ROLE = await token.MINTER_ROLE();
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, admin.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("allows minter to mint tokens", async function () {
      const amount = ethers.parseEther("1000");
      await token.connect(admin).mint(user.address, amount);
      expect(await token.balanceOf(user.address)).to.equal(amount);
    });

    it("reverts when non-minter tries to mint", async function () {
      await expect(
        token.connect(user).mint(user.address, ethers.parseEther("1"))
      ).to.be.reverted;
    });

    it("reverts when minting exceeds MAX_SUPPLY", async function () {
      const remaining = MAX_SUPPLY - INITIAL_MINT;
      await expect(
        token.connect(admin).mint(user.address, remaining + 1n)
      ).to.be.revertedWithCustomError(token, "ExceedsMaxSupply");
    });

    it("allows minting up to MAX_SUPPLY", async function () {
      const remaining = MAX_SUPPLY - INITIAL_MINT;
      await token.connect(admin).mint(user.address, remaining);
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
    });
  });

  describe("Burning", function () {
    it("allows token holder to burn their tokens", async function () {
      await token.connect(admin).burn(ethers.parseEther("1000"));
      expect(await token.totalSupply()).to.equal(INITIAL_MINT - ethers.parseEther("1000"));
    });
  });

  describe("Pausable", function () {
    it("allows pauser to pause and unpause", async function () {
      await token.connect(admin).pause();
      await expect(
        token.connect(admin).transfer(user.address, ethers.parseEther("1"))
      ).to.be.reverted;

      await token.connect(admin).unpause();
      await token.connect(admin).transfer(user.address, ethers.parseEther("1"));
      expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("1"));
    });
  });
});
