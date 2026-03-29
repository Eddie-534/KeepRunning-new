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

  // Deploy ShoeReactive contract (requires 0.1 ether for ReactVM)
  console.log("\n2. Deploying ShoeReactive...");
  console.log("   (Requires 0.1 ether for ReactVM creation)");
  const ShoeReactive = await hre.ethers.getContractFactory("ShoeReactive");

  // Parameters for ShoeReactive constructor:
  // uint256 _originChainId,         // Sepolia chain ID: 11155111
  // address _originContract,        // ShoeRunOrigin address on Sepolia
  // bytes32 _eventTopic0,           // RunRecorded event topic0
  // address _shoeNFTAddress         // ShoeNFT address on Lasna

  const originChainId = process.env.ORIGIN_CHAIN_ID || "11155111";
  const originContract = process.env.ORIGIN_CONTRACT || "0x0000000000000000000000000000000000000000";
  const eventTopic0 = process.env.EVENT_TOPIC0 || "0x0000000000000000000000000000000000000000000000000000000000000000";

  console.log("   Origin Chain ID:", originChainId);
  console.log("   Origin Contract:", originContract);
  console.log("   Event Topic0:", eventTopic0);

  const shoeReactive = await ShoeReactive.deploy(
    originChainId,
    originContract,
    eventTopic0,
    shoeNFTAddress,
    { value: hre.ethers.parseEther("0.1") }  // 0.1 ether for ReactVM
  );
  await shoeReactive.waitForDeployment();
  const shoeReactiveAddress = await shoeReactive.getAddress();
  console.log("   ShoeReactive deployed to:", shoeReactiveAddress);

  // Set reactive contract in ShoeNFT (authorizes ShoeReactive to call upgradeShoe)
  console.log("\n3. Setting reactive contract in ShoeNFT...");
  const setReactiveTx = await shoeNFT.setReactiveContract(shoeReactiveAddress);
  await setReactiveTx.wait();
  console.log("   Reactive contract set!");
  console.log("   ShoeNFT.shoeReactiveContract():", await shoeNFT.shoeReactiveContract());

  console.log("\n===========================================");
  console.log("Lasna Deployment Summary");
  console.log("===========================================");
  console.log("ShoeNFT:", shoeNFTAddress);
  console.log("ShoeReactive:", shoeReactiveAddress);
  console.log("Reactive System: 0x0000000000000000000000000000000000fffFfF");
  console.log("===========================================\n");

  // Verification instructions
  console.log("To verify on block explorer:");
  console.log(`npx hardhat verify --network lasna ${shoeNFTAddress} ${deployer.address}`);
  console.log(`npx hardhat verify --network lasna ${shoeReactiveAddress} ${originChainId} ${originContract} ${eventTopic0} ${shoeNFTAddress} --constructor-args scripts/args-lasna.js\n`);

  // Save deployment info
  const deploymentInfo = {
    network: "lasna",
    contracts: {
      ShoeNFT: shoeNFTAddress,
      ShoeReactive: shoeReactiveAddress
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
