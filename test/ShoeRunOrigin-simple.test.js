const { expect, anyValue } = require("chai");
const hre = require("hardhat");

describe("ShoeRunOrigin Simple", function () {
  let ShoeRunOrigin;
  let shoeRunOrigin;
  let owner;
  let runner1;

  beforeEach(async function () {
    [owner, runner1] = await hre.ethers.getSigners();

    ShoeRunOrigin = await hre.ethers.getContractFactory("ShoeRunOrigin");
    shoeRunOrigin = await ShoeRunOrigin.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await shoeRunOrigin.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero records", async function () {
      expect(await shoeRunOrigin.getTotalRecords()).to.equal(0);
    });
  });

  describe("Running Recording", function () {
    it("Should record a run successfully", async function () {
      const distance = 10000; // 10km in meters
      const duration = 3600; // 1 hour in seconds

      await expect(
        shoeRunOrigin.recordRun(distance, duration)
      ).to.emit(shoeRunOrigin, "RunRecorded")
        .withArgs(runner1.address, distance, duration, anyValue, 1);

      const totalRecords = await shoeRunOrigin.getTotalRecords();
      expect(totalRecords).to.equal(1);

      const stats = await shoeRunOrigin.getStatistics();
      expect(stats.totalRuns).to.equal(1);
      expect(stats.totalDistance).to.equal(distance);
      expect(stats.averageDistance).to.equal(distance);
    });
  });
});