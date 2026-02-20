import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("Deploying BetRegistry");
  console.log("=".repeat(60));
  console.log(`Network:   ${network.name} (chainId: ${network.config.chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("-".repeat(60));

  // Deploy
  const BetRegistry = await ethers.getContractFactory("BetRegistry");
  const betRegistry = await BetRegistry.deploy(deployer.address);
  await betRegistry.waitForDeployment();

  const contractAddress = await betRegistry.getAddress();

  console.log(`BetRegistry deployed to: ${contractAddress}`);
  console.log(`Owner:                   ${await betRegistry.owner()}`);
  console.log("-".repeat(60));

  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Skipping verification on local network.");
    return;
  }

  // Basescan needs a few confirmations to index the contract before verification succeeds
  console.log("Waiting for 5 block confirmations before verifying...");
  await betRegistry.deploymentTransaction()?.wait(5);

  console.log("Verifying on Basescan...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [deployer.address],
    });
    console.log("Verified successfully!");
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Already Verified")) {
      console.log("Contract already verified.");
    } else {
      console.error("Verification failed:", error);
    }
  }

  console.log("=".repeat(60));
  console.log("Deployment complete!");
  console.log(`Contract: ${contractAddress}`);
  console.log(`Explorer: ${getExplorerUrl(network.name, contractAddress)}`);
  console.log("=".repeat(60));
}

function getExplorerUrl(networkName: string, address: string): string {
  switch (networkName) {
    case "baseSepolia":
      return `https://sepolia.basescan.org/address/${address}`;
    case "base":
      return `https://basescan.org/address/${address}`;
    default:
      return address;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
