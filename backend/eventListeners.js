const { ethers } = require("ethers");

// Contract ABIs (simplified - in production, import from compiled contracts)
const SHOE_RUN_ORIGIN_ABI = [
  "event RunRecorded(address indexed user, uint256 distance, uint256 duration, uint256 timestamp, uint256 indexed recordId)",
  "event RunRecordUpdated(address indexed user, uint256 indexed recordId, uint256 newDistance, uint256 newDuration, uint256 newTimestamp)",
  "function getUserTotalDistance(address) view returns (uint256)",
  "function getUserTotalDistanceMeters(address) view returns (uint256)",
  "function getRunRecord(uint256) view returns (address user, uint256 distance, uint256 duration, uint256 timestamp, bool isValid)",
  "function getUserRecordIds(address) view returns (uint256[])",
  "function getUserRunCount(address) view returns (uint256)",
  "function getStatistics() view returns (uint256 totalDistanceInMeters, uint256 totalRunsCount, uint256 totalUsersCount, uint256 totalRecordsCount)"
];

const SHOE_NFT_ABI = [
  "event ShoeUpgraded(address indexed user, uint256 indexed tokenId, uint256 oldLevel, uint256 newLevel, uint256 totalDistance)",
  "event ShoeMinted(address indexed user, uint256 indexed tokenId, uint256 level)",
  "function getUserShoeLevel(address) view returns (uint256)",
  "function getUserShoeInfo(address) view returns (uint256 tokenId, uint256 level, uint256 mintedAt)",
  "function getLevelProgress(address, uint256) view returns (uint256 currentLevel, uint256 nextLevelDistance, uint256 progress)"
];

const SHOE_REACTIVE_ABI = [
  "event ReactiveEventReceived(address indexed user, uint256 distance, uint256 duration, uint256 timestamp, uint256 recordId, address contractAddress)",
  "event ProcessingRunRecord(address indexed user, uint256 distance, uint256 timestamp, uint256 recordId)",
  "event ShoeUpgradeTriggered(address indexed user, uint256 totalDistance, uint256 newLevel, bool success)",
  "event UserDistanceStored(address indexed user, uint256 distance)",
  "function storeUserDistance(address, uint256 distance)",
  "function setShoeNFT(address)",
  "function subscribeToSepoliaEvents() returns (bytes32)",
  "function manualUpgrade(address, uint256)"
];

// Block explorer URLs
const EXPLORER_URLS = {
  sepolia: "https://sepolia.etherscan.io",
  lasna: "https://explorer.lasna.com"
};

// State
let sepoliaProvider;
let lasnaProvider;
let shoeRunOriginContract;
let shoeNftContract;
let shoeReactiveContract;
let listenerStarted = false;

/**
 * Start event listeners for both chains
 * @param {WebSocketServer} wss - WebSocket server instance
 */
async function startEventListeners(wss) {
  if (listenerStarted) {
    console.log("Event listeners already started");
    return;
  }

  console.log("Starting blockchain event listeners...\n");

  try {
    // Initialize providers (ethers v5 syntax)
    sepoliaProvider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    lasnaProvider = new ethers.providers.JsonRpcProvider(process.env.LASNA_RPC_URL);

    // Initialize contracts
    shoeRunOriginContract = new ethers.Contract(
      process.env.SHOE_RUN_ORIGIN_ADDRESS,
      SHOE_RUN_ORIGIN_ABI,
      sepoliaProvider
    );

    shoeNftContract = new ethers.Contract(
      process.env.SHOE_NFT_ADDRESS,
      SHOE_NFT_ABI,
      lasnaProvider
    );

    // Initialize ShoeReactive contract if address is provided
    if (process.env.SHOE_REACTIVE_ADDRESS) {
      shoeReactiveContract = new ethers.Contract(
        process.env.SHOE_REACTIVE_ADDRESS,
        SHOE_REACTIVE_ABI,
        lasnaProvider
      );
      await startShoeReactiveListener(wss);
    }

    console.log("Connected to providers:");
    console.log(`  Sepolia: ${process.env.SEPOLIA_RPC_URL}`);
    console.log(`  Lasna: ${process.env.LASNA_RPC_URL}`);
    console.log("\nContract addresses:");
    console.log(`  ShoeRunOrigin (Sepolia): ${process.env.SHOE_RUN_ORIGIN_ADDRESS}`);
    console.log(`  ShoeNFT (Lasna): ${process.env.SHOE_NFT_ADDRESS}`);
    console.log(`  ShoeReactive (Lasna): ${process.env.SHOE_REACTIVE_ADDRESS || "Not configured"}\n`);

    // Listen to Sepolia events
    await startSepoliaListener(wss);

    // Listen to Lasna events
    await startLasnaListener(wss);

    listenerStarted = true;

  } catch (error) {
    console.error("Error starting event listeners:", error);
    throw error;
  }
}

/**
 * Start listening to Sepolia events
 * @param {WebSocketServer} wss - WebSocket server instance
 */
async function startSepoliaListener(wss) {
  console.log("Setting up Sepolia event listeners...");

  // Listen for RunRecorded events
  shoeRunOriginContract.on("RunRecorded", async (user, distance, duration, timestamp, recordId, event) => {
    const blockNumber = event.blockNumber;
    const txHash = event.transactionHash;

    console.log("\n=======================================");
    console.log("Sepolia Event: RunRecorded");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Distance: ${(distance / 1000).toFixed(2)} km`);
    console.log(`Duration: ${Math.floor(duration / 60)} min ${duration % 60} sec`);
    console.log(`Record ID: ${recordId}`);
    console.log(`Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
    console.log(`Block: ${blockNumber}`);
    console.log(`Tx Hash: ${txHash}`);
    console.log(`Explorer: ${EXPLORER_URLS.sepolia}/tx/${txHash}`);

    // Fetch additional data
    try {
      const [userTotalDistance, userRunCount] = await Promise.all([
        shoeRunOriginContract.getUserTotalDistanceMeters(user),
        shoeRunOriginContract.getUserRunCount(user)
      ]);

      console.log(`User Total Distance: ${(userTotalDistance / 1000).toFixed(2)} km`);
      console.log(`User Run Count: ${userRunCount.toString()}`);

      // Broadcast to WebSocket clients
      broadcastEvent(wss, {
        type: "RUN_RECORDED",
        data: {
          user,
          distance: distance.toString(),
          distanceKm: (distance / 1000).toFixed(2),
          duration: duration.toString(),
          durationMin: Math.floor(duration / 60),
          durationSec: duration % 60,
          timestamp: timestamp.toString(),
          recordId: recordId.toString(),
          userTotalDistance: userTotalDistance.toString(),
          userTotalDistanceKm: (userTotalDistance / 1000).toFixed(2),
          userRunCount: userRunCount.toString(),
          blockNumber: blockNumber.toString(),
          txHash,
          explorerUrl: `${EXPLORER_URLS.sepolia}/tx/${txHash}`,
          network: "sepolia"
        }
      });
    } catch (error) {
      console.error("Error fetching additional data:", error.message);
    }
  });

  // Listen for RunRecordUpdated events
  shoeRunOriginContract.on("RunRecordUpdated", async (user, recordId, newDistance, newDuration, newTimestamp, event) => {
    const txHash = event.transactionHash;

    console.log("\n=======================================");
    console.log("Sepolia Event: RunRecordUpdated");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Record ID: ${recordId}`);
    console.log(`New Distance: ${(newDistance / 1000).toFixed(2)} km`);
    console.log(`New Duration: ${Math.floor(newDuration / 60)} min ${newDuration % 60} sec`);
    console.log(`Tx Hash: ${txHash}`);
    console.log(`Explorer: ${EXPLORER_URLS.sepolia}/tx/${txHash}`);

    broadcastEvent(wss, {
      type: "RUN_UPDATED",
      data: {
        user,
        recordId: recordId.toString(),
        newDistance: newDistance.toString(),
        newDistanceKm: (newDistance / 1000).toFixed(2),
        newDuration: newDuration.toString(),
        txHash,
        explorerUrl: `${EXPLORER_URLS.sepolia}/tx/${txHash}`,
        network: "sepolia"
      }
    });
  });

  console.log("Sepolia event listeners started ✓\n");
}

/**
 * Start listening to Lasna events
 * @param {WebSocketServer} wss - WebSocket server instance
 */
async function startLasnaListener(wss) {
  console.log("Setting up Lasna event listeners...");

  // Listen for ShoeUpgraded events
  shoeNftContract.on("ShoeUpgraded", async (user, tokenId, oldLevel, newLevel, totalDistance, event) => {
    const blockNumber = event.blockNumber;
    const txHash = event.transactionHash;

    console.log("\n=======================================");
    console.log("Lasna Event: ShoeUpgraded");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Token ID: ${tokenId.toString()}`);
    console.log(`Old Level: ${oldLevel.toString()}`);
    console.log(`New Level: ${newLevel.toString()}`);
    console.log(`Total Distance: ${totalDistance.toString()} km`);
    console.log(`Block: ${blockNumber}`);
    console.log(`Tx Hash: ${txHash}`);
    console.log(`Explorer: ${EXPLORER_URLS.lasna}/tx/${txHash}`);

    // Fetch level progress
    try {
      const [currentLevel, nextLevelDistance, progress] = await shoeNftContract.getLevelProgress(user, totalDistance);

      console.log(`Progress to next level: ${progress.toString()}%`);
      console.log(`Distance to next level: ${nextLevelDistance.toString()} km`);

      // Broadcast to WebSocket clients
      broadcastEvent(wss, {
        type: "SHOE_UPGRADED",
        data: {
          user,
          tokenId: tokenId.toString(),
          oldLevel: oldLevel.toString(),
          newLevel: newLevel.toString(),
          totalDistance: totalDistance.toString(),
          currentLevel: currentLevel.toString(),
          nextLevelDistance: nextLevelDistance.toString(),
          progress: progress.toString(),
          blockNumber: blockNumber.toString(),
          txHash,
          explorerUrl: `${EXPLORER_URLS.lasna}/tx/${txHash}`,
          network: "lasna"
        }
      });
    } catch (error) {
      console.error("Error fetching level progress:", error.message);

      // Broadcast without progress data
      broadcastEvent(wss, {
        type: "SHOE_UPGRADED",
        data: {
          user,
          tokenId: tokenId.toString(),
          oldLevel: oldLevel.toString(),
          newLevel: newLevel.toString(),
          totalDistance: totalDistance.toString(),
          blockNumber: blockNumber.toString(),
          txHash,
          explorerUrl: `${EXPLORER_URLS.lasna}/tx/${txHash}`,
          network: "lasna"
        }
      });
    }
  });

  // Listen for ShoeMinted events
  shoeNftContract.on("ShoeMinted", async (user, tokenId, level, event) => {
    const txHash = event.transactionHash;

    console.log("\n=======================================");
    console.log("Lasna Event: ShoeMinted");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Token ID: ${tokenId.toString()}`);
    console.log(`Level: ${level.toString()}`);
    console.log(`Tx Hash: ${txHash}`);
    console.log(`Explorer: ${EXPLORER_URLS.lasna}/tx/${txHash}`);

    broadcastEvent(wss, {
      type: "SHOE_MINTED",
      data: {
        user,
        tokenId: tokenId.toString(),
        level: level.toString(),
        txHash,
        explorerUrl: `${EXPLORER_URLS.lasna}/tx/${txHash}`,
        network: "lasna"
      }
    });
  });

  console.log("Lasna event listeners started ✓\n");
}

/**
 * Start listening to ShoeReactive contract events
 * @param {WebSocketServer} wss - WebSocket server instance
 */
async function startShoeReactiveListener(wss) {
  console.log("Setting up ShoeReactive event listeners...");

  // Listen for ReactiveEventReceived (when react() is triggered)
  shoeReactiveContract.on("ReactiveEventReceived", async (user, distance, duration, timestamp, recordId, contractAddress) => {
    console.log("\n=======================================");
    console.log("ShoeReactive Event: ReactiveEventReceived");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Distance: ${(distance / 1000).toFixed(2)} km`);
    console.log(`Duration: ${Math.floor(duration / 60)} min ${duration % 60} sec`);
    console.log(`Record ID: ${recordId}`);
    console.log(`Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
    console.log(`Contract: ${contractAddress}`);

    // Broadcast to WebSocket clients
    broadcastEvent(wss, {
      type: "REACTIVE_EVENT_RECEIVED",
      data: {
        user,
        distance: distance.toString(),
        distanceKm: (distance / 1000).toFixed(2),
        duration: duration.toString(),
        durationMin: Math.floor(duration / 60),
        durationSec: duration % 60,
        timestamp: timestamp.toString(),
        recordId: recordId.toString(),
        contractAddress,
        network: "lasna"
      }
    });
  });

  // Listen for ProcessingRunRecord events
  shoeReactiveContract.on("ProcessingRunRecord", async (user, distance, timestamp, recordId) => {
    console.log("\n=======================================");
    console.log("ShoeReactive Event: ProcessingRunRecord");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Distance: ${(distance / 1000).toFixed(2)} km`);
    console.log(`Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
    console.log(`Record ID: ${recordId}`);

    broadcastEvent(wss, {
      type: "RUN_PROCESSING",
      data: {
        user,
        distance: distance.toString(),
        distanceKm: (distance / 1000).toFixed(2),
        timestamp: timestamp.toString(),
        recordId: recordId.toString(),
        network: "lasna"
      }
    });
  });

  // Listen for ShoeUpgradeTriggered events
  shoeReactiveContract.on("ShoeUpgradeTriggered", async (user, totalDistance, newLevel, success) => {
    console.log("\n=======================================");
    console.log("ShoeReactive Event: ShoeUpgradeTriggered");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Total Distance: ${totalDistance.toString()} km`);
    console.log(`New Level: ${newLevel.toString()}`);
    console.log(`Success: ${success}`);

    broadcastEvent(wss, {
      type: success ? "SHOE_UPGRADED" : "SHOE_UPGRADE_FAILED",
      data: {
        user,
        totalDistance: totalDistance.toString(),
        newLevel: newLevel.toString(),
        success,
        network: "lasna"
      }
    });
  });

  // Listen for UserDistanceStored events
  shoeReactiveContract.on("UserDistanceStored", async (user, distance) => {
    console.log("\n=======================================");
    console.log("ShoeReactive Event: UserDistanceStored");
    console.log("=======================================");
    console.log(`User: ${user}`);
    console.log(`Distance: ${distance.toString()} meters (${(distance / 1000).toFixed(2)} km)`);

    broadcastEvent(wss, {
      type: "USER_DISTANCE_UPDATED",
      data: {
        user,
        distance: distance.toString(),
        distanceKm: (distance / 1000).toFixed(2),
        network: "lasna"
      }
    });
  });

  console.log("ShoeReactive event listeners started ✓\n");
}

/**
 * Broadcast event to all WebSocket clients
 * @param {WebSocketServer} wss - WebSocket server instance
 * @param {Object} eventData - Event data to broadcast
 */
function broadcastEvent(wss, eventData) {
  const message = JSON.stringify(eventData);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error("Error sending to client:", error.message);
      }
    }
  });

  console.log(`Broadcasted to ${wss.clients.size} client(s)`);
}

/**
 * Query user data from contracts
 * @param {string} userAddress - User address
 * @returns {Object} User data
 */
async function queryUserData(userAddress) {
  try {
    const [totalDistance, runCount, shoeLevel, shoeInfo] = await Promise.all([
      shoeRunOriginContract.getUserTotalDistanceMeters(userAddress),
      shoeRunOriginContract.getUserRunCount(userAddress),
      shoeNftContract.getUserShoeLevel(userAddress),
      shoeNftContract.getUserShoeInfo(userAddress)
    ]);

    return {
      userAddress,
      totalDistance: totalDistance.toString(),
      totalDistanceKm: (totalDistance / 1000).toFixed(2),
      runCount: runCount.toString(),
      shoeLevel: shoeLevel.toString(),
      shoeInfo: {
        tokenId: shoeInfo[0].toString(),
        level: shoeInfo[1].toString(),
        mintedAt: shoeInfo[2].toString()
      }
    };
  } catch (error) {
    console.error("Error querying user data:", error.message);
    throw error;
  }
}

/**
 * Query contract statistics
 * @returns {Object} Statistics
 */
async function queryStatistics() {
  try {
    const [stats] = await shoeRunOriginContract.getStatistics();

    return {
      totalDistance: stats.totalDistanceInMeters.toString(),
      totalDistanceKm: (Number(stats.totalDistanceInMeters) / 1000).toFixed(2),
      totalRuns: stats.totalRunsCount.toString(),
      totalUsers: stats.totalUsersCount.toString(),
      totalRecords: stats.totalRecordsCount.toString()
    };
  } catch (error) {
    console.error("Error querying statistics:", error.message);
    throw error;
  }
}

module.exports = {
  startEventListeners,
  broadcastEvent,
  queryUserData,
  queryStatistics,
  startShoeReactiveListener
};
