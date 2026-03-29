const { expect } = require("chai");
const hre = require("hardhat");

describe("ShoeNFT", function () {
  let ShoeNFT;
  let shoeNFT;
  let owner;
  let user1;
  let user2;
  let shoeReactive;

  beforeEach(async function () {
    [owner, user1, user2] = await hre.hre.ethers.getSigners();

    // Deploy ShoeNFT
    ShoeNFT = await hre.ethers.getContractFactory("ShoeNFT");
    shoeNFT = await ShoeNFT.deploy(owner.address);

    // Deploy a mock ShoeReactive contract for testing
    const ShoeReactiveMock = await hre.ethers.getContractFactory("contracts/ShoeReactive.sol:ShoeReactive");
    shoeReactive = await ShoeReactiveMock.deploy(
      11155111, // chainId
      owner.address, // originContract
      hre.ethers.id("RunRecorded(address,uint256,uint256,uint256,uint256)"), // eventTopic0
      shoeNFT.target, // shoeNFTAddress
      { value: hre.ethers.parseEther("0.1") }
    );
    ;

    // Set the reactive contract
    await shoeNFT.setReactiveContract(shoeReactive.target);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shoeNFT.owner()).to.equal(owner.address);
    });

    it("Should initialize with level configurations", async function () {
      expect(await shoeNFT.getRequiredDistance(1)).to.equal(0);
      expect(await shoeNFT.getRequiredDistance(2)).to.equal(500); // 50km
      expect(await shoeNFT.getRequiredDistance(3)).to.equal(1500); // 150km
      expect(await shoeNFT.getRequiredDistance(4)).to.equal(3000); // 300km
      expect(await shoeNFT.getRequiredDistance(5)).to.equal(5000); // 500km
    });
  });

  describe("Base Shoe Minting", function () {
    it("Should grant a base shoe to a new user", async function () {
      await expect(shoeNFT.grantBaseShoe(user1.address))
        .to.emit(shoeNFT, "ShoeMinted")
        .withArgs(user1.address, 1, 1);

      const info = await shoeNFT.getUserShoeInfo(user1.address);
      expect(info[0]).to.equal(1); // tokenId
      expect(info[1]).to.equal(1); // level
      expect(info[2]).to.not.equal(0); // mintedAt

      expect(await shoeNFT.balanceOf(user1.address)).to.equal(1);
      expect(await shoeNFT.getUserShoeLevel(user1.address)).to.equal(1);
    });

    it("Should prevent granting base shoe to user who already has one", async function () {
      await shoeNFT.grantBaseShoe(user1.address);

      await expect(shoeNFT.grantBaseShoe(user1.address))
        .to.be.revertedWith("UserAlreadyHasShoe");
    });

    it("Should only allow owner to grant base shoes", async function () {
      await expect(shoeNFT.connect(user1).grantBaseShoe(user1.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Shoe Upgrading", function () {
    beforeEach(async function () {
      // Grant base shoes to users
      await shoeNFT.grantBaseShoe(user1.address);
      await shoeNFT.grantBaseShoe(user2.address);
    });

    it("Should upgrade shoe when distance threshold is met", async function () {
      // User reaches 50km (500 in km×10)
      await expect(shoeReactive.connect(user1).manualUpgrade(user1.address, 500))
        .to.emit(shoeNFT, "ShoeUpgraded")
        .withArgs(user1.address, 2, 1, 2, 500);

      const info = await shoeNFT.getUserShoeInfo(user1.address);
      expect(info[1]).to.equal(2); // level

      expect(await shoeNFT.balanceOf(user1.address)).to.equal(1); // Old NFT burned
      expect(await shoeNFT.tokenURI(2)).to.not.be.undefined;
    });

    it("Should upgrade to higher levels", async function () {
      // Upgrade to level 2 (50km)
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 500);

      // Upgrade to level 3 (150km)
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 1500);

      // Upgrade to level 4 (300km)
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 3000);

      // Upgrade to level 5 (500km)
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 5000);

      const info = await shoeNFT.getUserShoeInfo(user1.address);
      expect(info[1]).to.equal(5); // level
    });

    it("Should prevent upgrading to max level", async function () {
      // Upgrade to max level
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 5000);

      // Try to upgrade beyond max level
      await expect(shoeReactive.connect(user1).manualUpgrade(user1.address, 6000))
        .to.be.revertedWith("AlreadyMaxLevel");
    });

    it("Should prevent upgrading with insufficient distance", async function () {
      // Try to upgrade without meeting distance requirement
      await expect(shoeReactive.connect(user1).manualUpgrade(user1.address, 400))
        .to.be.revertedWith("InsufficientDistance");
    });

    it("Should only allow reactive contract to upgrade", async function () {
      await expect(shoeNFT.connect(user1).upgradeShoe(user1.address, 500))
        .to.be.revertedWith("UnauthorizedReactiveContract");
    });

    it("Should replace old NFT with new one on upgrade", async function () {
      // Get initial token ID
      const initialInfo = await shoeNFT.getUserShoeInfo(user1.address);
      const initialTokenId = initialInfo[0];

      // Upgrade
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 500);

      const newInfo = await shoeNFT.getUserShoeInfo(user1.address);
      const newTokenId = newInfo[0];

      // Verify new token
      expect(newTokenId).to.not.equal(initialTokenId);
      expect(await shoeNFT.balanceOf(user1.address)).to.equal(1);
      expect(await shoeNFT.ownerOf(newTokenId)).to.equal(user1.address);

      // Verify old token is burned
      await expect(shoeNFT.ownerOf(initialTokenId)).to.be.reverted;
    });
  });

  describe("Level Information", function () {
    it("Should return correct level information", async function () {
      const level2Info = await shoeNFT.levelConfigs(2);
      expect(level2Info.name).to.equal("Bronze Warrior");
      expect(level2Info.description).to.include("50 km");
      expect(level2Info.requiredDistance).to.equal(500);
    });

    it("Should calculate target level correctly", async function () {
      // Test internal function indirectly through upgrade
      await shoeNFT.grantBaseShoe(user1.address);

      // Level 2
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 500);
      expect(await shoeNFT.getUserShoeLevel(user1.address)).to.equal(2);

      // Level 3
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 1500);
      expect(await shoeNFT.getUserShoeLevel(user1.address)).to.equal(3);
    });
  });

  describe("Token Level Mapping", function () {
    beforeEach(async function () {
      await shoeNFT.grantBaseShoe(user1.address);
    });

    it("Should store and retrieve token levels", async function () {
      // Check initial token level
      expect(await shoeNFT.getTokenLevel(1)).to.equal(1);

      // Upgrade and check new token
      await shoeReactive.connect(user1).manualUpgrade(user1.address, 500);
      expect(await shoeNFT.getTokenLevel(2)).to.equal(2);
    });

    it("Should prevent unauthorized access to token level", async function () {
      // Another user cannot check token level
      await expect(shoeNFT.connect(user2).getTokenLevel(1))
        .to.be.revertedWith("ERC721: caller is not token owner or approved");
    });
  });

  describe("Administrative Functions", function () {
    it("Should allow owner to set reactive contract", async function () {
      const newReactive = await hre.ethers.getContractFactory("contracts/ShoeReactive.sol:ShoeReactive");
      const newReactiveContract = await newReactive.deploy(
        11155111,
        owner.address,
        hre.ethers.id("RunRecorded(address,uint256,uint256,uint256,uint256)"),
        shoeNFT.target,
        { value: hre.ethers.parseEther("0.1") }
      );
      ;

      await expect(shoeNFT.setReactiveContract(newReactiveContract.target))
        .to.emit(shoeNFT, "ReactiveContractUpdated");

      expect(await shoeNFT.shoeReactiveContract()).to.equal(newReactiveContract.target);
    });

    it("Should prevent non-owner from setting reactive contract", async function () {
      await expect(shoeNFT.connect(user1).setReactiveContract(user1.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to set base URI", async function () {
      const newURI = "https://newapi.example.com/metadata/";
      await shoeNFT.setBaseURI(newURI);
      expect(await shoeNFT.tokenURI(1)).to.equal(newURI + "1");
    });
  });
});