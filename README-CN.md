<h1>🏃 Keep Running - 链上跑步升级 NFT</h1>



<h2>1. 项目简介</h2>

Keep Running 是一个基于 Reactive Network 的去中心化应用，允许用户通过跑步来升级他们的球鞋 NFT。每次跑步记录都会被永久地上链存储。当累计里程达到一个阈值时，球鞋 NFT 会自动升级，整个过程无需任何人工干预。

核心功能：

用户提交跑步记录（距离、时长）

自动计算累计距离

达到等级阈值时自动升级 NFT

球鞋等级的可视化展示



<h2>2. Reactive Network 解决的问题</h2>

传统方案的痛点

传统方案需要一个中心化后端来轮询链上数据、判断升级条件并触发交易，存在以下问题：

中心化风险： 服务器宕机或作恶行为可能影响升级的公平性。

延迟问题： 轮询间隔会导致升级不及时。

信任成本： 用户需要信任项目方不会篡改逻辑。

Reactive Network 的解决方案

完全去中心化： 跑步记录上链后，Reactive 合约会自动监听并触发升级。

透明且可验证： 所有升级逻辑都在链上执行，任何人都可以验证。

实时响应： 事件产生后立即触发，实现秒级响应。

没有 Reactive Network 能否实现？

可以，但需要依赖中心化后端或预言机，这会引入信任假设和单点故障风险。Reactive Network 实现了真正去中心化的自动化闭环。



<h2>3. 已部署合约地址</h2>

ShoeRunOrigin (sepolia): 0x6Ebb6a7aF80cd03efB27D626F73C6502795F8624

ShoeNFT (lasna): 0xDBCda2fa840687585D8d987E485631E889E405dE

ShoeReactive (lasna): 0x5aB76A1dE8683d7934bFb901e1Ade7FA6E837d06



<h2>4. 完整交易哈希记录</h2>

步骤 1：用户提交跑步记录（Origin 链交易）

交易哈希： 0x5eb33e2c71ff3a64739d0693097166a667e05695b88bdd567a0bd7c17c8921e2

区块浏览器： https://etherscan.io/

说明： 用户提交了一个 50 公里的跑步记录，触发了 RunRecorded 事件。

步骤 2：Reactive 合约自动触发（Reactive 交易）

交易哈希： 0xcccd07b7ea4035afeb918708ee52d35653ea036bf2692164826ee6ff6477ef62

区块浏览器： https://lasna.reactscan.net/

说明：Reactive Network 监听到事件，调用 react函数

步骤 3：NFT 升级完成（目标链交易）

交易哈希： 0x962bbb27e38a440473dd12f04c52693c01ff09009d56a2be966113889219c7b3

区块浏览器： https://lasna.reactscan.net/

说明： upgradeShoe 函数被调用，NFT 从等级 1 升级到等级 2。



<h2>5. 部署后工作流程</h2>

用户连接钱包： 前端点击“连接钱包”，弹出 MetaMask，切换到 Sepolia 网络。

提交跑步记录： 用户输入距离（例如 50 公里），点击提交，在 MetaMask 中确认交易。

Origin 链交易确认： ShoeRunOrigin.recordRun 被调用，RunRecorded 事件被触发。

Reactive 自动响应： Reactive Network 捕获该事件，并自动调用 Lasna 链上的 ShoeReactive.react。

升级判断： ShoeReactive 通过跨链查询获取用户的累计距离，判断是否达到升级阈值。

触发升级： 如果需要升级，则调用 ShoeNFT.upgradeShoe。

NFT 铸造/转移： 新等级的 NFT 被铸造并转移给用户，旧 NFT 被销毁。

实时推送： 后端监听链上事件，通过 WebSocket 将更新推送到前端。

界面更新： 前端实时更新球鞋图片、等级和进度条。



<h2>6. 环境配置</h2>

环境变量说明

.env.example

后端 (backend/.env.example)

text

SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

LASNA\_RPC\_URL=https://rpc.lasna.io

PRIVATE\_KEY=your\_private\_key\_here

SHOE\_RUN\_ORIGIN\_ADDRESS=0x...

SHOE\_NFT\_ADDRESS=0x...

SHOE\_REACTIVE\_ADDRESS=0x...

PORT=3001

REACTIVE\_NETWORK\_SERVICE=0x0000000000000000000000000000000000fffFfF

前端 (frontend/.env.example)

text

REACT\_APP\_SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

REACT\_APP\_SHOE\_RUN\_ORIGIN\_ADDRESS=0x...

REACT\_APP\_SHOE\_NFT\_ADDRESS=0x...

REACT\_APP\_WEBSOCKET\_URL=ws://localhost:3001



<h2>7. 本地运行说明</h2>

环境要求

Node.js 18 或更高版本

npm 或 pnpm

MetaMask 浏览器插件

Remix IDE

第一步：克隆项目

bash

git clone <你的仓库地址>

cd keep-running

第二步：部署智能合约（使用 Remix）

2.1 部署 ShoeRunOrigin（Sepolia 网络）

打开 Remix IDE

创建 ShoeRunOrigin.sol 文件，粘贴合约代码。

编译合约。

将网络切换到 Sepolia。

点击 Deploy。

记录合约地址。

2.2 部署 ShoeNFT（Lasna 网络）

创建 ShoeNFT.sol 文件，粘贴合约代码。

编译合约。

将网络切换到 Lasna。

部署时，参数 initialOwner 填写你的钱包地址。

记录合约地址。

2.3 部署 ShoeReactive（Lasna 网络）

创建 ShoeReactive.sol 文件，粘贴合约代码。

编译合约。

将网络切换到 Lasna。

使用以下参数进行部署：

\_originChainId: 11155111

\_originContract: 你的 ShoeRunOrigin 地址

\_eventTopic0: 0xc8feafe000000000000000000000000000000000000000000000000000000000

\_shoeNFTAddress: 你的 ShoeNFT 地址

\_shoeRunOriginAddress: 你的 ShoeRunOrigin 地址

在 VALUE 字段中填入 0.1 ether。

点击 Deploy。

记录合约地址。

2.4 配置合约连接（Lasna 网络）

调用 ShoeNFT.setReactiveContract，参数填入 ShoeReactive 地址。

调用 ShoeReactive.setShoeNFT，参数填入 ShoeNFT 地址。

调用 ShoeReactive.setShoeRunOrigin，参数填入 ShoeRunOrigin 地址。

调用 ShoeNFT.grantBaseShoe，参数填入你的钱包地址。

第三步：配置环境变量

3.1 后端配置

bash

cd backend

cp .env.example .env

编辑 .env 文件，填入以下内容：

text

SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

LASNA\_RPC\_URL=https://rpc.lasna.io

PRIVATE\_KEY=你的钱包私钥

SHOE\_RUN\_ORIGIN\_ADDRESS=你的Origin合约地址

SHOE\_NFT\_ADDRESS=你的NFT合约地址

SHOE\_REACTIVE\_ADDRESS=你的Reactive合约地址

PORT=3001

3.2 前端配置

bash

cd ../frontend

cp .env.example .env

编辑 .env 文件，填入以下内容：

text

REACT\_APP\_SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

REACT\_APP\_SHOE\_RUN\_ORIGIN\_ADDRESS=你的Origin合约地址

REACT\_APP\_SHOE\_NFT\_ADDRESS=你的NFT合约地址

REACT\_APP\_WEBSOCKET\_URL=ws://localhost:3001

第四步：安装依赖

4.1 后端依赖

bash

cd backend

npm install

4.2 前端依赖

bash

cd ../frontend

npm install

第五步：启动服务

5.1 启动后端

bash

cd backend

npm start

看到类似以下输出表示成功：

text

WebSocket server running on port 3001

Listening to RunRecorded events on Sepolia...

Listening to ShoeUpgraded events on Lasna...

保持此终端运行，不要关闭。

5.2 启动前端

打开一个新的终端，执行：

bash

cd frontend

npm start

浏览器会自动打开 http://localhost:3000。

第六步：使用应用

在浏览器中点击“连接钱包”。

确保 MetaMask 网络切换到 Sepolia。

输入跑步距离（例如 50 公里）。

点击提交。

等待 MetaMask 确认交易。

等待 15-20 秒，刷新页面，观察球鞋等级的变化和进度条的更新。



<h2>8. 演示视频</h2>

\[点击观看演示视频]
https://youtu.be/L-q4_tlwcd0

视频内容包括：

项目背景与 Reactive Network 解决的问题。

技术架构说明。

完整流程演示（从提交跑步记录到 NFT 升级）。

交易哈希验证。



<h2>9. 球鞋等级系统</h2>

等级	名称	累计距离要求	视觉风格

1	基础跑鞋	0 公里	外观朴素低调

2	青铜战靴	50 公里	古铜色金属质感

3	白银战靴	150 公里	银色流光效果

4	黄金战靴	300 公里	金色光芒闪耀

5	彩虹神靴	500 公里	七彩炫光粒子特效



<h2>10. 项目结构</h2>

text

keep-running/

├── README.md

├── contracts/

│   ├── ShoeRunOrigin.sol

│   ├── ShoeNFT.sol

│   └── ShoeReactive.sol

├── backend/

│   ├── index.js

│   ├── eventListeners.js

│   └── websocketServer.js

├── frontend/

│   ├── src/

│   │   ├── App.js

│   │   ├── components/

│   │   │   ├── WalletConnect.js

│   │   │   ├── RunForm.js

│   │   │   ├── ShoeDisplay.js

│   │   │   ├── ProgressBar.js

│   │   │   └── Timeline.js

│   │   └── utils/

│   │       ├── contractConfig.js

│   │       └── websocketClient.js

│   └── package.json

├── scripts/

│   └── deploy.js

├── test/

└── hardhat.config.js



<h2>11. 技术架构</h2>

text

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐

│   前端      │────▶│  ShoeRunOrigin  │────▶│   Sepolia   │

│   (React)   │     │   (Sepolia)     │     │   事件      │

└─────────────┘     └─────────────────┘     └──────┬──────┘

&#x20;                                                  │

&#x20;                                                  ▼

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐

│   前端      │◀────│   WebSocket     │◀────│   后端      │

│   (React)   │     │   服务器        │     │  (Node.js)  │

└─────────────┘     └─────────────────┘     └─────────────┘

&#x20;                                                  ▲

&#x20;                                                  │

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐

│  ShoeNFT    │◀────│  ShoeReactive   │◀────│  Reactive   │

│  (Lasna)    │     │   (Lasna)       │     │  Network    │

└─────────────┘     └─────────────────┘     └─────────────┘



<h2>12. 团队信息</h2>

项目名称： Keep Running

黑客松： Reactive Network 官方黑客松

成员： Eddie



<h2>13. 未来扩展</h2>

深化 NFT 价值

动态收益： NFT 等级决定代币奖励权重，支持质押跑步获得额外加成。

组合合成： 多个 NFT 合成稀有款，通过运动挑战解锁限定款。

租赁机制： 持有者出租 NFT，链上自动分润，分离“跑者”与“藏家”角色。

连接 RWA（真实世界资产）

运动数据资产化： 链上里程作为“运动信用”，用于兑换实体品牌折扣、健康保险优惠。

绑定实体权益： 高等级 NFT 对应实体球鞋兑换权、健身房会员等线下服务。

社区共建场馆： DAO 基于生态收入投资实体运动空间，用户按贡献持有 RWA 份额并享受收益分成。

开放生态

支持 ERC-6551 等标准，实现运动凭证在跨应用间的互通性。

引入跨链机制，提升 RWA 资产的流动性。

