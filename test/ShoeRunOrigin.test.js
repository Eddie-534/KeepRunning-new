const { expect } = require("chai");
const hre = require("hardhat");

describe("ShoeRunOrigin", function () {
  let ShoeRunOrigin;
  let shoeRunOrigin;
  let owner;
  let runner1;
  let runner2;

  beforeEach(async function () {
    [owner, runner1, runner2] = await hre.ethers.getSigners();

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
        .withArgs(runner1.address, distance, duration, await shoeRunOrigin.getTotalRecords() + 1);

      const totalRecords = await shoeRunOrigin.getTotalRecords();
      expect(totalRecords).to.equal(1);

      const runs = await shoeRunOrigin.getUserRuns(runner1.address, 0, 10);
      expect(runs.length).to.equal(1);
      expect(runs[0].distance).to.equal(distance);
      expect(runs[0].duration).to.equal(duration);
    });

    it("Should record multiple runs", async function () {
      // Record first run
      await shoeRunOrigin.connect(runner1).recordRun(5000, 1800);

      // Wait to avoid frequency limit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Record second run
      await shoeRunOrigin.connect(runner1).recordRun(8000, 2400);

      const totalRecords = await shoeRunOrigin.getTotalRecords();
      expect(totalRecords).to.equal(2);

      const runs = await shoeRunOrigin.getUserRuns(runner1.address, 0, 10);
      expect(runs.length).to.equal(2);
    });

    it("Should calculate total distance correctly", async function () {
      // Record runs
      await shoeRunOrigin.connect(runner1).recordRun(5000, 1800); // 5km
      await shoeRunOrigin.connect(runner1).recordRun(8000, 2400); // 8km
      await shoeRunOrigin.connect(runner1).recordRun(3000, 1200); // 3km

      const totalDistance = await shoeRunOrigin.getUserTotalDistance(runner1.address);
      expect(totalDistance).to.equal(16000); // 16km in meters
    });

    it("Should get statistics correctly", async function () {
      // Record runs from different users
      await shoeRunOrigin.connect(runner1).recordRun(10000, 3600); // 10km
      await shoeRunOrigin.connect(runner2).recordRun(5000, 1800); // 5km
      await shoeRunOrigin.connect(runner1).recordRun(8000, 2400); // 8km

      const stats = await shoeRunOrigin.getStatistics();
      expect(stats.totalRuns).to.equal(3);
      expect(stats.totalDistance).to.equal(23000); // 23km
      expect(stats.averageDistance).to.equal(7667); // ~7.67km
      expect(stats.fastestRun).to.equal(1800); // 5km run was fastest
    });

    it("Should prevent zero distance runs", async function () {
      await expect(
        shoeRunOrigin.recordRun(0, 3600)
      ).to.be.revertedWith("Distance must be greater than 0");
    });

    it("Should prevent zero duration runs", async function () {
      await expect(
        shoeRunOrigin.recordRun(10000, 0)
      ).to.be.revertedWith("Duration must be greater than 0");
    });
  });

  describe("User Management", function () {
    it("Should track runs per user correctly", async function () {
      // User 1 runs
      await shoeRunOrigin.connect(runner1).recordRun(10000, 3600);
      await shoeRunOrigin.connect(runner1).recordRun(5000, 1800);

      // User 2 runs
      await shoeRunOrigin.connect(runner2).recordRun(8000, 2400);

      // Check user 1 runs
      const user1Runs = await shoeRunOrigin.getUserRuns(runner1.address, 0, 10);
      expect(user1Runs.length).to.equal(2);

      // Check user 2 runs
      const user2Runs = await shoeRunOrigin.getUserRuns(runner2.address, 0, 10);
      expect(user2Runs.length).to.equal(1);
    });

    it("Should return empty array for user with no runs", async function () {
      const runs = await shoeRunOrigin.getUserRuns(runner2.address, 0, 10);
      expect(runs.length).to.equal(0);
    });
  });

  describe("Pagination", function () {
    it("Should paginate runs correctly", async function () {
      // Record 15 runs
      for (let i = 0; i < 15; i++) {
        await shoeRunOrigin.connect(runner1).recordRun(1000 + i * 100, 600 + i * 60);
      }

      // Get first 5 runs
      const firstPage = await shoeRunOrigin.getUserRuns(runner1.address, 0, 5);
      expect(firstPage.length).to.equal(5);

      // Get next 5 runs
      const secondPage = await shoeRunOrigin.getUserRuns(runner1.address, 5, 5);
      expect(secondPage.length).to.equal(5);

      // Get remaining runs
      const thirdPage = await shoeRunOrigin.getUserRuns(runner1.address, 10, 10);
      expect(thirdPage.length).to.equal(5);

      // Verify runs are in order
      expect(firstPage[0].distance).to.equal(1000);
      expect(secondPage[0].distance).to.equal(1500);
      expect(thirdPage[0].distance).to.equal(2500);
    });
  });
});