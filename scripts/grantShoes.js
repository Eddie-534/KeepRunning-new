const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // Get contract address from args or env
  const nftAddress = process.env.SHOE_NFT_ADDRESS;
  if (!nftAddress) {
    console.error("Please set SHOE_NFT_ADDRESS in environment or .env file");
    process.exit(1);
  }

  console.log("Granting base shoes to users on Lasna...");
  console.log("ShoeNFT Address:", nftAddress);

  // Get ShoeNFT contract
  const ShoeNFT = await hre.ethers.getContractFactory("ShoeNFT");
  const shoeNFT = ShoeNFT.attach(nftAddress);

  // Get addresses to grant shoes to
  const addresses = process.argv.slice(2);
  if (addresses.length === 0) {
    console.log("Usage: npx hardhat run scripts/grantShoes.js --network lasna <address1> <address2> ...");
    console.log("No addresses provided. Granting to deployer only...");
    addresses.push(deployer.address);
  }

  // Grant shoes to each address
  for (const address of addresses) {
    console.log(`\nProcessing address: ${address}`);

    try {
      // Check if user already has a shoe
      const existingLevel = await shoeNFT.getUserShoeLevel(address);
      if (existingLevel > 0) {
        console.log(`  User already has a shoe (Level ${existingLevel}). Skipping.`);
        continue;
      }

      // Grant base shoe
      const tx = await shoeNFT.grantBaseShoe(address);
      await tx.wait();

      console.log(`  Base shoe granted!`);
      console.log(`  Tx hash: ${tx.hash}`);

      // Verify the grant
      const newLevel = await shoeNFT.getUserShoeLevel(address);
      console.log(`  Current level: ${newLevel.toString()}`);

    } catch (error) {
      console.error(`  Error granting shoe to ${address}:`, error.message);
    }
  }

  console.log("\n===========================================");
  console.log("Granting completed!");
  console.log("===========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
