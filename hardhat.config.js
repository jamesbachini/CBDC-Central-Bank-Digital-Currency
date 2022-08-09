require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.15" },
      { version: "0.7.6" },
      { version: "0.6.6" }
    ]
  },
  networks: {
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      //accounts: [process.env.PRIVATE_KEY,process.env.USER1_PRIVATE_KEY,],
      accounts: [process.env.PRIVATE_KEY,process.env.USER1_PRIVATE_KEY],
    },
    kovan: {
      url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY,process.env.USER1_PRIVATE_KEY,],
    },
    local: {
      url: `http://127.0.0.1:8545`,
      accounts: [process.env.PRIVATE_KEY,process.env.USER1_PRIVATE_KEY,],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 100000000
  },
};
