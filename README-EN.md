<h1>﻿🏃 Keep Running - On-Chain Running Upgrade NFT</h1>



<h2>1. Project Introduction</h2>

Keep Running is a decentralized application based on the Reactive Network that allows users to upgrade their shoe NFTs through running. Each running record is permanently stored on-chain. When the accumulated mileage reaches a threshold, the shoe NFT automatically upgrades without any manual intervention.

Core Functions:

•	Users submit running records (distance, duration)

•	Accumulated distance is automatically calculated

•	Automatic NFT upgrade upon reaching level thresholds

•	Visual display of shoe levels



<h2>2. Problem Solved by Reactive Network</h2>

Pain Points of Traditional Solutions

Traditional solutions require a centralized backend to poll on-chain data, determine upgrade conditions, and trigger transactions, presenting the following issues:

•	Centralization Risk: Server downtime or malicious actions can affect the fairness of upgrades.

•	Latency Issues: Polling intervals cause delays in upgrades.

•	Trust Cost: Users need to trust that the project team will not tamper with the logic.

Reactive Network Solution

•	Fully Decentralized: After running records are uploaded, the Reactive contract automatically listens and triggers upgrades.

•	Transparent \& Verifiable: All upgrade logic is executed on-chain and can be verified by anyone.

•	Real-time Response: Immediate triggering upon event generation, achieving second-level response.

Can it be implemented without Reactive Network?

Yes, but it would require a centralized backend or oracles, introducing trust assumptions and single points of failure. Reactive Network achieves a truly decentralized automation loop.



<h2>3. Deployed Contract Addresses</h2>

•	ShoeRunOrigin (sepolia): 0x6Ebb6a7aF80cd03efB27D626F73C6502795F8624

•	ShoeNFT (lasna): 0xDBCda2fa840687585D8d987E485631E889E405dE

•	ShoeReactive (lasna): 0x5aB76A1dE8683d7934bFb901e1Ade7FA6E837d06



<h2>4. Complete Transaction Hash Records</h2>

Step 1: User Submits Running Record (Origin Transaction)

•	Transaction Hash: 0x5eb33e2c71ff3a64739d0693097166a667e05695b88bdd567a0bd7c17c8921e2

•	Block Explorer: https://etherscan.io/

•	Description: User submits a 50 km running record, triggering the RunRecorded event.

Step 2: Reactive Contract Automatically Triggers (Reactive Transaction)

* Transaction hash: 0xcccd07b7ea4035afeb918708ee52d35653ea036bf2692164826ee6ff6477ef62  
* Block explorer: https://lasna.reactscan.net/  
* Description: Reactive Network listens for events and calls the react function.

Step 3: NFT Upgrade Completed (Destination Transaction)

•	Transaction Hash: 0x962bbb27e38a440473dd12f04c52693c01ff09009d56a2be966113889219c7b3

•	Block Explorer: https://lasna.reactscan.net/

•	Description: upgradeShoe was called, upgrading the NFT from Level 1 to Level 2.



<h2>5. Post-Deployment Workflow</h2>

1\.	User Connects Wallet: Frontend clicks "Connect Wallet," MetaMask pops up, switch to Sepolia.

2\.	Submit Running Record: User inputs distance (e.g., 50 km), clicks submit, confirms transaction in MetaMask.

3\.	Origin Transaction Confirmed: ShoeRunOrigin.recordRun is called, RunRecorded event is triggered.

4\.	Reactive Auto-Response: Reactive Network captures the event and automatically calls ShoeReactive.react on Lasna.

5\.	Upgrade Check: ShoeReactive cross-chain queries the user's accumulated distance to determine if the upgrade threshold is met.

6\.	Trigger Upgrade: If upgrade is needed, calls ShoeNFT.upgradeShoe.

7\.	NFT Mint/Transfer: The new level NFT is minted and transferred to the user, the old NFT is burned.

8\.	Real-time Push: Backend listens to on-chain events and pushes updates via WebSocket to the frontend.

9\.	UI Update: Frontend updates shoe image, level, and progress bar in real-time.



<h2>6. Environment Configuration</h2>

Environment Variable Description

.env.example

Backend (backend/.env.example)

text

SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

LASNA\_RPC\_URL=https://rpc.lasna.io

PRIVATE\_KEY=your\_private\_key\_here

SHOE\_RUN\_ORIGIN\_ADDRESS=0x...

SHOE\_NFT\_ADDRESS=0x...

SHOE\_REACTIVE\_ADDRESS=0x...

PORT=3001

REACTIVE\_NETWORK\_SERVICE=0x0000000000000000000000000000000000fffFfF

Frontend (frontend/.env.example)

text

REACT\_APP\_SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

REACT\_APP\_SHOE\_RUN\_ORIGIN\_ADDRESS=0x...

REACT\_APP\_SHOE\_NFT\_ADDRESS=0x...

REACT\_APP\_WEBSOCKET\_URL=ws://localhost:3001



<h2>7. Local Run Instructions</h2>

Requirements

•	Node.js 18 or higher

•	npm or pnpm

•	MetaMask browser extension

•	Remix IDE

Step 1: Clone the Project

bash

git clone <your\_repository\_url>

cd keep-running

Step 2: Deploy Smart Contracts (using Remix)

2.1 Deploy ShoeRunOrigin (Sepolia Network)

•	Open Remix IDE

•	Create ShoeRunOrigin.sol file, paste the contract code.

•	Compile the contract.

•	Switch network to Sepolia.

•	Click Deploy.

•	Record the contract address.

2.2 Deploy ShoeNFT (Lasna Network)

•	Create ShoeNFT.sol file, paste the contract code.

•	Compile the contract.

•	Switch network to Lasna.

•	Deploy with parameter initialOwner set to your wallet address.

•	Record the contract address.

2.3 Deploy ShoeReactive (Lasna Network)

•	Create ShoeReactive.sol file, paste the contract code.

•	Compile the contract.

•	Switch network to Lasna.

•	Deploy with the following parameters:

o	\_originChainId: 11155111

o	\_originContract: Your ShoeRunOrigin address

o	\_eventTopic0: 0xc8feafe000000000000000000000000000000000000000000000000000000000

o	\_shoeNFTAddress: Your ShoeNFT address

o	\_shoeRunOriginAddress: Your ShoeRunOrigin address

•	Fill the VALUE field with 0.1 ether.

•	Click Deploy.

•	Record the contract address.

2.4 Configure Contract Connections (Lasna Network)

•	Call ShoeNFT.setReactiveContract with the ShoeReactive address as parameter.

•	Call ShoeReactive.setShoeNFT with the ShoeNFT address as parameter.

•	Call ShoeReactive.setShoeRunOrigin with the ShoeRunOrigin address as parameter.

•	Call ShoeNFT.grantBaseShoe with your wallet address as parameter.

Step 3: Configure Environment Variables

3.1 Backend Configuration

bash

cd backend

cp .env.example .env

Edit the .env file and fill in:

text

SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

LASNA\_RPC\_URL=https://rpc.lasna.io

PRIVATE\_KEY=your\_wallet\_private\_key

SHOE\_RUN\_ORIGIN\_ADDRESS=your\_Origin\_contract\_address

SHOE\_NFT\_ADDRESS=your\_NFT\_contract\_address

SHOE\_REACTIVE\_ADDRESS=your\_Reactive\_contract\_address

PORT=3001

3.2 Frontend Configuration

bash

cd ../frontend

cp .env.example .env

Edit the .env file and fill in:

text

REACT\_APP\_SEPOLIA\_RPC\_URL=https://rpc.sepolia.org

REACT\_APP\_SHOE\_RUN\_ORIGIN\_ADDRESS=your\_Origin\_contract\_address

REACT\_APP\_SHOE\_NFT\_ADDRESS=your\_NFT\_contract\_address

REACT\_APP\_WEBSOCKET\_URL=ws://localhost:3001

Step 4: Install Dependencies

4.1 Backend Dependencies

bash

cd backend

npm install

4.2 Frontend Dependencies

bash

cd ../frontend

npm install

Step 5: Start Services

5.1 Start Backend

bash

cd backend

npm start

A successful start shows output like:

text

WebSocket server running on port 3001

Listening to RunRecorded events on Sepolia...

Listening to ShoeUpgraded events on Lasna...

Keep this terminal running.

5.2 Start Frontend

Open a new terminal:

bash

cd frontend

npm start

The browser will automatically open http://localhost:3000.

Step 6: Use the Application

•	Click "Connect Wallet" in the browser.

•	Ensure MetaMask network is switched to Sepolia.

•	Enter running distance (e.g., 50 km).

•	Click submit.

•	Wait for MetaMask to confirm the transaction.

•	Wait 15-20 seconds, refresh, and observe the shoe level change and progress bar update.



<h2>8. Demo Video</h2>

\[Watch the video demonstration file]

Video content includes:

•	Project background and the problem solved by Reactive Network.

•	Technical architecture explanation.

•	Complete process demonstration (from submitting running record to NFT upgrade).

•	Transaction hash verification.



<h2>9. Shoe Level System</h2>

Level	Name	Cumulative Distance Required	Visual Style

1	Basic Running Shoes	0 km	Simple, understated appearance

2	Bronze Boots	50 km	Bronze metallic texture

3	Silver Boots	150 km	Silver streaming light effect

4	Golden Boots	300 km	Gleaming golden radiance

5	Rainbow Divine Boots	500 km	Colorful rainbow glow particle effect



<h2>10. Project Structure</h2>

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



<h2>11. Technical Architecture</h2>

text

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐

│   Frontend  │────▶│  ShoeRunOrigin  │────▶│   Sepolia   │

│   (React)   │     │   (Sepolia)     │     │   Event     │

└─────────────┘     └─────────────────┘     └──────┬──────┘

&#x20;                                                  │

&#x20;                                                  ▼

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐

│   Frontend  │◀────│   WebSocket     │◀────│   Backend   │

│   (React)   │     │   Server        │     │   (Node.js) │

└─────────────┘     └─────────────────┘     └─────────────┘

&#x20;                                                  ▲

&#x20;                                                  │

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐

│  ShoeNFT    │◀────│  ShoeReactive   │◀────│  Reactive   │

│  (Lasna)    │     │   (Lasna)       │     │  Network    │

└─────────────┘     └─────────────────┘     └─────────────┘



<h2>12. Team Information</h2>

•	Project Name: Keep Running

•	Hackathon: Reactive Network Official Hackathon

•	Member: Eddie



<h2>13. Future Expansion</h2>

Deepening NFT Value

•	Dynamic Yield: NFT level determines token reward weight, supports additional bonuses for staking while running.

•	Combination Synthesis: Combine multiple NFTs to create rare versions; unlock limited editions through sports challenges.

•	Rental Mechanism: Owners rent out NFTs with on-chain automatic profit sharing, separating "runner" and "collector" roles.

RWA Connection

•	Monetizing Sports Data: On-chain mileage serves as "sports credit," redeemable for discounts on physical brands and health insurance benefits.

•	Physical Rights Binding: High-level NFTs correspond to redemption rights for physical running shoes, gym memberships, and other offline services.

•	Community-Built Venues: DAO invests in physical sports spaces based on ecosystem revenue; users hold RWA shares based on contributions and share profits.

Open Ecosystem

•	Support standards like ERC-6551 to enable interoperability of sports credentials across applications.

•	Introduce cross-chain mechanisms to enhance RWA asset liquidity.

