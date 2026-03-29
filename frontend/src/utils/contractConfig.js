// Contract configuration for Keep Running

export const contractConfig = {
  // Sepolia network configuration
  sepolia: {
    chainId: 11155111,
    rpcUrl: process.env.REACT_APP_SEPOLIA_RPC || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    explorerUrl: "https://sepolia.etherscan.io",

    // Contract addresses (to be updated after deployment)
    shoeRunOrigin: process.env.REACT_APP_SHOE_RUN_ORIGIN_ADDRESS || "0x0000000000000000000000000000000000000000",

    // ABI (simplified - import from compiled contracts in production)
    abi: [
      "event RunRecorded(address indexed user, uint256 distance, uint256 duration, uint256 timestamp, uint256 indexed recordId)",
      "event RunRecordUpdated(address indexed user, uint256 indexed recordId, uint256 newDistance, uint256 newDuration, uint256 newTimestamp)",
      "function recordRun(uint256 distance, uint256 duration) external",
      "function getUserTotalDistance(address) view returns (uint256)",
      "function getUserTotalDistanceMeters(address) view returns (uint256)",
      "function getRunRecord(uint256) view returns (address user, uint256 distance, uint256 duration, uint256 timestamp, bool isValid)",
      "function getUserRecordIds(address) view returns (uint256[])",
      "function getUserRunCount(address) view returns (uint256)",
      "function getStatistics() view returns (uint256 totalDistanceInMeters, uint256 totalRunsCount, uint256 totalUsersCount, uint256 totalRecordsCount)"
    ]
  },

  // Lasna network configuration
  lasna: {
    chainId: 1337, // Update with actual Lasna chain ID
    rpcUrl: process.env.REACT_APP_LASNA_RPC || "https://rpc.lasna.com",
    explorerUrl: "https://explorer.lasna.com",

    // Contract addresses (to be updated after deployment)
    shoeNFT: process.env.REACT_APP_SHOE_NFT_ADDRESS || "0x0000000000000000000000000000000000000000",
    shoeReactive: process.env.REACT_APP_SHOE_REACTIVE_ADDRESS || "0x0000000000000000000000000000000000000000",

    // ShoeNFT ABI
    nftAbi: [
      "event ShoeUpgraded(address indexed user, uint256 indexed tokenId, uint256 oldLevel, uint256 newLevel, uint256 totalDistance)",
      "event ShoeMinted(address indexed user, uint256 indexed tokenId, uint256 level)",
      "function getUserShoeLevel(address) view returns (uint256)",
      "function getUserShoeInfo(address) view returns (uint256 tokenId, uint256 level, uint256 mintedAt)",
      "function getLevelProgress(address, uint256) view returns (uint256 currentLevel, uint256 nextLevelDistance, uint256 progress)",
      "function getRequiredDistance(uint256) pure returns (uint256)",
      "function grantBaseShoe(address) external"
    ]
  },

  // WebSocket configuration
  ws: {
    url: process.env.REACT_APP_WS_URL || "ws://localhost:3002",
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  },

  // Level configuration
  levels: {
    1: {
      name: "Base Runner",
      description: "The beginning of your running journey",
      requiredDistance: 0,
      color: "#6a737d"
    },
    2: {
      name: "Bronze Warrior",
      description: "50 km conquered - Bronze status achieved",
      requiredDistance: 50,
      color: "#cd7f32"
    },
    3: {
      name: "Silver Knight",
      description: "150 km conquered - Silver status achieved",
      requiredDistance: 150,
      color: "#c0c0c0"
    },
    4: {
      name: "Golden Champion",
      description: "300 km conquered - Golden status achieved",
      requiredDistance: 300,
      color: "#ffd700"
    },
    5: {
      name: "Rainbow Legend",
      description: "500 km conquered - Legendary status achieved",
      requiredDistance: 500,
      color: "rainbow"
    }
  }
};

export const calculateLevel = (distanceKm) => {
  if (distanceKm >= 500) return 5;
  if (distanceKm >= 300) return 4;
  if (distanceKm >= 150) return 3;
  if (distanceKm >= 50) return 2;
  if (distanceKm >= 0) return 1;
  return 0;
};

export const formatDistance = (meters) => {
  const km = meters / 1000;
  if (km < 1) {
    return `${meters}m`;
  }
  return `${km.toFixed(2)}km`;
};

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const shortenAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
