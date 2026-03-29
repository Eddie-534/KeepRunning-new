const hre = require("hardhat");

async function main() {
  console.log("Deploying ShoeRunOrigin to Sepolia...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy ShoeRunOrigin contract
  const ShoeRunOrigin = await hre.ethers.getContractFactory("ShoeRunOrigin");
  const shoeRunOrigin = await ShoeRunOrigin.deploy();

  await shoeRunOrigin.waitForDeployment();
  const contractAddress = await shoeRunOrigin.getAddress();

  console.log("\n===========================================");
  console.log("ShoeRunOrigin deployed to:", contractAddress);
  console.log("===========================================\n");

  // Verification instructions
  console.log("To verify on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${contractAddress}`);

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    contract: "ShoeRunOrigin",
    address: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString()
  };

  console.log("\nDeployment Info:", JSON.stringify(deploymentInfo, null, 2));

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
