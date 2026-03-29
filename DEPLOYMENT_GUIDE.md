# Keep Running - 部署和测试指南

## 概述

本项目使用 Reactive Network 实现跨链响应式 NFT 升级系统：
- **ShoeRunOrigin**: 部署在 Sepolia，记录用户跑步数据
- **ShoeNFT**: 部署在 Lasna，管理可升级的跑鞋 NFT
- **ShoeReactive**: 部署在 Lasna，监听 Sepolia 事件并自动触发 NFT 升级

## 合约修复说明

### 1. ShoeReactive.sol 关键修复

**问题**: Reactive Network 无法调用 `react` 函数

**修复内容**:
- ✅ 继承 `AbstractReactive`（官方标准）
- ✅ `react` 函数添加 `vmOnly` modifier
- ✅ 使用官方 `IReactive.LogRecord` 结构
- ✅ 修复 topic 解析逻辑（`topic_1` = user, `topic_2` = recordId）
- ✅ 修复距离获取逻辑（使用 `getUserTotalDistance` 而非累加）

### 2. 单位统一

**修复**: 统一使用 `km × 10` 作为单位

| 合约 | 返回值/参数 | 单位 | 示例 |
|------|-------------|------|------|
| ShoeRunOrigin.getUserTotalDistance | 返回值 | km × 10 | 500 = 50km |
| ShoeNFT.upgradeShoe | 参数 | km × 10 | 500 = 50km |
| ShoeNFT.LEVEL_2_DISTANCE | 阈值 | km × 10 | 500 = 50km |

### 3. 权限配置

- `ShoeNFT.upgradeShoe` 使用 `onlyShoeReactive` 修饰符
- 必须调用 `setReactiveContract(shoeReactiveAddress)` 授权
- `ShoeReactive` 继承 `AbstractReactive`，自动配置 Reactive Network 权限

---

## 部署步骤

### 步骤 1: 准备环境变量

```bash
# .env 文件配置
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
LASNA_RPC_URL=https://lasna-rpc.com
PRIVATE_KEY=your_private_key_here
```

### 步骤 2: 部署到 Sepolia

```bash
npx hardhat run scripts/deploySepolia.js --network sepolia
```

**输出**:
- `ShoeRunOrigin` 地址
- `RunRecorded` 事件的 `topic0` 值

**保存以下信息**:
```
SEPOLIA_SHOE_RUN_ORIGIN=0x...
RUN_RECORDED_TOPIC0=0x...
```

### 步骤 3: 部署到 Lasna

```bash
export ORIGIN_CHAIN_ID=11155111
export ORIGIN_CONTRACT=<SEPOLIA_SHOE_RUN_ORIGIN>
export EVENT_TOPIC0=<RUN_RECORDED_TOPIC0>

npx hardhat run scripts/deployLasna.js --network lasna
```

**输出**:
- `ShoeNFT` 地址
- `ShoeReactive` 地址

**保存以下信息**:
```
LASNA_SHOE_NFT=0x...
LASNA_SHOE_REACTIVE=0x...
```

---

## 验证部署

### 1. 检查 Sepolia 合约

```bash
npx hardhat console --network sepolia
```

```javascript
const ShoeRunOrigin = await ethers.getContractFactory("ShoeRunOrigin");
const origin = await ShoeRunOrigin.attach("<SEPOLIA_SHOE_RUN_ORIGIN>");
console.log("Total records:", await origin.getTotalRecords());
console.log("Statistics:", await origin.getStatistics());
```

### 2. 检查 Lasna 合约

```bash
npx hardhat console --network lasna
```

```javascript
const ShoeNFT = await ethers.getContractFactory("ShoeNFT");
const nft = await ShoeNFT.attach("<LASNA_SHOE_NFT>");

const ShoeReactive = await ethers.getContractFactory("ShoeReactive");
const reactive = await ShoeReactive.attach("<LASNA_SHOE_REACTIVE>");

// 检查 Reactive 合约配置
console.log("Origin Chain ID:", await reactive.originChainId());
console.log("ShoeNFT:", await reactive.shoeNFT());
console.log("ShoeRunOrigin:", await reactive.shoeRunOrigin());

// 检查权限配置
console.log("ShoeNFT.shoeReactiveContract():", await nft.shoeReactiveContract());
// 应该等于 ShoeReactive 地址
```

---

## 测试流程

### 测试 1: 基础 NFT 铸造

```bash
npx hardhat console --network lasna
```

```javascript
const ShoeNFT = await ethers.getContractFactory("ShoeNFT");
const nft = await ShoeNFT.attach("<LASNA_SHOE_NFT>");

// 铸造基础 NFT
const tx = await nft.grantBaseShoe("<YOUR_ADDRESS>");
await tx.wait();

// 检查 NFT 信息
const info = await nft.getUserShoeInfo("<YOUR_ADDRESS>");
console.log("Token ID:", info[0]);
console.log("Level:", info[1]);
```

### 测试 2: 记录跑步（Sepolia）

```bash
npx hardhat console --network sepolia
```

```javascript
const ShoeRunOrigin = await ethers.getContractFactory("ShoeRunOrigin");
const origin = await ShoeRunOrigin.attach("<SEPOLIA_SHOE_RUN_ORIGIN>");

// 记录一次 10km 跑步
const tx = await origin.recordRun(
  10000,  // 距离：10000米 = 10km
  3600    // 时长：3600秒 = 1小时
);
await tx.wait();

// 检查用户总距离
const distance = await origin.getUserTotalDistance("<YOUR_ADDRESS>");
console.log("Total distance (km×10):", distance.toString());
// 10km = 100
```

### 测试 3: 累积跑步达到升级阈值

**继续记录跑步直到达到 50km（阈值）**:

```javascript
// 再记录 5 次 8km 跑步
for (let i = 0; i < 5; i++) {
  const tx = await origin.recordRun(8000, 3000);
  await tx.wait();
  console.log(`Run ${i+1} recorded`);
}

// 检查总距离
const totalDistance = await origin.getUserTotalDistance("<YOUR_ADDRESS>");
console.log("Total distance (km×10):", totalDistance.toString());
// 应该是 500 或以上 (50km)
```

### 测试 4: 验证 Reactive 自动升级

**检查 Lasna NFT 是否升级**:

```bash
npx hardhat console --network lasna
```

```javascript
const ShoeNFT = await ethers.getContractFactory("ShoeNFT");
const nft = await ShoeNFT.attach("<LASNA_SHOE_NFT>");

// 检查用户 NFT 等级
const level = await nft.getUserShoeLevel("<YOUR_ADDRESS>");
console.log("Current Level:", level.toString());
// 应该是 2 (Bronze Warrior)

// 检查 NFT 详情
const info = await nft.getUserShoeInfo("<YOUR_ADDRESS>");
console.log("Token ID:", info[0].toString());
console.log("Level:", info[1].toString());

// 检查新 NFT 的等级
if (info[0] !== "0") {
  const tokenLevel = await nft.getTokenLevel(info[0]);
  console.log("Token Level:", tokenLevel.toString());
}
```

### 测试 5: 检查 Reactive 事件（可选）

**在 Lasna 上查询 ReactiveEventReceived 事件**:

```javascript
const ShoeReactive = await ethers.getContractFactory("ShoeReactive");
const reactive = await ShoeReactive.attach("<LASNA_SHOE_REACTIVE>");

// 查询事件
const events = await reactive.queryFilter(
  reactive.filters.ReactiveEventReceived("<YOUR_ADDRESS>")
);

console.log(`Found ${events.length} ReactiveEventReceived events`);
events.forEach((event, i) => {
  console.log(`Event ${i+1}:`);
  console.log("  Distance (m):", event.args[1].toString());
  console.log("  Timestamp:", event.args[3].toString());
});
```

---

## 故障排查

### 问题 1: Reactive Network 未调用 react 函数

**可能原因**:
1. `react` 函数缺少 `vmOnly` modifier ✅ 已修复
2. `LogRecord` 结构错误 ✅ 已修复
3. 订阅配置错误

**检查方法**:
```javascript
// 在 Lasna 上检查订阅状态
// Reactive Network 控制台查看 RVM TRANSACTIONS 计数
```

### 问题 2: upgradeShoe 调用失败

**可能原因**:
1. `shoeReactiveContract` 未正确设置

**检查方法**:
```javascript
const shoeReactiveContract = await nft.shoeReactiveContract();
console.log("ShoeReactive Contract:", shoeReactiveContract);
// 应该等于 ShoeReactive 地址
```

**修复方法**:
```javascript
const tx = await nft.setReactiveContract("<LASNA_SHOE_REACTIVE>");
await tx.wait();
```

### 问题 3: NFT 未升级

**可能原因**:
1. 用户没有基础 NFT
2. 距离未达到升级阈值

**检查方法**:
```javascript
// 检查是否有 NFT
const info = await nft.getUserShoeInfo("<YOUR_ADDRESS>");
console.log("Token ID:", info[0].toString());

// 检查距离
const distance = await origin.getUserTotalDistance("<YOUR_ADDRESS>");
console.log("Distance (km×10):", distance.toString());

// 检查升级阈值
const level2Threshold = await nft.getRequiredDistance(2);
console.log("Level 2 threshold:", level2Threshold.toString());
```

---

## 关键注意事项

1. **部署顺序**: Sepolia → Lasna
2. **Reactive 合约需要 0.1 ether** 用于创建 ReactVM
3. **单位统一**: 所有距离都使用 `km × 10`
4. **权限配置**: 必须调用 `setReactiveContract` 授权
5. **topic 解析**: `topic_1` = user, `topic_2` = recordId

---

## 合约地址参考

部署完成后，请记录以下地址：

```
# Sepolia
SHOE_RUN_ORIGIN=0x...

# Lasna
SHOE_NFT=0x...
SHOE_REACTIVE=0x...
```

---

## 常用命令

```bash
# 部署 Sepolia
npx hardhat run scripts/deploySepolia.js --network sepolia

# 部署 Lasna
npx hardhat run scripts/deployLasna.js --network lasna

# 编译合约
npx hardhat compile

# 验证合约
npx hardhat verify --network lasna <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# 进入控制台
npx hardhat console --network lasna
```
