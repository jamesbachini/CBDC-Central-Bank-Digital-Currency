const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("CBDC", function () {
  let cbdc, owner, user1;

  describe("Deployment", function () {
    it("Should deploy", async function () {
      [owner, user1] = await ethers.getSigners();
      const CBDC = await ethers.getContractFactory("CBDC");
      cbdc = await CBDC.deploy();
      expect(cbdc.address).to.not.equal(null);
    });
  });

  describe("ERC20 Functions", function () {
    it("Should transfer funds to user1", async function () {
      const initialSupply = await cbdc.balanceOf(owner.address);
      const amount = initialSupply.div(10)
      await cbdc.transfer(user1.address, amount);
      const balance = await cbdc.balanceOf(user1.address);
      expect(balance).to.equal(amount);
    });
  });

  describe("Voting", function () {
    it("Should call an election", async function () {
      await cbdc.callElection();
      const electionStartTS = await cbdc.electionStartTS();
      expect(electionStartTS).to.gt(0);
    });
    it("User1 should be able to vote", async function () {
      const balance1 = await cbdc.balanceOf(user1.address);
      await cbdc.connect(user1).vestAndVote(1000, owner.address);
      const balance2 = await cbdc.balanceOf(user1.address);
      expect(balance2).to.lt(balance1);
    });
    it("Votes should be counted", async function () {
      const votes = await cbdc.votes(owner.address);
      expect(votes).to.eq(1000);
    });
    it("Owner should be able to vote", async function () {
      const balance1 = await cbdc.balanceOf(owner.address);
      await cbdc.connect(owner).vestAndVote(2000, user1.address);
      const balance2 = await cbdc.balanceOf(owner.address);
      expect(balance2).to.lt(balance1);
    });
    it("Should close the Election", async function () {
      await network.provider.send("evm_increaseTime", [2.629e6])
      await network.provider.send("evm_mine") 
      await cbdc.closeElection();
      const controllingParty = await cbdc.controllingParty();
      expect(controllingParty).to.eq(user1.address);
    });
    it("Should be able to unvest tokens", async function () {
      const balance1 = await cbdc.balanceOf(user1.address);
      await cbdc.connect(user1).unvest();
      const balance2 = await cbdc.balanceOf(user1.address);
      expect(balance2).to.gt(balance1);
    });
  });

});
