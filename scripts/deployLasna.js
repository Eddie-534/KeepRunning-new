const hre = require("hardhat");

async function main() {
  console.log("Deploying ShoeNFT and ShoeReactive to Lasna...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy ShoeNFT contract
  console.log("\n1. Deploying ShoeNFT...");
  const ShoeNFT = await hre.ethers.getContractFactory("ShoeNFT");
  const shoeNFT = await ShoeNFT.deploy(deployer.address);
  await shoeNFT.waitForDeployment();
  const shoeNFTAddress = await shoeNFT.getAddress();
  console.log("   ShoeNFT deployed to:", shoeNFTAddress);

  // Pre-mint all levels (1000 each)
  console.log("\n2. Pre-minting NFTs for all levels...");
  const preMintTx = await shoeNFT.preMintAllLevels();
  await preMintTx.wait();
  console.log("   Pre-mint completed!");

  // Verify minted counts
  for (let level = 1; level <= 5; level++) {
    const count = await shoeNFT.getMintedCount(level);
    console.log(`   Level ${level}: ${count.toString()} / 1000`);
  }

  // Deploy ShoeReactive contract
  console.log("\n3. Deploying ShoeReactive...");
  const ShoeReactive = await hre.ethers.getContractFactory("ShoeReactive");
  const shoeReactive = await ShoeReactive.deploy(deployer.address);
  await shoeReactive.waitForDeployment();
  const shoeReactiveAddress = await shoeReactive.getAddress();
  console.log("   ShoeReactive deployed to:", shoeReactiveAddress);

  // Initialize ShoeReactive with ShoeRunOrigin address (placeholder - update after Sepolia deployment)
  console.log("\n4. Initializing ShoeReactive...");
  const shoeRunOriginAddress = process.env.SHOE_RUN_ORIGIN_ADDRESS || "0x0000000000000000000000000000000000000000";
  await shoeReactive.initialize(shoeRunOriginAddress, shoeNFTAddress);
  console.log("   ShoeReactive initialized!");
  console.log("   ShoeRunOrigin (Sepolia):", shoeRunOriginAddress);
  console.log("   ShoeNFT (Lasna):", shoeNFTAddress);

  // Set reactive contract in ShoeNFT
  console.log("\n5. Setting reactive contract in ShoeNFT...");
  const setReactiveTx = await shoeNFT.setReactiveContract(shoeReactiveAddress);
  await setReactiveTx.wait();
  console.log("   Reactive contract set!");

  console.log("\n===========================================");
  console.log("Deployment Summary");
  console.log("===========================================");
  console.log("ShoeNFT (Lasna):", shoeNFTAddress);
  console.log("ShoeReactive (Lasna):", shoeReactiveAddress);
  console.log("===========================================\n");

  // Save deployment info
  const deploymentInfo = {
    network: "lasna",
    contracts: {
      ShoeNFT: shoeNFTAddress,
      ShoeReactive: shoeReactiveAddress,
      ShoeRunOrigin: shoeRunOriginAddress
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString()
  };

  console.log("Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  return {
    shoeNFTAddress,
    shoeReactiveAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
