require("dotenv").config();
const { ethers } = require("ethers");

async function testConnection() {
  console.log("Testing Sepolia connection...");

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

  try {
    // Test basic connection
    const network = await provider.getNetwork();
    console.log("Connected to network:", network.name, "Chain ID:", network.chainId);

    // Test getting block number
    const blockNumber = await provider.getBlockNumber();
    console.log("Latest block number:", blockNumber);

    // Test getting balance
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      const balance = await provider.getBalance(accounts[0]);
      console.log("Account 0 balance:", ethers.formatEther(balance), "ETH");
    }

  } catch (error) {
    console.error("Connection failed:", error.message);
  }
}

testConnection();