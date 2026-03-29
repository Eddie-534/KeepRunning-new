const hre = require("hardhat");

async function main() {
  console.log("Deploying ShoeRunOrigin to Sepolia...");

  // Get the deployer account
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0];
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy ShoeRunOrigin contract
  console.log("\n1. Deploying ShoeRunOrigin...");
  const ShoeRunOrigin = await hre.ethers.getContractFactory("ShoeRunOrigin");
  const shoeRunOrigin = await ShoeRunOrigin.deploy();
  await shoeRunOrigin.waitForDeployment();
  const shoeRunOriginAddress = await shoeRunOrigin.getAddress();
  console.log("   ShoeRunOrigin deployed to:", shoeRunOriginAddress);

  // Calculate event topic0
  const runRecordedTopic0 = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes("RunRecorded(address,uint256,uint256,uint256,uint256)")
  );
  console.log("   RunRecorded topic0:", runRecordedTopic0);

  console.log("\n===========================================");
  console.log("Sepolia Deployment Summary");
  console.log("===========================================");
  console.log("ShoeRunOrigin:", shoeRunOriginAddress);
  console.log("RunRecorded topic0:", runRecordedTopic0);
  console.log("Sepolia Chain ID: 11155111");
  console.log("===========================================\n");

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    contracts: {
      ShoeRunOrigin: shoeRunOriginAddress
    },
    events: {
      RunRecorded: {
        topic0: runRecordedTopic0
      }
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: "11155111"
  };

  console.log("Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  return {
    shoeRunOriginAddress,
    runRecordedTopic0
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
