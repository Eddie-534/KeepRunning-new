const { expect } = require("chai");
const hre = require("hardhat");

describe("ShoeNFT Simple", function () {
  let ShoeNFT;
  let shoeNFT;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await hre.ethers.getSigners();

    ShoeNFT = await hre.ethers.getContractFactory("ShoeNFT");
    shoeNFT = await ShoeNFT.deploy(owner.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shoeNFT.owner()).to.equal(owner.address);
    });

    it("Should initialize with level configurations", async function () {
      expect(await shoeNFT.getRequiredDistance(1)).to.equal(0);
      expect(await shoeNFT.getRequiredDistance(2)).to.equal(500); // 50km
      expect(await shoeNFT.getRequiredDistance(3)).to.equal(1500); // 150km
    });
  });

  describe("Base Shoe Minting", function () {
    it("Should grant a base shoe to a new user", async function () {
      const tx = await shoeNFT.grantBaseShoe(user1.address);
      await tx.wait();

      const info = await shoeNFT.getUserShoeInfo(user1.address);
      expect(info[0]).to.equal(1); // tokenId
      expect(info[1]).to.equal(1); // level

      expect(await shoeNFT.balanceOf(user1.address)).to.equal(1);
      expect(await shoeNFT.getUserShoeLevel(user1.address)).to.equal(1);
    });

    it("Should prevent granting base shoe to user who already has one", async function () {
      await shoeNFT.grantBaseShoe(user1.address);

      await expect(shoeNFT.grantBaseShoe(user1.address))
        .to.be.revertedWith("UserAlreadyHasShoe");
    });
  });
});