const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("CBDC", () => {
  let cbdc, owner, user1;

  describe("Deployment", () => {
    it("Should deploy", async () => {
      [owner, user1] = await ethers.getSigners();
      const CBDC = await ethers.getContractFactory("CBDC");
      cbdc = await CBDC.deploy();
      expect(cbdc.address).to.not.equal(null);
    });
  });

  describe("ERC20 Functions", () => {
    it("Should transfer funds to user1", async () => {
      const initialSupply = await cbdc.balanceOf(owner.address);
      const amount = initialSupply.div(10)
      await cbdc.transfer(user1.address, amount);
      const balance = await cbdc.balanceOf(user1.address);
      expect(balance).to.equal(amount);
    });
  });

  describe("Voting", () => {
    it("Should call an election", async () => {
      await cbdc.callElection();
      const electionStartTS = await cbdc.electionStartTS();
      expect(electionStartTS).to.gt(0);
    });
    it("User1 should be able to vote", async () => {
      const balance1 = await cbdc.balanceOf(user1.address);
      await cbdc.connect(user1).vestAndVote(1000, owner.address);
      const balance2 = await cbdc.balanceOf(user1.address);
      expect(balance2).to.lt(balance1);
    });
    it("Votes should be counted", async () => {
      const votes = await cbdc.votes(owner.address);
      expect(votes).to.eq(1000);
    });
    it("Owner should be able to vote", async () => {
      const balance1 = await cbdc.balanceOf(owner.address);
      await cbdc.connect(owner).vestAndVote(2000, user1.address);
      const balance2 = await cbdc.balanceOf(owner.address);
      expect(balance2).to.lt(balance1);
    });
    it("Should close the Election", async () => {
      await network.provider.send("evm_increaseTime", [2.629e6]);
      await network.provider.send("evm_mine");
      await cbdc.closeElection();
      const controllingParty = await cbdc.controllingParty();
      expect(controllingParty).to.eq(user1.address);
    });
    it("Should be able to unvest tokens", async () => {
      const balance1 = await cbdc.balanceOf(user1.address);
      await cbdc.connect(user1).unvest();
      const balance2 = await cbdc.balanceOf(user1.address);
      expect(balance2).to.gt(balance1);
    });
  });

  describe("Blacklisting", () => {
    const badActor = '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b';
    it("Should allow a transaction", async () => {
      await cbdc.connect(owner).transfer(badActor, 1000);
      const balance = await cbdc.balanceOf(badActor);
      expect(balance).to.eq(1000);
    });
    it("Should block a transaction", async () => {
      const balance1 = await cbdc.balanceOf(badActor);
      await cbdc.connect(user1).updateBlacklist(badActor, true);
      await expect(cbdc.connect(owner).transfer(badActor, 9999))
        .to.be.revertedWith('Recipient address is blacklisted');
      const balance2 = await cbdc.balanceOf(badActor);
      expect(balance2).to.eq(balance1);
    });
  });

  describe("Inflation & Staking", () => {
    it("Should increase money supply", async () => {
      const balance1 = await cbdc.balanceOf(user1.address);
      await cbdc.connect(user1).increaseMoneySupply();
      const balance2 = await cbdc.balanceOf(user1.address);
      expect(balance2).to.gt(balance1);
    });
    it("Should stake treasury bonds", async () => {
      const balance1 = await cbdc.balanceOf(owner.address);
      await cbdc.connect(owner).stakeTreasuryBonds(balance1);
      const balance2 = await cbdc.balanceOf(owner.address);
      expect(balance2).to.eq(0);
      await network.provider.send("evm_increaseTime", [2.629e6]);
      await network.provider.send("evm_mine");
      await cbdc.connect(owner).claimTreasuryBonds();
      const balance3 = await cbdc.balanceOf(owner.address);
      expect(balance3).to.gt(0);
      await cbdc.connect(owner).unstakeTreasuryBonds(balance1);
      const balance4 = await cbdc.balanceOf(owner.address);
      expect(balance4).to.gt(balance1); 
    });

  });

});
