const hre = require("hardhat");

async function main() {
  console.log("Deploying ShoeReactive to Lasna...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy ShoeReactive contract
  const ShoeReactive = await hre.ethers.getContractFactory("ShoeReactive");
  const shoeReactive = await ShoeReactive.deploy(deployer.address);
  await shoeReactive.deployed();

  const shoeReactiveAddress = await shoeReactive.getAddress();

  console.log("\n===========================================");
  console.log("ShoeReactive deployed to:", shoeReactiveAddress);
  console.log("===========================================\n");

  // Display event topic0 information
  console.log("Event Information:");
  console.log("  RunRecorded topic0:", "0x" + getContractEventSignature("ShoeRunOrigin", "RunRecorded(address indexed user, uint256 distance, uint256 duration, uint256 timestamp, uint256 indexed recordId)"));
  console.log("  Selector: 0x6a9f3b6 (getUserTotalDistanceMeters)");
  console.log("");

  // Verification instructions
  console.log("To verify on Etherscan (if available):");
  console.log(`npx hardhat verify --network lasna ${shoeReactiveAddress} ${deployer.address}\n`);

  // Post-deployment configuration steps
  console.log("===========================================");
  console.log("Post-Deployment Steps");
  console.log("===========================================\n");

  console.log("1. Set Reactive Network Service:");
  console.log(`   call setReactiveNetwork() with the Reactive Network service contract address`);
  console.log(`   Reactive System Address: 0x0000000000000000000000000000000fffFfF\n`);

  console.log("2. Set ShoeRunOrigin Address:");
  console.log(`   call setShoeNFT() with the Sepolia ShoeRunOrigin contract address`);
  console.log(`   (Currently shoeNFT is set to the address itself as a placeholder)\n`);

  console.log("3. Subscribe to Sepolia Events:");
  console.log(`   call subscribeToSepoliaEvents() on ShoeReactive contract`);
  console.log(`   This will subscribe to RunRecorded events on Sepolia (chainId: ${11155111})\n`);

  console.log("4. Pre-mint NFTs:");
  console.log(`   call preMintAllLevels() on ShoeNFT contract`);
  console.log(`   This will mint 1000 NFTs for each of the 5 levels\n`);

  console.log("5. Update Owner to Reactive System:");
  console.log(`   Transfer ownership of ShoeReactive to Reactive Network system contract`);
  console.log(`   This allows Reactive Network to call react() function directly\n`);

  // Save deployment info
  const deploymentInfo = {
    network: "lasna",
    contract: "ShoeReactive",
    address: shoeReactiveAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString()
  };

  console.log("Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  return shoeReactiveAddress;
}

/**
 * @dev Calculate keccak256 of an event signature for a contract
 * @param contractName The name of the contract
 * @param eventSignature The full event signature
 * @return The keccak256 hash as a hex string without 0x prefix
 */
function getContractEventSignature(contractName, eventSignature) {
  // Calculate keccak256 of the event signature
  const eventHash = hre.ethers.utils.keccak256(eventSignature);
  // Return as hex without 0x prefix for easier reading
  return eventHash.replace("0x", "");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
