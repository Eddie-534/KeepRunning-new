const hre = require("hardhat");

/**
 * 测试脚本：验证 Reactive NFT 升级系统
 * 用法：npx hardhat run scripts/test.js --network <network>
 */

async function testSepolia() {
  console.log("=== Testing Sepolia (ShoeRunOrigin) ===\n");

  const [user] = await hre.ethers.getSigners();
  console.log("User address:", user.address);

  const ShoeRunOrigin = await hre.ethers.getContractFactory("ShoeRunOrigin");
  const origin = await ShoeRunOrigin.attach(process.env.SEPOLIA_SHOE_RUN_ORIGIN);

  // 检查用户当前距离
  let distance = await origin.getUserTotalDistance(user.address);
  console.log("Current total distance (km×10):", distance.toString());

  // 记录跑步（10km）
  console.log("\nRecording a 10km run...");
  const recordTx = await origin.recordRun(10000, 3600);
  const receipt = await recordTx.wait();
  console.log("Run recorded! Transaction hash:", receipt.hash);

  // 解析事件
  const event = receipt.logs.find(log => {
    try {
      const parsed = origin.interface.parseLog(log);
      return parsed.name === "RunRecorded";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = origin.interface.parseLog(event);
    console.log("  User:", parsed.args.user);
    console.log("  Distance (m):", parsed.args.distance.toString());
    console.log("  Record ID:", parsed.args.recordId.toString());
  }

  // 检查更新后的距离
  distance = await origin.getUserTotalDistance(user.address);
  console.log("\nUpdated total distance (km×10):", distance.toString());

  return { distance, userAddress: user.address };
}

async function testLasna(userAddress, targetDistance) {
  console.log("\n=== Testing Lasna (ShoeNFT & ShoeReactive) ===\n");

  const [user] = await hre.ethers.getSigners();
  const ShoeNFT = await hre.ethers.getContractFactory("ShoeNFT");
  const ShoeReactive = await hre.ethers.getContractFactory("ShoeReactive");

  const nft = await ShoeNFT.attach(process.env.LASNA_SHOE_NFT);
  const reactive = await ShoeReactive.attach(process.env.LASNA_SHOE_REACTIVE);

  // 检查合约配置
  console.log("ShoeReactive Configuration:");
  console.log("  Origin Chain ID:", await reactive.originChainId());
  console.log("  ShoeNFT:", await reactive.shoeNFT());
  console.log("  ShoeRunOrigin:", await reactive.shoeRunOrigin());

  console.log("\nShoeNFT Configuration:");
  console.log("  shoeReactiveContract:", await nft.shoeReactiveContract());

  // 检查用户 NFT
  const hasShoe = (await nft.getUserShoeInfo(userAddress))[0] !== "0";
  console.log("\nUser has shoe:", hasShoe);

  if (!hasShoe) {
    console.log("Granting base shoe...");
    const grantTx = await nft.grantBaseShoe(userAddress);
    await grantTx.wait();
    console.log("Base shoe granted!");
  }

  // 获取当前 NFT 信息
  const [tokenId, level, mintedAt] = await nft.getUserShoeInfo(userAddress);
  console.log("\nCurrent NFT:");
  console.log("  Token ID:", tokenId.toString());
  console.log("  Level:", level.toString());
  console.log("  Minted at:", new Date(Number(mintedAt) * 1000).toLocaleString());

  // 手动触发升级（用于测试）
  if (targetDistance > 0) {
    console.log("\n=== Manual Upgrade Test ===");
    console.log(`Calling manualUpgrade with distance: ${targetDistance} (km×10)`);

    const upgradeTx = await reactive.manualUpgrade(userAddress, targetDistance);
    const upgradeReceipt = await upgradeTx.wait();

    // 检查升级事件
    const upgradeEvent = upgradeReceipt.logs.find(log => {
      try {
        const parsed = reactive.interface.parseLog(log);
        return parsed.name === "ShoeUpgradeTriggered";
      } catch {
        return false;
      }
    });

    if (upgradeEvent) {
      const parsed = reactive.interface.parseLog(upgradeEvent);
      console.log("  User:", parsed.args.user);
      console.log("  Total Distance:", parsed.args.totalDistance.toString());
      console.log("  New Level:", parsed.args.newLevel.toString());
      console.log("  Success:", parsed.args.success);
    }

    // 获取升级后的 NFT 信息
    const [newTokenId, newLevel] = await nft.getUserShoeInfo(userAddress);
    console.log("\nNew NFT after upgrade:");
    console.log("  Token ID:", newTokenId.toString());
    console.log("  Level:", newLevel.toString());
  }

  // 查询 Reactive 事件
  console.log("\n=== Reactive Events ===");
  const events = await reactive.queryFilter(
    reactive.filters.ReactiveEventReceived(userAddress)
  );

  console.log(`Found ${events.length} ReactiveEventReceived events`);
  events.forEach((event, i) => {
    console.log(`Event ${i + 1}:`);
    console.log("  Distance (m):", event.args[1].toString());
    console.log("  Duration (s):", event.args[2].toString());
    console.log("  Timestamp:", new Date(Number(event.args[3]) * 1000).toLocaleString());
  });
}

async function main() {
  console.log("Keep Running - Test Script\n");

  const network = hre.network.name;
  console.log("Network:", network);
  console.log("");

  if (network === "sepolia") {
    await testSepolia();
  } else if (network === "lasna") {
    const targetDistance = process.env.TARGET_DISTANCE || "500"; // 50km
    await testLasna(process.env.USER_ADDRESS, targetDistance);
  } else {
    console.log("Please specify network: --network sepolia or --network lasna");
    console.log("\nEnvironment variables required:");
    console.log("  SEPOLIA_SHOE_RUN_ORIGIN");
    console.log("  LASNA_SHOE_NFT");
    console.log("  LASNA_SHOE_REACTIVE");
    console.log("  USER_ADDRESS");
    console.log("  TARGET_DISTANCE (optional, default: 500 for 50km)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
