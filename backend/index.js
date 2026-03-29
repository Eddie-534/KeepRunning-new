require("dotenv").config();
const { startEventListeners, startShoeReactiveListener } = require("./eventListeners");
const { startWebSocketServer } = require("./websocketServer");

const PORT = process.env.BACKEND_PORT || 3001;

async function main() {
  console.log("=======================================");
  console.log("Keep Running - Backend Server");
  console.log("=======================================\n");

  // Validate environment variables
  validateEnvironment();

  // Start WebSocket server
  const wss = startWebSocketServer();
  console.log(`WebSocket server listening on port ${process.env.WS_PORT || 3002}\n`);

  // Start blockchain event listeners
  await startEventListeners(wss);

  console.log("\n=======================================");
  console.log("All services started successfully!");
  console.log("=======================================");
}

function validateEnvironment() {
  console.log("Validating environment variables...\n");

  const requiredVars = {
    "SEPOLIA_RPC_URL": process.env.SEPOLIA_RPC_URL,
    "LASNA_RPC_URL": process.env.LASNA_RPC_URL,
    "SHOE_RUN_ORIGIN_ADDRESS": process.env.SHOE_RUN_ORIGIN_ADDRESS,
    "SHOE_NFT_ADDRESS": process.env.SHOE_NFT_ADDRESS,
    "SHOE_REACTIVE_ADDRESS": process.env.SHOE_REACTIVE_ADDRESS,
    "REACTIVE_NETWORK_SERVICE": process.env.REACTIVE_NETWORK_SERVICE
  };

  let missingVars = [];
  let emptyVars = [];

  for (const [varName, value] of Object.entries(requiredVars)) {
    if (!value) {
      missingVars.push(varName);
    } else if (value === "" || value === "0x" || value.startsWith("YOUR_")) {
      emptyVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error("Missing environment variables:", missingVars.join(", "));
    console.error("Please copy .env.example to .env and fill in the required values.");
    process.exit(1);
  }

  if (emptyVars.length > 0) {
    console.warn("Warning: The following environment variables appear to be empty:");
    emptyVars.forEach(v => console.warn(`  - ${v}`));
    console.warn("Please update them in your .env file.\n");
  }

  console.log("Environment validation passed.\n");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

// Start the server
main().catch(error => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
