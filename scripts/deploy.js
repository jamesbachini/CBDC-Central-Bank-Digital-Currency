const hre = require("hardhat");

async function main() {
  const CBDC = await ethers.getContractFactory("CBDC");
  cbdc = await CBDC.deploy();
  await cbdc.deployed();
  console.log("CBDC deployed to:", lock.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
